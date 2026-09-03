begin;

alter table public.products enable row level security;

create policy products_select_active
  on public.products
  for select
  to anon, authenticated
  using (is_active = true);

commit;
