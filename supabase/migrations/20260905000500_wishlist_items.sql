begin;

create table if not exists public.wishlist_items (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  product_id bigint not null references public.products(product_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create index if not exists wishlist_items_user_created_at_idx
  on public.wishlist_items(user_id, created_at desc);

alter table public.wishlist_items enable row level security;

drop policy if exists wishlist_items_select_own on public.wishlist_items;
create policy wishlist_items_select_own
  on public.wishlist_items
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists wishlist_items_insert_own on public.wishlist_items;
create policy wishlist_items_insert_own
  on public.wishlist_items
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists wishlist_items_delete_own on public.wishlist_items;
create policy wishlist_items_delete_own
  on public.wishlist_items
  for delete
  to authenticated
  using (user_id = auth.uid());

revoke all on public.wishlist_items from public, anon;
grant select, insert, delete on public.wishlist_items to authenticated;

commit;
