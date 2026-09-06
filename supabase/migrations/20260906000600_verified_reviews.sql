begin;
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id bigint not null references public.products(product_id),
  user_id uuid not null references public.profiles(user_id),
  order_item_id uuid not null unique references public.order_items(order_item_id),
  rating integer not null check (rating between 1 and 5),
  content text not null check (char_length(btrim(content)) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reviews_product_idx on public.reviews(product_id);
alter table public.reviews enable row level security;
create policy reviews_public_read on public.reviews for select to anon, authenticated using (true);
create policy reviews_verified_insert on public.reviews for insert to authenticated with check (
  user_id = auth.uid() and exists (
    select 1 from public.order_items i join public.orders o on o.order_id = i.order_id
    where i.order_item_id = reviews.order_item_id and i.product_id = reviews.product_id
      and o.user_id = auth.uid() and o.status in ('paid','preparing','shipped','delivered')
  )
);
create policy reviews_owner_update on public.reviews for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy reviews_owner_delete on public.reviews for delete to authenticated using (user_id = auth.uid());
revoke all on public.reviews from public, anon, authenticated;
grant select on public.reviews to anon, authenticated;
grant insert (product_id,user_id,order_item_id,rating,content), update (rating,content), delete on public.reviews to authenticated;
create function public.touch_review() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger reviews_updated before update on public.reviews for each row execute function public.touch_review();
create function public.get_product_review_summary(p_product_id bigint) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('count',count(*),'average',round(avg(rating),1))
  from public.reviews where product_id=p_product_id;
$$;
revoke all on function public.get_product_review_summary(bigint) from public;
grant execute on function public.get_product_review_summary(bigint) to anon,authenticated;
commit;
