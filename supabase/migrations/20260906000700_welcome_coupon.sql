begin;
do $$ begin
  if to_regprocedure('public.complete_paid_order_with_inventory(uuid,text)') is null then
    raise exception 'Apply 20260905000600_order_fulfillment_bulk before welcome coupon migration';
  end if;
end $$;
create table public.coupons (
  id text primary key check (id = 'welcome20'),
  name text not null,
  percent integer not null check (percent = 20)
);
insert into public.coupons values ('welcome20','신규회원 20%',20);
create table public.user_coupons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id),
  coupon_id text not null references public.coupons(id),
  issued_at timestamptz not null default now(),
  used_at timestamptz,
  used_order_id uuid unique references public.orders(order_id),
  unique(user_id,coupon_id),
  check ((used_at is null) = (used_order_id is null))
);
alter table public.coupons enable row level security;
alter table public.user_coupons enable row level security;
create policy coupons_read on public.coupons for select to anon, authenticated using(true);
create policy user_coupons_read_own on public.user_coupons for select to authenticated using(user_id = auth.uid());
revoke all on public.coupons, public.user_coupons from public, anon, authenticated;
grant select on public.coupons to anon, authenticated;
grant select on public.user_coupons to authenticated;
create function public.issue_welcome_coupon() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.user_coupons(user_id,coupon_id) values(new.user_id,'welcome20') on conflict do nothing;
  return new;
end;
$$;
revoke all on function public.issue_welcome_coupon() from public, anon, authenticated;
create trigger profile_welcome_coupon after insert on public.profiles
for each row execute function public.issue_welcome_coupon();

alter table public.orders
  add column user_coupon_id uuid references public.user_coupons(id),
  add column discount_amount integer not null default 0 check(discount_amount >= 0);

create function public.create_coupon_checkout_order(
  p_recipient_name text, p_recipient_phone text, p_postal_code text,
  p_address text, p_address_detail text, p_delivery_request text, p_user_coupon_id uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb; coupon public.user_coupons%rowtype; subtotal bigint; discount integer;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select * into coupon from public.user_coupons where id=p_user_coupon_id and user_id=auth.uid() for update;
  if not found or coupon.used_at is not null or coupon.coupon_id <> 'welcome20' then
    raise exception 'CHECKOUT_COUPON_UNAVAILABLE' using errcode='P0001';
  end if;
  result := public.create_checkout_order(p_recipient_name,p_recipient_phone,p_postal_code,p_address,p_address_detail,p_delivery_request);
  select sum(quantity::bigint * price_at_order) into subtotal from public.order_items where order_id=(result->>'order_id')::uuid;
  discount := (subtotal * 20 / 100)::integer;
  update public.orders set user_coupon_id=coupon.id, discount_amount=discount, total_price=total_price-discount
    where order_id=(result->>'order_id')::uuid;
  return result || jsonb_build_object('total_price',(result->>'total_price')::integer-discount,'discount_amount',discount);
end;
$$;
revoke all on function public.create_coupon_checkout_order(text,text,text,text,text,text,uuid) from public,anon;
grant execute on function public.create_coupon_checkout_order(text,text,text,text,text,text,uuid) to authenticated;

-- Inventory finalization follows below with the existing idempotency and stock
-- logic preserved; coupon consumption and order completion share a transaction.
create or replace function public.complete_paid_order_with_inventory(
  p_order_id uuid,
  p_payment_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_order public.orders%rowtype;
  v_subtotal bigint;
  v_delivery_fee bigint;
  v_coupon public.user_coupons%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;

  if p_payment_key is null or btrim(p_payment_key) = '' or length(p_payment_key) > 200 then
    raise exception 'Invalid payment key' using errcode = '22023';
  end if;

  select *
  into v_order
  from public.orders
  where order_id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  if v_order.status <> 'pending' then
    if v_order.status in ('paid', 'preparing', 'shipped', 'delivered')
      and v_order.payment_key = p_payment_key
    then
      return jsonb_build_object(
        'order_id', v_order.order_id,
        'status', v_order.status,
        'total_price', v_order.total_price,
        'already_paid', true
      );
    end if;

    raise exception 'Order is not payable' using errcode = '55000';
  end if;

  if v_order.user_coupon_id is not null then
    select * into v_coupon from public.user_coupons where id=v_order.user_coupon_id for update;
    if not found or v_coupon.user_id <> v_order.user_id or v_coupon.coupon_id <> 'welcome20' or v_coupon.used_at is not null then
      raise exception 'CHECKOUT_COUPON_UNAVAILABLE' using errcode='P0001';
    end if;
  elsif v_order.discount_amount <> 0 then
    raise exception 'CHECKOUT_TOTAL_INTEGRITY_ERROR' using errcode='P0001';
  end if;

  perform products.product_id
  from public.products
  join (
    select product_id, sum(quantity)::integer as quantity
    from public.order_items
    where order_id = v_order.order_id
    group by product_id
  ) as ordered using (product_id)
  order by products.product_id
  for update of products;

  if exists (
    select 1
    from public.order_items
    join public.products using (product_id)
    where order_items.order_id = v_order.order_id
      and not products.is_active
  ) then
    raise exception 'CHECKOUT_PRODUCT_UNAVAILABLE' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.products
    join (
      select product_id, sum(quantity)::integer as quantity
      from public.order_items
      where order_id = v_order.order_id
      group by product_id
    ) as ordered using (product_id)
    where products.stock < ordered.quantity
  ) then
    raise exception 'CHECKOUT_STOCK_UNAVAILABLE' using errcode = 'P0001';
  end if;

  select coalesce(sum(quantity::bigint * price_at_order::bigint), 0)
  into v_subtotal
  from public.order_items
  where order_id = v_order.order_id;

  v_delivery_fee := case when v_subtotal >= 40000 or v_subtotal = 0 then 0 else 3000 end;
  if v_order.user_coupon_id is not null and v_order.discount_amount <> (v_subtotal * 20 / 100)::integer then
    raise exception 'CHECKOUT_TOTAL_INTEGRITY_ERROR' using errcode='P0001';
  end if;
  if v_subtotal <= 0 or v_subtotal + v_delivery_fee - v_order.discount_amount <> v_order.total_price then
    raise exception 'CHECKOUT_TOTAL_INTEGRITY_ERROR' using errcode = 'P0001';
  end if;

  if v_order.user_coupon_id is not null then
    update public.user_coupons set used_at=now(), used_order_id=v_order.order_id where id=v_order.user_coupon_id;
  end if;

  delete from public.cart_items
  using (
    select product_id, sum(quantity)::integer as quantity
    from public.order_items
    where order_id = v_order.order_id
    group by product_id
  ) as ordered
  where cart_items.user_id = v_order.user_id
    and cart_items.product_id = ordered.product_id
    and cart_items.quantity <= ordered.quantity;

  update public.cart_items
  set quantity = cart_items.quantity - ordered.quantity,
      updated_at = now()
  from (
    select product_id, sum(quantity)::integer as quantity
    from public.order_items
    where order_id = v_order.order_id
    group by product_id
  ) as ordered
  where cart_items.user_id = v_order.user_id
    and cart_items.product_id = ordered.product_id
    and cart_items.quantity > ordered.quantity;

  update public.products
  set stock = products.stock - ordered.quantity
  from (
    select product_id, sum(quantity)::integer as quantity
    from public.order_items
    where order_id = v_order.order_id
    group by product_id
  ) as ordered
  where products.product_id = ordered.product_id;

  update public.orders
  set payment_key = p_payment_key,
      status = 'paid'
  where order_id = v_order.order_id;

  return jsonb_build_object(
    'order_id', v_order.order_id,
    'status', 'paid',
    'total_price', v_order.total_price,
    'already_paid', false
  );
end;
$function$;
commit;
