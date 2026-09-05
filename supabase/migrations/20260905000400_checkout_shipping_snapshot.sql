begin;

-- Existing orders remain readable. New checkout orders store the delivery
-- details that were confirmed at purchase time instead of depending on a
-- profile that can be edited later.
alter table public.orders
  add column if not exists recipient_name text,
  add column if not exists recipient_phone text,
  add column if not exists postal_code text,
  add column if not exists address text,
  add column if not exists address_detail text,
  add column if not exists delivery_request text;

alter table public.orders
  drop constraint if exists orders_shipping_snapshot_valid;

alter table public.orders
  add constraint orders_shipping_snapshot_valid check (
    (recipient_name is null or length(recipient_name) between 1 and 100)
    and (recipient_phone is null or length(recipient_phone) between 5 and 30)
    and (postal_code is null or length(postal_code) <= 20)
    and (address is null or length(address) between 1 and 300)
    and (address_detail is null or length(address_detail) <= 200)
    and (delivery_request is null or length(delivery_request) <= 200)
  ) not valid;

alter table public.orders validate constraint orders_shipping_snapshot_valid;

-- The legacy no-argument RPC is retained only for schema compatibility and
-- explicitly made unavailable to clients. New checkouts must provide a valid
-- shipping snapshot.
revoke all on function public.create_checkout_order() from public, anon, authenticated;

create or replace function public.create_checkout_order(
  p_recipient_name text,
  p_recipient_phone text,
  p_postal_code text,
  p_address text,
  p_address_detail text,
  p_delivery_request text
)
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
  v_recipient_name text := nullif(btrim(coalesce(p_recipient_name, '')), '');
  v_recipient_phone text := nullif(btrim(coalesce(p_recipient_phone, '')), '');
  v_postal_code text := nullif(btrim(coalesce(p_postal_code, '')), '');
  v_address text := nullif(btrim(coalesce(p_address, '')), '');
  v_address_detail text := nullif(btrim(coalesce(p_address_detail, '')), '');
  v_delivery_request text := nullif(btrim(coalesce(p_delivery_request, '')), '');
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if v_recipient_name is null or length(v_recipient_name) > 100 then
    raise exception 'Invalid recipient name' using errcode = '22023';
  end if;
  if v_recipient_phone is null or length(v_recipient_phone) not between 5 and 30 then
    raise exception 'Invalid recipient phone' using errcode = '22023';
  end if;
  if v_postal_code is not null and length(v_postal_code) > 20 then
    raise exception 'Invalid postal code' using errcode = '22023';
  end if;
  if v_address is null or length(v_address) > 300 then
    raise exception 'Invalid address' using errcode = '22023';
  end if;
  if v_address_detail is not null and length(v_address_detail) > 200 then
    raise exception 'Invalid address detail' using errcode = '22023';
  end if;
  if v_delivery_request is not null and length(v_delivery_request) > 200 then
    raise exception 'Invalid delivery request' using errcode = '22023';
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
    order_id,
    user_id,
    toss_order_id,
    total_price,
    status,
    recipient_name,
    recipient_phone,
    postal_code,
    address,
    address_detail,
    delivery_request
  ) values (
    v_order_id,
    v_user_id,
    v_toss_order_id,
    v_total::integer,
    'pending',
    v_recipient_name,
    v_recipient_phone,
    v_postal_code,
    v_address,
    v_address_detail,
    v_delivery_request
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

revoke all on function public.create_checkout_order(text, text, text, text, text, text)
  from public, anon;
grant execute on function public.create_checkout_order(text, text, text, text, text, text)
  to authenticated;

commit;
