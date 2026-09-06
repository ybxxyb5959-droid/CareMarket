begin;

-- Historical payment times were never stored. Do not invent/backfill them.
alter table public.orders add column paid_at timestamptz;

create function public.record_order_paid_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.paid_at := old.paid_at;
  if old.paid_at is null and old.status = 'pending'
    and new.status in ('paid', 'preparing') and new.payment_key is not null then
    new.paid_at := clock_timestamp();
  end if;
  return new;
end;
$$;
revoke all on function public.record_order_paid_at() from public, anon, authenticated;
create trigger orders_record_paid_at before update on public.orders
for each row execute function public.record_order_paid_at();

create index orders_sales_date_idx on public.orders ((coalesce(paid_at, created_at)))
where status in ('paid', 'preparing', 'shipped', 'delivered');

-- Aggregate on the server: no API row-limit truncation and no customer data exposure.
create function public.get_admin_sales_summary(p_start date, p_end date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator role required' using errcode = '42501';
  end if;
  if p_start is null or p_end is null or p_end < p_start or p_end - p_start > 3659 then
    raise exception 'Select a valid range of up to 3660 days' using errcode = '22023';
  end if;

  with sales as materialized (
    select o.order_id, o.total_price, o.paid_at,
      (coalesce(o.paid_at, o.created_at) at time zone 'Asia/Seoul')::date as day
    from public.orders o
    where o.status in ('paid', 'preparing', 'shipped', 'delivered')
      and coalesce(o.paid_at, o.created_at) >= ((p_start - (p_end - p_start + 1))::timestamp at time zone 'Asia/Seoul')
      and coalesce(o.paid_at, o.created_at) < ((p_end + 1)::timestamp at time zone 'Asia/Seoul')
  ), current_sales as materialized (
    select * from sales where day between p_start and p_end
  ), lines as materialized (
    select i.product_id, i.quantity, i.price_at_order, s.day
    from public.order_items i join sales s using (order_id)
  ), current_lines as materialized (
    select * from lines where day between p_start and p_end
  ), daily as (
    select d::date as day, coalesce(sum(s.total_price), 0) as value, count(s.order_id) as orders
    from generate_series(p_start::timestamp, p_end::timestamp, interval '1 day') d
    left join current_sales s on s.day = d::date
    group by d
  ), categories as (
    select coalesce(nullif(p.category, ''), '미분류') as label, sum(i.quantity) as value
    from current_lines i left join public.products p using (product_id)
    group by coalesce(nullif(p.category, ''), '미분류')
  ), best as (
    select i.product_id, coalesce(p.name, '삭제된 상품') as name,
      sum(i.quantity) as quantity, sum(i.quantity::bigint * i.price_at_order) as revenue
    from current_lines i left join public.products p using (product_id)
    group by i.product_id, p.name
    order by quantity desc, revenue desc, i.product_id
    limit 100
  )
  select jsonb_build_object(
    'total_payment', (select coalesce(sum(total_price), 0) from current_sales),
    'order_count', (select count(*) from current_sales),
    'quantity', (select coalesce(sum(quantity), 0) from current_lines),
    'average_payment', (select coalesce(round(avg(total_price)), 0) from current_sales),
    'legacy_order_count', (select count(*) from current_sales where paid_at is null),
    'previous', jsonb_build_object(
      'total_payment', (select coalesce(sum(total_price), 0) from sales where day < p_start),
      'order_count', (select count(*) from sales where day < p_start),
      'quantity', (select coalesce(sum(quantity), 0) from lines where day < p_start)
    ),
    'daily', (select jsonb_agg(jsonb_build_object('date', day, 'label', to_char(day, 'MM/DD'), 'value', value, 'orders', orders) order by day) from daily),
    'categories', coalesce((select jsonb_agg(to_jsonb(c) order by value desc, label) from categories c), '[]'::jsonb),
    'best', coalesce((select jsonb_agg(to_jsonb(b) order by quantity desc, revenue desc, product_id) from best b), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke all on function public.get_admin_sales_summary(date, date) from public, anon;
grant execute on function public.get_admin_sales_summary(date, date) to authenticated;

commit;
