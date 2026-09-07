begin;

-- Production reconciliation: the linked database already has the welcome coupon
-- migration but can legitimately be missing the verified-reviews migration.
-- Validate the real prerequisites, then create only the missing review relation.
do $$
begin
  if to_regclass('public.profiles') is null
    or to_regclass('public.products') is null
    or to_regclass('public.orders') is null
    or to_regclass('public.order_items') is null
    or to_regclass('public.coupons') is null
    or to_regclass('public.user_coupons') is null
  then
    raise exception 'CareMarket core order and welcome coupon schema is required';
  end if;
  if to_regprocedure('public.is_admin()') is null
    or to_regprocedure('public.create_checkout_order(text,text,text,text,text,text)') is null
    or to_regprocedure('public.complete_paid_order_with_inventory(uuid,text)') is null
  then
    raise exception 'CareMarket admin, shipping checkout, and fulfillment functions are required';
  end if;
  if not exists (
    select 1 from public.coupons where id = 'welcome20' and percent = 20
  ) then
    raise exception 'The existing welcome20 coupon definition is required';
  end if;
end;
$$;

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id bigint not null references public.products(product_id),
  user_id uuid not null references public.profiles(user_id),
  order_item_id uuid not null unique references public.order_items(order_item_id),
  rating integer not null check (rating between 1 and 5),
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Reuse an existing verified-reviews table when present and add only rollout fields.
alter table public.reviews
  add column if not exists request_id uuid,
  add column if not exists reward_coupon_id uuid unique references public.user_coupons(id),
  add column if not exists is_hidden boolean not null default false,
  add column if not exists hidden_reason text,
  add column if not exists hidden_at timestamptz,
  add column if not exists hidden_by uuid references public.profiles(user_id),
  add column if not exists deleted_at timestamptz;

alter table public.reviews drop constraint if exists reviews_content_check;
alter table public.reviews add constraint reviews_content_check
  check (char_length(btrim(content)) between 20 and 1000) not valid;
alter table public.reviews drop constraint if exists reviews_hidden_state_check;
alter table public.reviews add constraint reviews_hidden_state_check
  check (
    (not is_hidden and hidden_at is null and hidden_by is null)
    or (is_hidden and hidden_at is not null and hidden_by is not null and char_length(btrim(hidden_reason)) between 2 and 500)
  ) not valid;
do $$
begin
  if not exists (
    select 1 from public.reviews
    where char_length(btrim(content)) not between 20 and 1000
  ) then
    alter table public.reviews validate constraint reviews_content_check;
  end if;
  if not exists (
    select 1 from public.reviews
    where not (
      (not is_hidden and hidden_at is null and hidden_by is null)
      or (is_hidden and hidden_at is not null and hidden_by is not null
        and char_length(btrim(hidden_reason)) between 2 and 500)
    )
  ) then
    alter table public.reviews validate constraint reviews_hidden_state_check;
  end if;
end;
$$;
create unique index if not exists reviews_user_request_unique
  on public.reviews(user_id, request_id) where request_id is not null;
create index if not exists reviews_public_product_created_idx
  on public.reviews(product_id, created_at desc) where not is_hidden and deleted_at is null;

create or replace function public.touch_review() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = clock_timestamp();
  return new;
end;
$$;
revoke all on function public.touch_review() from public, anon, authenticated;
drop trigger if exists reviews_updated on public.reviews;
create trigger reviews_updated before update on public.reviews
for each row execute function public.touch_review();

drop policy if exists reviews_public_read on public.reviews;
drop policy if exists reviews_verified_insert on public.reviews;
drop policy if exists reviews_owner_update on public.reviews;
drop policy if exists reviews_owner_delete on public.reviews;
alter table public.reviews enable row level security;
create policy reviews_public_read on public.reviews for select to anon, authenticated
  using (not is_hidden and deleted_at is null);
create policy reviews_owner_update on public.reviews for update to authenticated
  using (user_id = auth.uid() and deleted_at is null)
  with check (user_id = auth.uid());
-- No DELETE policy is created: user deletion is a soft-delete RPC only.
revoke all on public.reviews from public, anon, authenticated;

-- Generalize the existing coupon catalog without changing the welcome coupon row.
alter table public.coupons drop constraint if exists coupons_id_check;
alter table public.coupons drop constraint if exists coupons_percent_check;
alter table public.coupons add constraint coupons_percent_check check (percent between 1 and 100);
insert into public.coupons(id, name, percent)
values ('review10', '구매후기 감사 10%', 10)
on conflict (id) do nothing;

do $$
begin
  if exists (select 1 from public.coupons where id = 'welcome20' and percent <> 20)
    or exists (select 1 from public.coupons where id = 'review10' and percent <> 10) then
    raise exception 'Existing coupon definitions do not match the CareMarket policy';
  end if;
end;
$$;

alter table public.user_coupons
  add column if not exists source text not null default 'welcome',
  add column if not exists reward_order_id uuid references public.orders(order_id);
alter table public.user_coupons drop constraint if exists user_coupons_user_id_coupon_id_key;
alter table public.user_coupons drop constraint if exists user_coupons_source_check;
alter table public.user_coupons drop constraint if exists user_coupons_reward_source_check;
alter table public.user_coupons add constraint user_coupons_source_check
  check (source in ('welcome', 'review_reward'));
alter table public.user_coupons add constraint user_coupons_reward_source_check
  check (
    (source = 'welcome' and coupon_id = 'welcome20' and reward_order_id is null)
    or (source = 'review_reward' and coupon_id = 'review10' and reward_order_id is not null)
  );
create unique index if not exists user_coupons_welcome_once
  on public.user_coupons(user_id) where source = 'welcome';
create unique index if not exists user_coupons_review_order_once
  on public.user_coupons(reward_order_id) where source = 'review_reward';

-- Only these RPCs may read/write real reviews. They expose no email, address,
-- order number, or other customer/order details publicly.
create or replace function public.get_my_review_items()
returns table (
  order_id uuid,
  order_item_id uuid,
  product_id bigint,
  quantity integer,
  order_status text,
  order_created_at timestamptz,
  product_name text,
  image_url text,
  option_label text,
  review_id uuid,
  reviewed boolean,
  review_rating integer,
  review_content text,
  review_created_at timestamptz,
  review_updated_at timestamptz,
  review_deleted_at timestamptz,
  review_hidden boolean,
  reward_issued boolean,
  reward_coupon_name text,
  reward_coupon_percent integer
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    o.order_id,
    oi.order_item_id,
    oi.product_id,
    oi.quantity,
    o.status,
    o.created_at,
    p.name,
    p.image_url,
    null::text,
    r.id,
    r.id is not null and r.deleted_at is null,
    r.rating,
    r.content,
    r.created_at,
    r.updated_at,
    r.deleted_at,
    coalesce(r.is_hidden, false),
    exists (
      select 1 from public.user_coupons uc
      where uc.source = 'review_reward' and uc.reward_order_id = o.order_id
    ),
    reward.name,
    reward.percent
  from public.orders o
  join public.order_items oi on oi.order_id = o.order_id
  join public.products p on p.product_id = oi.product_id
  left join public.reviews r on r.order_item_id = oi.order_item_id
  left join public.coupons reward on reward.id = 'review10'
  where auth.uid() is not null and o.user_id = auth.uid()
    and o.status in ('paid', 'preparing', 'shipped', 'delivered')
  order by o.created_at desc, oi.order_item_id;
$function$;

create or replace function public.get_public_product_reviews(
  p_product_id bigint,
  p_limit integer default 5
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 5), 1), 50);
  v_count bigint;
  v_average numeric;
  v_reviews jsonb;
begin
  if p_product_id is null or p_product_id < 1 then
    raise exception 'Invalid product id' using errcode = '22023';
  end if;

  select count(*), round(avg(rating), 1)
  into v_count, v_average
  from public.reviews
  where product_id = p_product_id and not is_hidden and deleted_at is null;

  select coalesce(jsonb_agg(to_jsonb(public_row)
    order by public_row.is_mine desc, public_row.created_at desc), '[]'::jsonb)
  into v_reviews
  from (
    select
      r.id,
      r.rating,
      r.content,
      r.created_at,
      r.updated_at,
      auth.uid() is not null and r.user_id = auth.uid() as is_mine,
      case
        when char_length(btrim(p.display_name)) <= 1 then left(btrim(p.display_name), 1) || '*'
        else left(btrim(p.display_name), 1) || repeat('*', least(char_length(btrim(p.display_name)) - 1, 5))
      end as author_name,
      true as verified_purchase
    from public.reviews r
    join public.profiles p on p.user_id = r.user_id
    where r.product_id = p_product_id and not r.is_hidden and r.deleted_at is null
    order by (auth.uid() is not null and r.user_id = auth.uid()) desc, r.created_at desc
    limit v_limit
  ) public_row;

  return jsonb_build_object('count', v_count, 'average', v_average, 'reviews', v_reviews);
end;
$function$;

create or replace function public.get_product_review_summary(p_product_id bigint)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
  select jsonb_build_object('count', count(*), 'average', round(avg(rating), 1))
  from public.reviews
  where product_id = p_product_id and not is_hidden and deleted_at is null;
$function$;

create or replace function public.submit_order_item_review(
  p_order_item_id uuid,
  p_rating integer,
  p_content text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_order_id uuid;
  v_product_id bigint;
  v_order_status text;
  v_review public.reviews%rowtype;
  v_coupon_id uuid;
  v_coupon_name text;
  v_coupon_percent integer;
  v_coupon_issued boolean := false;
  v_content text := btrim(coalesce(p_content, ''));
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_order_item_id is null or p_request_id is null then
    raise exception 'Invalid review request' using errcode = '22023';
  end if;
  if p_rating is null or p_rating not between 1 and 5 then
    raise exception 'Rating must be between 1 and 5' using errcode = '22023';
  end if;
  if char_length(v_content) not between 20 and 1000 then
    raise exception 'Review content must be between 20 and 1000 characters' using errcode = '22023';
  end if;

  -- A lost response can be retried safely even if fulfillment changed later.
  select * into v_review
  from public.reviews
  where user_id = v_user_id and request_id = p_request_id;
  if found then
    if v_review.order_item_id <> p_order_item_id then
      raise exception 'Review request key already used' using errcode = '23505';
    end if;
    select oi.order_id into v_order_id from public.order_items oi where oi.order_item_id = v_review.order_item_id;
    select uc.id, c.name, c.percent
    into v_coupon_id, v_coupon_name, v_coupon_percent
    from public.user_coupons uc
    join public.coupons c on c.id = uc.coupon_id
    where uc.source = 'review_reward' and uc.reward_order_id = v_order_id;
    return jsonb_build_object(
      'review_id', v_review.id,
      'review_created', false,
      'review_restored', false,
      'review_deleted', v_review.deleted_at is not null,
      'coupon_id', v_coupon_id,
      'coupon_name', v_coupon_name,
      'coupon_percent', v_coupon_percent,
      'coupon_issued', false,
      'coupon_already_issued', v_coupon_id is not null,
      'already_reviewed', v_review.deleted_at is null
    );
  end if;

  -- Lock the order and item so concurrent first reviews for one order serialize.
  select o.order_id, oi.product_id, o.status
  into v_order_id, v_product_id, v_order_status
  from public.order_items oi
  join public.orders o on o.order_id = oi.order_id
  where oi.order_item_id = p_order_item_id and o.user_id = v_user_id
  for update of o, oi;

  if not found then
    raise exception 'Order item not found for authenticated customer' using errcode = '42501';
  end if;

  if v_order_status <> 'delivered' then
    raise exception 'Only delivered order items can be reviewed' using errcode = '42501';
  end if;

  select * into v_review from public.reviews where order_item_id = p_order_item_id;
  if found then
    if v_review.user_id <> v_user_id then
      raise exception 'Order item review ownership mismatch' using errcode = '42501';
    end if;
    select uc.id, c.name, c.percent
    into v_coupon_id, v_coupon_name, v_coupon_percent
    from public.user_coupons uc
    join public.coupons c on c.id = uc.coupon_id
    where uc.source = 'review_reward' and uc.reward_order_id = v_order_id;
    if v_review.deleted_at is not null then
      update public.reviews
      set rating = p_rating,
          content = v_content,
          request_id = p_request_id,
          deleted_at = null,
          created_at = clock_timestamp()
      where id = v_review.id
      returning * into v_review;
      return jsonb_build_object(
        'review_id', v_review.id,
        'review_created', true,
        'review_restored', true,
        'review_deleted', false,
        'coupon_id', v_coupon_id,
        'coupon_name', v_coupon_name,
        'coupon_percent', v_coupon_percent,
        'coupon_issued', false,
        'coupon_already_issued', v_coupon_id is not null,
        'already_reviewed', false
      );
    end if;
    return jsonb_build_object(
      'review_id', v_review.id,
      'review_created', false,
      'review_restored', false,
      'review_deleted', false,
      'coupon_id', v_coupon_id,
      'coupon_name', v_coupon_name,
      'coupon_percent', v_coupon_percent,
      'coupon_issued', false,
      'coupon_already_issued', v_coupon_id is not null,
      'already_reviewed', true
    );
  end if;

  insert into public.reviews(product_id, user_id, order_item_id, rating, content, request_id)
  values (v_product_id, v_user_id, p_order_item_id, p_rating, v_content, p_request_id)
  returning * into v_review;

  insert into public.user_coupons(user_id, coupon_id, source, reward_order_id)
  values (v_user_id, 'review10', 'review_reward', v_order_id)
  on conflict do nothing
  returning id into v_coupon_id;

  v_coupon_issued := v_coupon_id is not null;
  if not v_coupon_issued then
    select uc.id into v_coupon_id
    from public.user_coupons uc
    where uc.source = 'review_reward' and uc.reward_order_id = v_order_id;
  end if;
  select c.name, c.percent into v_coupon_name, v_coupon_percent
  from public.coupons c where c.id = 'review10';

  if v_coupon_issued then
    update public.reviews set reward_coupon_id = v_coupon_id where id = v_review.id;
  end if;

  return jsonb_build_object(
    'review_id', v_review.id,
    'review_created', true,
    'review_restored', false,
    'review_deleted', false,
    'coupon_id', v_coupon_id,
    'coupon_name', v_coupon_name,
    'coupon_percent', v_coupon_percent,
    'coupon_issued', v_coupon_issued,
    'coupon_already_issued', not v_coupon_issued and v_coupon_id is not null,
    'already_reviewed', false
  );
end;
$function$;

create or replace function public.update_my_review(
  p_review_id uuid,
  p_rating integer,
  p_content text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_content text := btrim(coalesce(p_content, ''));
  v_review public.reviews%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_review_id is null or p_rating is null or p_rating not between 1 and 5 then
    raise exception 'Invalid review update' using errcode = '22023';
  end if;
  if char_length(v_content) not between 20 and 1000 then
    raise exception 'Review content must be between 20 and 1000 characters' using errcode = '22023';
  end if;

  update public.reviews
  set rating = p_rating, content = v_content
  where id = p_review_id and user_id = v_user_id and deleted_at is null
  returning * into v_review;
  if not found then
    raise exception 'Review not found for authenticated customer' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'review_id', v_review.id,
    'rating', v_review.rating,
    'content', v_review.content,
    'updated_at', v_review.updated_at
  );
end;
$function$;

create or replace function public.delete_my_review(p_review_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_deleted_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_review_id is null then
    raise exception 'Invalid review delete request' using errcode = '22023';
  end if;

  update public.reviews
  set deleted_at = clock_timestamp()
  where id = p_review_id and user_id = v_user_id and deleted_at is null
  returning deleted_at into v_deleted_at;
  if not found then
    raise exception 'Review not found for authenticated customer' using errcode = '42501';
  end if;
  return jsonb_build_object('review_id', p_review_id, 'deleted_at', v_deleted_at);
end;
$function$;

create or replace function public.get_admin_reviews()
returns table (
  id uuid,
  product_id bigint,
  product_name text,
  author_name text,
  rating integer,
  content text,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz,
  is_hidden boolean,
  hidden_reason text,
  hidden_at timestamptz,
  status text
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator role required' using errcode = '42501';
  end if;
  return query
    select r.id, r.product_id, p.name, pr.display_name, r.rating, r.content,
      r.created_at, r.updated_at, r.deleted_at, r.is_hidden, r.hidden_reason, r.hidden_at,
      case when r.deleted_at is not null then 'deleted'
        when r.is_hidden then 'hidden' else 'public' end
    from public.reviews r
    join public.products p on p.product_id = r.product_id
    join public.profiles pr on pr.user_id = r.user_id
    order by r.created_at desc;
end;
$function$;

create or replace function public.moderate_review(
  p_review_id uuid,
  p_hidden boolean,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator role required' using errcode = '42501';
  end if;
  if p_review_id is null or p_hidden is null then
    raise exception 'Invalid moderation request' using errcode = '22023';
  end if;
  if p_hidden and char_length(v_reason) not between 2 and 500 then
    raise exception 'A 2-500 character reason is required' using errcode = '22023';
  end if;

  update public.reviews
  set is_hidden = p_hidden,
      hidden_reason = case when p_hidden then v_reason else hidden_reason end,
      hidden_at = case when p_hidden then clock_timestamp() else null end,
      hidden_by = case when p_hidden then auth.uid() else null end
  where id = p_review_id;
  if not found then raise exception 'Review not found' using errcode = 'P0002'; end if;
  return jsonb_build_object('review_id', p_review_id, 'is_hidden', p_hidden);
end;
$function$;

revoke all on function public.get_my_review_items() from public, anon;
revoke all on function public.get_public_product_reviews(bigint, integer) from public;
revoke all on function public.get_product_review_summary(bigint) from public;
revoke all on function public.submit_order_item_review(uuid, integer, text, uuid) from public, anon;
revoke all on function public.update_my_review(uuid, integer, text) from public, anon;
revoke all on function public.delete_my_review(uuid) from public, anon;
revoke all on function public.get_admin_reviews() from public, anon;
revoke all on function public.moderate_review(uuid, boolean, text) from public, anon;
grant execute on function public.get_my_review_items() to authenticated;
grant execute on function public.get_public_product_reviews(bigint, integer) to anon, authenticated;
grant execute on function public.get_product_review_summary(bigint) to anon, authenticated;
grant execute on function public.submit_order_item_review(uuid, integer, text, uuid) to authenticated;
grant execute on function public.update_my_review(uuid, integer, text) to authenticated;
grant execute on function public.delete_my_review(uuid) to authenticated;
grant execute on function public.get_admin_reviews() to authenticated;
grant execute on function public.moderate_review(uuid, boolean, text) to authenticated;

-- Coupon selection and payment integrity now use the selected catalog rate.
create or replace function public.create_coupon_checkout_order(
  p_recipient_name text, p_recipient_phone text, p_postal_code text,
  p_address text, p_address_detail text, p_delivery_request text, p_user_coupon_id uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  result jsonb;
  coupon public.user_coupons%rowtype;
  subtotal bigint;
  discount integer;
  coupon_percent integer;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select * into coupon
  from public.user_coupons
  where id = p_user_coupon_id and user_id = auth.uid()
  for update;
  if not found or coupon.used_at is not null then
    raise exception 'CHECKOUT_COUPON_UNAVAILABLE' using errcode='P0001';
  end if;
  select percent into coupon_percent from public.coupons where id = coupon.coupon_id;
  if coupon_percent is null then
    raise exception 'CHECKOUT_COUPON_UNAVAILABLE' using errcode='P0001';
  end if;
  result := public.create_checkout_order(p_recipient_name,p_recipient_phone,p_postal_code,p_address,p_address_detail,p_delivery_request);
  select sum(quantity::bigint * price_at_order) into subtotal
  from public.order_items where order_id=(result->>'order_id')::uuid;
  discount := (subtotal * coupon_percent / 100)::integer;
  update public.orders
  set user_coupon_id=coupon.id, discount_amount=discount, total_price=total_price-discount
  where order_id=(result->>'order_id')::uuid;
  return result || jsonb_build_object('total_price',(result->>'total_price')::integer-discount,'discount_amount',discount,'coupon_percent',coupon_percent);
end;
$$;

revoke all on function public.create_coupon_checkout_order(text,text,text,text,text,text,uuid) from public,anon;
grant execute on function public.create_coupon_checkout_order(text,text,text,text,text,text,uuid) to authenticated;

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
  v_coupon_percent integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;
  if p_payment_key is null or btrim(p_payment_key) = '' or length(p_payment_key) > 200 then
    raise exception 'Invalid payment key' using errcode = '22023';
  end if;

  select * into v_order from public.orders where order_id = p_order_id for update;
  if not found then raise exception 'Order not found' using errcode = 'P0002'; end if;
  if v_order.status <> 'pending' then
    if v_order.status in ('paid', 'preparing', 'shipped', 'delivered') and v_order.payment_key = p_payment_key then
      return jsonb_build_object('order_id',v_order.order_id,'status',v_order.status,'total_price',v_order.total_price,'already_paid',true);
    end if;
    raise exception 'Order is not payable' using errcode = '55000';
  end if;

  if v_order.user_coupon_id is not null then
    select * into v_coupon from public.user_coupons
    where id = v_order.user_coupon_id for update;
    if not found or v_coupon.user_id <> v_order.user_id or v_coupon.used_at is not null then
      raise exception 'CHECKOUT_COUPON_UNAVAILABLE' using errcode='P0001';
    end if;
    select percent into v_coupon_percent from public.coupons where id = v_coupon.coupon_id;
    if v_coupon_percent is null then
      raise exception 'CHECKOUT_COUPON_UNAVAILABLE' using errcode='P0001';
    end if;
  elsif v_order.discount_amount <> 0 then
    raise exception 'CHECKOUT_TOTAL_INTEGRITY_ERROR' using errcode='P0001';
  end if;

  perform products.product_id
  from public.products
  join (select product_id, sum(quantity)::integer quantity from public.order_items where order_id=v_order.order_id group by product_id) ordered using(product_id)
  order by products.product_id for update of products;
  if exists (
    select 1 from public.order_items join public.products using(product_id)
    where order_items.order_id=v_order.order_id and not products.is_active
  ) then raise exception 'CHECKOUT_PRODUCT_UNAVAILABLE' using errcode='P0001'; end if;
  if exists (
    select 1 from public.products
    join (select product_id,sum(quantity)::integer quantity from public.order_items where order_id=v_order.order_id group by product_id) ordered using(product_id)
    where products.stock < ordered.quantity
  ) then raise exception 'CHECKOUT_STOCK_UNAVAILABLE' using errcode='P0001'; end if;

  select coalesce(sum(quantity::bigint * price_at_order::bigint),0) into v_subtotal
  from public.order_items where order_id=v_order.order_id;
  v_delivery_fee := case when v_subtotal >= 40000 or v_subtotal = 0 then 0 else 3000 end;
  if v_order.user_coupon_id is not null and v_order.discount_amount <> (v_subtotal * v_coupon_percent / 100)::integer then
    raise exception 'CHECKOUT_TOTAL_INTEGRITY_ERROR' using errcode='P0001';
  end if;
  if v_subtotal <= 0 or v_subtotal + v_delivery_fee - v_order.discount_amount <> v_order.total_price then
    raise exception 'CHECKOUT_TOTAL_INTEGRITY_ERROR' using errcode='P0001';
  end if;

  if v_order.user_coupon_id is not null then
    update public.user_coupons set used_at=now(), used_order_id=v_order.order_id
    where id=v_order.user_coupon_id and used_at is null;
    if not found then raise exception 'CHECKOUT_COUPON_UNAVAILABLE' using errcode='P0001'; end if;
  end if;

  delete from public.cart_items
  using (select product_id,sum(quantity)::integer quantity from public.order_items where order_id=v_order.order_id group by product_id) ordered
  where cart_items.user_id=v_order.user_id and cart_items.product_id=ordered.product_id and cart_items.quantity <= ordered.quantity;
  update public.cart_items set quantity=cart_items.quantity-ordered.quantity,updated_at=now()
  from (select product_id,sum(quantity)::integer quantity from public.order_items where order_id=v_order.order_id group by product_id) ordered
  where cart_items.user_id=v_order.user_id and cart_items.product_id=ordered.product_id and cart_items.quantity > ordered.quantity;
  update public.products set stock=products.stock-ordered.quantity
  from (select product_id,sum(quantity)::integer quantity from public.order_items where order_id=v_order.order_id group by product_id) ordered
  where products.product_id=ordered.product_id;
  update public.orders set payment_key=p_payment_key,status='paid' where order_id=v_order.order_id;
  return jsonb_build_object('order_id',v_order.order_id,'status','paid','total_price',v_order.total_price,'already_paid',false);
end;
$function$;

revoke all on function public.complete_paid_order_with_inventory(uuid,text) from public,anon,authenticated;
grant execute on function public.complete_paid_order_with_inventory(uuid,text) to service_role;

commit;
