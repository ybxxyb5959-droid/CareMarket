begin;

-- Refuse to combine an unknown permissive policy with the owner-only policies.
do $policies$
declare
  existing record;
begin
  for existing in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('orders', 'order_items')
  loop
    if existing.policyname not in ('orders_select_own', 'order_items_select_own') then
      raise exception 'Review existing %.% policy before applying this migration.',
        existing.tablename, existing.policyname;
    end if;
  end loop;
end;
$policies$;

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists orders_select_own on public.orders;
create policy orders_select_own
  on public.orders
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists order_items_select_own on public.order_items;
create policy order_items_select_own
  on public.order_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders
      where orders.order_id = order_items.order_id
        and orders.user_id = auth.uid()
    )
  );

revoke all on public.orders from public, anon, authenticated;
revoke all on public.order_items from public, anon, authenticated;
grant select on public.orders to authenticated;
grant select on public.order_items to authenticated;

create or replace function public.create_checkout_order()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_order_id uuid := gen_random_uuid();
  v_toss_order_id text := 'cm_' || replace(gen_random_uuid()::text, '-', '');
  v_lines jsonb;
  v_item_kinds integer;
  v_subtotal bigint;
  v_delivery_fee bigint;
  v_total bigint;
  v_first_name text;
  v_order_name text;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'product_id', products.product_id,
          'name', products.name,
          'price', products.price,
          'quantity', cart_items.quantity,
          'stock', products.stock,
          'is_active', products.is_active
        ) order by products.product_id
      ),
      '[]'::jsonb
    ),
    count(*)::integer,
    coalesce(sum(cart_items.quantity::bigint * products.price::bigint), 0)
  into v_lines, v_item_kinds, v_subtotal
  from public.cart_items
  join public.products using (product_id)
  where cart_items.user_id = v_user_id;

  if v_item_kinds = 0 then
    raise exception 'Cart is empty' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(v_lines) as line(is_active boolean)
    where not line.is_active
  ) then
    raise exception 'Cart contains an unavailable product' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(v_lines) as line(quantity integer, stock integer)
    where line.quantity > line.stock
  ) then
    raise exception 'Cart quantity exceeds stock' using errcode = '22023';
  end if;

  v_delivery_fee := case when v_subtotal >= 40000 or v_subtotal = 0 then 0 else 3000 end;
  v_total := v_subtotal + v_delivery_fee;

  if v_total <= 0 or v_total > 2147483647 then
    raise exception 'Invalid checkout total' using errcode = '22023';
  end if;

  select line.name
  into v_first_name
  from jsonb_to_recordset(v_lines) as line(product_id bigint, name text)
  order by line.product_id
  limit 1;

  v_order_name := left(v_first_name, 80)
    || case when v_item_kinds > 1 then format(' 외 %s건', v_item_kinds - 1) else '' end;

  insert into public.orders (
    order_id, user_id, toss_order_id, total_price, status
  ) values (
    v_order_id, v_user_id, v_toss_order_id, v_total::integer, 'pending'
  );

  insert into public.order_items (order_id, product_id, quantity, price_at_order)
  select v_order_id, line.product_id, line.quantity, line.price
  from jsonb_to_recordset(v_lines) as line(
    product_id bigint,
    quantity integer,
    price integer
  );

  return jsonb_build_object(
    'order_id', v_order_id,
    'toss_order_id', v_toss_order_id,
    'total_price', v_total::integer,
    'order_name', v_order_name
  );
end;
$function$;

create or replace function public.complete_paid_order(
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
  if v_subtotal <= 0 or v_subtotal + v_delivery_fee <> v_order.total_price then
    raise exception 'CHECKOUT_TOTAL_INTEGRITY_ERROR' using errcode = 'P0001';
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

revoke all on function public.create_checkout_order() from public, anon;
grant execute on function public.create_checkout_order() to authenticated;

revoke all on function public.complete_paid_order(uuid, text) from public, anon, authenticated;
grant execute on function public.complete_paid_order(uuid, text) to service_role;

commit;
