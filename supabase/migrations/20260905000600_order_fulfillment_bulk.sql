begin;

-- Keep the existing, security-definer payment finalization logic intact. The
-- wrapper only advances a successfully finalized paid order into fulfillment.
alter function public.complete_paid_order(uuid, text)
  rename to complete_paid_order_with_inventory;

revoke all on function public.complete_paid_order_with_inventory(uuid, text)
  from public, anon, authenticated, service_role;

create function public.complete_paid_order(
  p_order_id uuid,
  p_payment_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_result jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;

  v_result := public.complete_paid_order_with_inventory(p_order_id, p_payment_key);

  update public.orders
  set status = 'preparing'
  where order_id = p_order_id
    and payment_key = p_payment_key
    and status = 'paid';

  if v_result ->> 'status' = 'paid' then
    v_result := jsonb_set(v_result, '{status}', to_jsonb('preparing'::text));
  end if;

  return v_result;
end;
$function$;

revoke all on function public.complete_paid_order(uuid, text)
  from public, anon, authenticated;
grant execute on function public.complete_paid_order(uuid, text) to service_role;

create or replace function public.admin_bulk_ship_orders(p_order_ids uuid[])
returns table(order_id uuid)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_order_ids uuid[];
  v_order_count integer;
  v_preparing_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not public.is_admin() then
    raise exception 'Administrator role required' using errcode = '42501';
  end if;

  select coalesce(array_agg(distinct requested_id), '{}')
  into v_order_ids
  from unnest(coalesce(p_order_ids, '{}')) as requested(requested_id)
  where requested_id is not null;

  if cardinality(v_order_ids) = 0 then
    raise exception 'Select at least one order' using errcode = '22023';
  end if;

  if cardinality(v_order_ids) > 5000 then
    raise exception 'Too many orders selected' using errcode = '22023';
  end if;

  perform orders.order_id
  from public.orders
  where orders.order_id = any(v_order_ids)
  order by orders.order_id
  for update;

  select
    count(*)::integer,
    count(*) filter (where orders.status = 'preparing')::integer
  into v_order_count, v_preparing_count
  from public.orders
  where orders.order_id = any(v_order_ids);

  if v_order_count <> cardinality(v_order_ids) then
    raise exception 'One or more orders were not found' using errcode = 'P0002';
  end if;

  if v_preparing_count <> v_order_count then
    raise exception 'Only preparing orders can be shipped' using errcode = '22023';
  end if;

  return query
  update public.orders as target
  set status = 'shipped'
  where target.order_id = any(v_order_ids)
    and target.status = 'preparing'
  returning target.order_id;
end;
$function$;

revoke all on function public.admin_bulk_ship_orders(uuid[])
  from public, anon;
grant execute on function public.admin_bulk_ship_orders(uuid[]) to authenticated;

commit;
