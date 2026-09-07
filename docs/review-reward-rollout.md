# CareMarket 리뷰 · 리뷰보상 운영 rollout

## 1. 최초 오류 원인과 운영 상태

`20260907000100_delivered_review_rewards.sql`의 기존 첫 guard는
`to_regclass('public.reviews')`와 `to_regclass('public.user_coupons')`가 모두 존재하는지 검사했다.
운영 DB에는 `20260906000700_welcome_coupon`이 적용되어 `user_coupons`는 있었지만,
`20260906000600_verified_reviews` 이력이 없고 실제 `reviews` 테이블도 없었다. 따라서 guard가
`Apply verified reviews and welcome coupon migrations first`를 발생시켰다.

2026-09-07 운영 preflight에서 확인한 값:

- orders 24건, order_items 34건
- coupons 1건(`welcome20`, 20%)
- user_coupons 4건(모두 기존 welcome20), orphan/중복 0건
- `reviews` 없음
- `public.is_admin()`, 배송정보 checkout, 결제/재고 최종화 함수 존재
- 기존 결제 함수는 welcome20만 허용하고 20을 함수 안에 고정한 상태

과거 migration 전체 재실행은 선택하지 않았다. 운영 migration history에는 일부 파일이 중간중간
비어 있고, 그중에는 이미 효과가 존재하는 파일과 실제 미적용 파일이 섞여 있기 때문이다.

## 2. 실제 적용 방식

`20260907000100_delivered_review_rewards.sql`을 운영 기준 reconciliation migration으로 변경했다.
전체 파일을 먼저 `ROLLBACK`으로 dry-run한 뒤, 같은 파일을 `COMMIT`으로 실행했다. 이후
`20260907000100`을 applied로 기록했다.

스키마 효과가 이미 정확히 존재하던 `20260905000200`, `20260905000300`,
`20260905000500`, `20260906001200`과, 이번 reconciliation이 대체한
`20260906000600`도 migration history만 applied로 보정했다. 데이터나 함수를 재실행하지 않았다.

다음 migration은 실제 미적용이므로 이번 리뷰 작업에서 임의 적용/repair하지 않았다.

- `20260905000700_backfill_profile_contact_from_auth_metadata.sql`: 데이터 backfill 여부를 이력만으로 확정할 수 없음
- `20260906000300_update_p1_product_image_urls.sql`: 대상 20개가 여전히 원격 legacy URL이며 asset rollout 조건 확인 필요
- `20260906000400_cart_stock_limit.sql`: `cart_stock_limit` trigger 없음
- `20260906001300_kakao_oauth_profile_support.sql`: 운영 가입 함수가 아직 Google 전용
- `20260906001400_resume_oauth_registration.sql`: 운영 가입 함수에 missing-profile 복구 분기 없음

따라서 위 항목을 별도 결정하기 전에는 전체 `supabase db push`를 실행하지 않는다.

## 3. 최종 리뷰/보상 정책

- 리뷰 작성 입력은 `order_item_id`, 별점, 본문, request UUID뿐이다.
- 서버가 `order_items -> orders`를 잠그고 `orders.user_id = auth.uid()` 및
  `orders.status = 'delivered'`를 확인한 뒤 product/user/order를 결정한다.
- `reviews.order_item_id` UNIQUE와 `(user_id, request_id)` partial UNIQUE로 중복 생성과 재시도를 막는다.
- 삭제는 `deleted_at` soft delete다. 재작성은 같은 행을 복원하고 `created_at`과 내용을 갱신한다.
- 수정/삭제는 각각 `update_my_review`, `delete_my_review`가 소유자를 다시 검사한다.
- 리뷰 테이블 직접 DML은 authenticated에도 grant하지 않는다. RLS owner-update 정책과
  공개 가능 행 정책을 함께 두며 hard delete 정책은 만들지 않았다.
- 공개 조회는 hidden/deleted를 제외하고 `is_mine DESC, created_at DESC`로 서버 정렬한다.
- sample 후기는 프런트 정적 데이터로 유지하며 실제 DB 평균/개수/쿠폰에 포함하지 않는다.
- `review10`은 첫 유효 리뷰와 같은 RPC transaction에서 발급한다.
- `user_coupons_review_order_once(reward_order_id) WHERE source='review_reward'`로 주문당 한 장을 보장한다.
- 삭제/수정/복원 시 쿠폰은 회수하거나 재발급하지 않는다.
- welcome20과 review10은 source/주문 제약으로 독립 공존한다.
- checkout과 결제 최종화는 선택한 coupon catalog의 실제 percent로 상품 subtotal만 할인한다.
  배송비는 할인하지 않고, 쿠폰은 성공한 DB 결제 최종화 transaction에서만 used 상태가 된다.

## 4. 운영 확인 SQL

아래 쿼리는 읽기 전용이다. 오류 없이 구조와 이상 행을 함께 확인할 수 있다.

```sql
-- migration 이력
select version
from supabase_migrations.schema_migrations
where version in ('20260906000600', '20260906000700', '20260907000100')
order by version;

-- reviews 최종 schema와 soft delete
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'reviews'
order by ordinal_position;

select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'reviews'
  and column_name = 'deleted_at';

-- review UNIQUE / request idempotency / 공개 조회 index
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and indexname in (
    'reviews_order_item_id_key',
    'reviews_user_request_unique',
    'reviews_public_product_created_idx'
  )
order by indexname;

-- welcome20 / review10 catalog
select id, name, percent
from public.coupons
where id in ('welcome20', 'review10')
order by id;

-- review10 reward_order_id와 주문당 UNIQUE
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'user_coupons'
  and column_name in ('source', 'reward_order_id');

select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and indexname in ('user_coupons_welcome_once', 'user_coupons_review_order_once');

-- 중복 review / coupon: 모두 0행이어야 함
select order_item_id, count(*)
from public.reviews
group by order_item_id
having count(*) > 1;

select user_id, count(*)
from public.user_coupons
where source = 'welcome'
group by user_id
having count(*) > 1;

select reward_order_id, count(*)
from public.user_coupons
where source = 'review_reward'
group by reward_order_id
having count(*) > 1;

-- orphan review: 모두 0행이어야 함
select r.id
from public.reviews r
left join public.profiles u on u.user_id = r.user_id
left join public.products p on p.product_id = r.product_id
left join public.order_items oi on oi.order_item_id = r.order_item_id
left join public.orders o on o.order_id = oi.order_id
where u.user_id is null or p.product_id is null or oi.order_item_id is null
  or o.order_id is null or r.product_id <> oi.product_id or r.user_id <> o.user_id;

-- orphan user_coupon: 모두 0행이어야 함
select uc.id
from public.user_coupons uc
left join public.profiles u on u.user_id = uc.user_id
left join public.coupons c on c.id = uc.coupon_id
left join public.orders reward on reward.order_id = uc.reward_order_id
left join public.orders used_order on used_order.order_id = uc.used_order_id
where u.user_id is null or c.id is null
  or (uc.reward_order_id is not null and reward.order_id is null)
  or (uc.used_order_id is not null and used_order.order_id is null);

-- 공개 리뷰 집계: 관리자 숨김/사용자 삭제 제외
select product_id, count(*) as public_count, round(avg(rating), 1) as public_average
from public.reviews
where not is_hidden and deleted_at is null
group by product_id
order by product_id;

-- 숨김/삭제가 공개 함수 집계와 분리되는지 특정 상품으로 확인
select
  count(*) filter (where not is_hidden and deleted_at is null) as public_rows,
  count(*) filter (where is_hidden and deleted_at is null) as admin_hidden_rows,
  count(*) filter (where deleted_at is not null) as user_deleted_rows
from public.reviews
where product_id = <PRODUCT_ID>;

select public.get_product_review_summary(<PRODUCT_ID>);
select public.get_public_product_reviews(<PRODUCT_ID>, 50);

-- 권한과 RPC 목록
select routine_name, security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'get_my_review_items', 'get_public_product_reviews',
    'submit_order_item_review', 'update_my_review', 'delete_my_review',
    'get_admin_reviews', 'moderate_review',
    'create_coupon_checkout_order', 'complete_paid_order_with_inventory'
  )
order by routine_name;

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'reviews'
order by grantee, privilege_type;

select policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'reviews'
order by policyname;
```

`<PRODUCT_ID>`는 실제 상품 ID로 바꾼다.

## 5. 수행한 운영 검증

운영 DB에서 전체 migration `ROLLBACK` dry-run 후 실제 적용 및 postflight를 완료했다.
또한 실제 운영 함수와 역할을 사용한 transaction 시나리오를 수행하고 마지막에 `ROLLBACK`했다.

통과 항목:

- 배송완료 전 리뷰 거부
- 타인 order_item 리뷰 거부
- 한 주문의 상품 1, 상품 2 리뷰에서 review10 한 장만 발급
- 동일 request UUID 재시도 시 리뷰/쿠폰 중복 없음
- 별점 5 -> 2 및 본문 수정, 쿠폰 변화 없음
- 타인 직접 UPDATE/DELETE grant 차단 및 owner RPC 차단
- 일반 사용자 관리자 moderation RPC 차단
- 관리자 숨김/복원 시 공개 count 제외/복구
- soft delete 시 공개 count 제외 및 쿠폰 유지
- 재작성 시 동일 review row 복원 및 쿠폰 추가 발급 없음
- review10 checkout 10%, welcome20 checkout 20%, 모두 상품 subtotal 기준
- DB 결제 최종화 성공 시에만 쿠폰 used 처리

검증 transaction 종료 뒤 확인 값은 reviews 0건, review_reward 0건,
기존 welcome20 4건, pending orders 20건으로 원래 상태와 같았다.
외부 Toss 실제 승인/취소와 브라우저 결제는 수행하지 않았다.
