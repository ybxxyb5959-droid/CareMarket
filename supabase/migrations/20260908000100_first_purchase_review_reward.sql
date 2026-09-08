begin;

-- Apply after 20260907000100_delivered_review_rewards.sql. No existing rows
-- are deleted, revoked or reissued, including historical duplicate rewards.
update public.coupons set name = '신규가입 20% 할인' where id = 'welcome20';
update public.coupons set name = '첫 구매 리뷰 감사 10% 할인' where id = 'review10';

-- A separate account-level unique ledger allows preserving historical duplicates.
create table public.review_reward_accounts (
  user_id uuid primary key references public.profiles(user_id),
  claimed_at timestamptz not null default now()
);
alter table public.review_reward_accounts enable row level security;
revoke all on public.review_reward_accounts from public, anon, authenticated;

-- Block concurrent issuance while historical grants are recorded and the guard
-- is installed. This migration is atomic with the existing issuance RPC.
lock table public.user_coupons in share row exclusive mode;
insert into public.review_reward_accounts(user_id, claimed_at)
select user_id, min(issued_at) from public.user_coupons
where source = 'review_reward' group by user_id
on conflict (user_id) do nothing;

create function public.guard_first_purchase_review_reward() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  first_order_id uuid;
  claimed_user_id uuid;
begin
  if new.source <> 'review_reward' then return new; end if;
  -- First purchase means the earliest successfully paid order, never an
  -- abandoned pending checkout. Legacy orders fall back to created_at; UUID breaks equal-time ties.
  select o.order_id into first_order_id from public.orders o
  where o.user_id = new.user_id and o.status in ('paid', 'preparing', 'shipped', 'delivered')
  order by coalesce((to_jsonb(o)->>'paid_at')::timestamptz, o.created_at), o.order_id limit 1;
  if first_order_id is null or new.reward_order_id is distinct from first_order_id
    or not exists (select 1 from public.orders where order_id = first_order_id and status = 'delivered') then
    return null;
  end if;
  -- The existing RPC inserts the review before requesting its reward.
  -- Hidden/deleted reviews still count as previously written reviews.
  if (select count(*) from public.reviews r join public.order_items oi on oi.order_item_id = r.order_item_id
      where oi.order_id = first_order_id and r.user_id = new.user_id) <> 1 then
    return null;
  end if;
  insert into public.review_reward_accounts(user_id) values (new.user_id)
  on conflict (user_id) do nothing returning user_id into claimed_user_id;
  if claimed_user_id is null then return null; end if;
  return new;
end;
$$;
revoke all on function public.guard_first_purchase_review_reward() from public, anon, authenticated;
create trigger user_coupons_first_purchase_review_guard
before insert on public.user_coupons for each row
execute function public.guard_first_purchase_review_reward();

-- Preserve the review RPC's item/order locks, request-id uniqueness, restoration,
-- rating-independent issuance and payment logic. The DB guard applies to every
-- insertion path, and the unique account claim shares the RPC transaction.
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
      where uc.source = 'review_reward' and uc.user_id = o.user_id
    ),
    reward.name,
    reward.percent
  from public.orders o
  join public.order_items oi on oi.order_id = o.order_id
  join public.products p on p.product_id = oi.product_id
  left join public.reviews r on r.order_item_id = oi.order_item_id
  left join public.coupons reward on reward.id = 'review10'
    and o.order_id = (select first_order.order_id from public.orders first_order
      where first_order.user_id = o.user_id and first_order.status in ('paid', 'preparing', 'shipped', 'delivered')
      order by coalesce((to_jsonb(first_order)->>'paid_at')::timestamptz, first_order.created_at), first_order.order_id limit 1)
    and not exists (select 1 from public.user_coupons uc where uc.user_id = o.user_id and uc.source = 'review_reward')
    and not exists (select 1 from public.reviews prior join public.order_items prior_item on prior_item.order_item_id = prior.order_item_id
      where prior_item.order_id = o.order_id)
  where auth.uid() is not null and o.user_id = auth.uid()
    and o.status in ('paid', 'preparing', 'shipped', 'delivered')
  order by o.created_at desc, oi.order_item_id;
$function$;

commit;
