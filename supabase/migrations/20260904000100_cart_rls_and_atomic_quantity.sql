begin;

-- Inspect existing policies first. Never silently combine an unknown permissive
-- policy with owner-only policies: PostgreSQL combines permissive policies with OR.
do $policies$
declare
  existing record;
  operation text;
  policy_name text;
  owner_check constant text := '(auth.uid() = user_id)';
begin
  for existing in select * from pg_policies
    where schemaname = 'public' and tablename = 'cart_items'
  loop
    if existing.policyname not in (
      'cart_items_select_own', 'cart_items_insert_own',
      'cart_items_update_own', 'cart_items_delete_own'
    ) then
      raise exception 'Review existing cart_items policy % before applying this migration.', existing.policyname;
    end if;
  end loop;

  foreach operation in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE'] loop
    policy_name := 'cart_items_' || lower(operation) || '_own';
    select * into existing from pg_policies
      where schemaname = 'public' and tablename = 'cart_items' and policyname = policy_name;
    if found then
      if existing.cmd <> operation or existing.roles <> array['authenticated']::name[]
        or existing.permissive <> 'PERMISSIVE'
        or existing.qual is distinct from (case when operation <> 'INSERT' then owner_check else null end)
        or existing.with_check is distinct from (case when operation in ('INSERT', 'UPDATE') then owner_check else null end)
      then
        raise exception 'Review incompatible cart_items policy % before applying this migration.', policy_name;
      end if;
    else
      execute format('create policy %I on public.cart_items for %s to authenticated %s %s',
        policy_name, operation,
        case when operation <> 'INSERT' then 'using (auth.uid() = user_id)' else '' end,
        case when operation in ('INSERT', 'UPDATE') then 'with check (auth.uid() = user_id)' else '' end);
    end if;
  end loop;
end;
$policies$;

alter table public.cart_items enable row level security;
revoke all on public.cart_items from public, anon, authenticated;
grant select, insert, update, delete on public.cart_items to authenticated;

-- SECURITY INVOKER keeps table RLS active. p_user_id is an additional session
-- switch guard; row ownership always comes from auth.uid(), not the client.
create or replace function public.add_my_cart_item(
  p_product_id bigint, p_quantity integer, p_user_id uuid
) returns void
language plpgsql security invoker set search_path = ''
as $function$
begin
  if auth.uid() is null or p_user_id is distinct from auth.uid() then
    raise exception 'Authenticated cart owner required' using errcode = '42501';
  end if;
  if p_quantity is null or p_quantity < 1 then
    raise exception 'Quantity must be positive' using errcode = '22023';
  end if;
  if not exists (select 1 from public.products where product_id = p_product_id and is_active) then
    raise exception 'Product is unavailable' using errcode = '22023';
  end if;
  insert into public.cart_items as cart (user_id, product_id, quantity)
  values (auth.uid(), p_product_id, p_quantity)
  on conflict (user_id, product_id) do update
    set quantity = cart.quantity + excluded.quantity, updated_at = now();
end;
$function$;

create or replace function public.change_my_cart_quantity(
  p_product_id bigint, p_delta integer, p_user_id uuid
) returns void
language plpgsql security invoker set search_path = ''
as $function$
begin
  if auth.uid() is null or p_user_id is distinct from auth.uid() then
    raise exception 'Authenticated cart owner required' using errcode = '42501';
  end if;
  if p_delta is null or p_delta not in (-1, 1) then
    raise exception 'Delta must be -1 or 1' using errcode = '22023';
  end if;
  update public.cart_items
    set quantity = greatest(1, quantity + p_delta), updated_at = now()
    where user_id = auth.uid() and product_id = p_product_id;
  if not found then
    raise exception 'Cart item not found' using errcode = 'P0002';
  end if;
end;
$function$;

revoke all on function public.add_my_cart_item(bigint, integer, uuid) from public, anon;
revoke all on function public.change_my_cart_quantity(bigint, integer, uuid) from public, anon;
grant execute on function public.add_my_cart_item(bigint, integer, uuid) to authenticated;
grant execute on function public.change_my_cart_quantity(bigint, integer, uuid) to authenticated;

commit;
