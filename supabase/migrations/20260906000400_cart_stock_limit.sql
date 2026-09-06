begin;

-- Covers both RPC writes and direct REST INSERT/UPDATE while preserving owner RLS.
create or replace function public.check_cart_stock() returns trigger
language plpgsql security definer set search_path = '' as $$
declare available integer;
begin
  select stock into available from public.products
    where product_id = new.product_id and is_active for share;
  if available is null or new.quantity > available then
    raise exception 'Cart quantity exceeds available stock' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.check_cart_stock() from public, anon, authenticated;
create trigger cart_stock_limit before insert or update on public.cart_items
  for each row execute function public.check_cart_stock();

commit;
