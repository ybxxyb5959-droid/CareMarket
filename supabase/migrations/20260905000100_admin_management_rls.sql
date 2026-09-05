begin;

-- Existing policies are intentionally enumerated. Do not combine an unknown
-- permissive policy with the administrator policies below.
do $policies$
declare
  existing record;
begin
  for existing in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'products', 'orders', 'order_items')
  loop
    if (existing.tablename = 'profiles' and existing.policyname not in ('profiles_select_own', 'profiles_select_admin'))
      or (existing.tablename = 'products' and existing.policyname not in ('products_select_active', 'products_select_admin_all', 'products_insert_admin', 'products_update_admin'))
      or (existing.tablename = 'orders' and existing.policyname not in ('orders_select_own', 'orders_select_admin_all'))
      or (existing.tablename = 'order_items' and existing.policyname not in ('order_items_select_own', 'order_items_select_admin_all'))
    then
      raise exception 'Review existing %.% policy before applying administrator RLS.',
        existing.tablename, existing.policyname;
    end if;
  end loop;
end;
$policies$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.profiles
    where user_id = auth.uid()
      and role = 'admin'
  );
$function$;

revoke all on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated;

alter table public.profiles enable row level security;
drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin
  on public.profiles
  for select
  to authenticated
  using ((select public.is_admin()));

alter table public.products enable row level security;
drop policy if exists products_select_admin_all on public.products;
create policy products_select_admin_all
  on public.products
  for select
  to authenticated
  using ((select public.is_admin()));

drop policy if exists products_insert_admin on public.products;
create policy products_insert_admin
  on public.products
  for insert
  to authenticated
  with check ((select public.is_admin()));

drop policy if exists products_update_admin on public.products;
create policy products_update_admin
  on public.products
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

revoke insert, update, delete on public.products from anon, authenticated;
grant select on public.products to anon, authenticated;
grant insert, update on public.products to authenticated;

alter table public.orders enable row level security;
drop policy if exists orders_select_admin_all on public.orders;
create policy orders_select_admin_all
  on public.orders
  for select
  to authenticated
  using ((select public.is_admin()));

alter table public.order_items enable row level security;
drop policy if exists order_items_select_admin_all on public.order_items;
create policy order_items_select_admin_all
  on public.order_items
  for select
  to authenticated
  using ((select public.is_admin()));

create or replace function public.admin_update_order_status(
  p_order_id uuid,
  p_new_status text
)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_current_status text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not public.is_admin() then
    raise exception 'Administrator role required' using errcode = '42501';
  end if;

  if p_new_status not in ('preparing', 'shipped', 'delivered') then
    raise exception 'Invalid administrator order status' using errcode = '22023';
  end if;

  select status
  into v_current_status
  from public.orders
  where order_id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  if not (
    (v_current_status = 'paid' and p_new_status = 'preparing')
    or (v_current_status = 'preparing' and p_new_status = 'shipped')
    or (v_current_status = 'shipped' and p_new_status = 'delivered')
  ) then
    raise exception 'Invalid order status transition: % -> %', v_current_status, p_new_status
      using errcode = '22023';
  end if;

  update public.orders
  set status = p_new_status
  where order_id = p_order_id;

  return p_new_status;
end;
$function$;

revoke all on function public.admin_update_order_status(uuid, text) from public, anon;
grant execute on function public.admin_update_order_status(uuid, text) to authenticated;

commit;
