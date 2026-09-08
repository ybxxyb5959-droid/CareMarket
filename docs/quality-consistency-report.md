# CareMarket 데이터·동작 정합성 수정 기록 (2026-09-08)

UI/CSS/레이아웃 변경 없음. JSX 태그 순서·스타일 속성, 샘플 원본 및 상품 카드 원본을 Git 기준으로 비교했다. 화면 표시 문자열과 데이터 바인딩만 수정했다. 운영 DB 적용·Edge Function 배포·웹 배포는 실행하지 않았다.

## 수정 파일 (27개)

- [docs/ai-search.md](C:/dev/caremarket/docs/ai-search.md)
- [docs/quality-consistency-report.md](C:/dev/caremarket/docs/quality-consistency-report.md)
- [src/StoreProvider.jsx](C:/dev/caremarket/src/StoreProvider.jsx)
- [src/components/GoalBadge.jsx](C:/dev/caremarket/src/components/GoalBadge.jsx)
- [src/components/HomeReviewPrompt.jsx](C:/dev/caremarket/src/components/HomeReviewPrompt.jsx)
- [src/components/ProductComparisonModal.jsx](C:/dev/caremarket/src/components/ProductComparisonModal.jsx)
- [src/components/ProductReviews.jsx](C:/dev/caremarket/src/components/ProductReviews.jsx)
- [src/components/ReviewModal.jsx](C:/dev/caremarket/src/components/ReviewModal.jsx)
- [src/components/checkout/CheckoutSummary.jsx](C:/dev/caremarket/src/components/checkout/CheckoutSummary.jsx)
- [src/lib/ai-search.js](C:/dev/caremarket/src/lib/ai-search.js)
- [src/lib/auth-return.js](C:/dev/caremarket/src/lib/auth-return.js)
- [src/lib/catalog.js](C:/dev/caremarket/src/lib/catalog.js)
- [src/lib/nutrition.js](C:/dev/caremarket/src/lib/nutrition.js)
- [src/lib/products.js](C:/dev/caremarket/src/lib/products.js)
- [src/pages/Checkout.jsx](C:/dev/caremarket/src/pages/Checkout.jsx)
- [src/pages/Orders.jsx](C:/dev/caremarket/src/pages/Orders.jsx)
- [src/pages/ProductDetail.jsx](C:/dev/caremarket/src/pages/ProductDetail.jsx)
- [supabase/functions/_shared/ai-search-contract.js](C:/dev/caremarket/supabase/functions/_shared/ai-search-contract.js)
- [supabase/functions/_shared/cart-nutrition-analysis.js](C:/dev/caremarket/supabase/functions/_shared/cart-nutrition-analysis.js)
- [supabase/functions/_shared/nutrition-policy.js](C:/dev/caremarket/supabase/functions/_shared/nutrition-policy.js)
- [supabase/functions/ai-insights/handler.js](C:/dev/caremarket/supabase/functions/ai-insights/handler.js)
- [supabase/migrations/20260908000100_first_purchase_review_reward.sql](C:/dev/caremarket/supabase/migrations/20260908000100_first_purchase_review_reward.sql)
- [tests/ai-search-cases.mjs](C:/dev/caremarket/tests/ai-search-cases.mjs)
- [tests/final-features-sql.test.mjs](C:/dev/caremarket/tests/final-features-sql.test.mjs)
- [tests/google-auth.test.mjs](C:/dev/caremarket/tests/google-auth.test.mjs)
- [tests/quality-consistency.test.mjs](C:/dev/caremarket/tests/quality-consistency.test.mjs)
- [tests/reviews.test.mjs](C:/dev/caremarket/tests/reviews.test.mjs)

## 정책과 구현

- 신규가입: 기존 profiles 생성 trigger와 사용자별 welcome UNIQUE 유지. 20% 1장.
- 리뷰: 모든 배송완료 주문의 상품은 계속 작성/수정/삭제 가능. 보상만 계정의 첫 구매 주문에 작성한 최초 리뷰로 제한. 별점 무관 10% 1장.
- 첫 구매: 결제 완료 상태(paid/preparing/shipped/delivered) 주문 중 결제일 순서. 결제일 미기록 또는 paid_at 컬럼이 없는 배포는 created_at을 사용하며 동률은 order_id로 결정. pending 결제 시도는 제외.
- 중복 방지: 기존 order/item 잠금, 리뷰 item UNIQUE, 요청 UUID UNIQUE를 재사용. user_coupons INSERT trigger가 첫 주문/배송완료/최초 리뷰를 검사하고 review_reward_accounts.user_id PRIMARY KEY를 같은 transaction에서 선점한다.
- 과거 주문별 중복 쿠폰이 있어도 삭제·회수하지 않는다. 기존 발급 이력을 계정별 지급 기록으로 이관해 이후 보상을 막는다. 과거 첫 리뷰에 미지급된 보상의 소급 발급은 하지 않는다.
- Checkout: 실제 coupons.name 표시. 현재 스키마의 할인율 필드는 discount_rate가 아니라 percent이며, 프런트와 기존 주문/결제 RPC가 동일한 percent로 상품금액에만 할인한다.
- 실제 리뷰 집계: DB 공개 reviews만 사용(기존 hidden/deleted 제외 정책 유지). 샘플 본문/작성자/별점/날짜와 기존 샘플 위치는 보존. 카드의 기존 샘플 표시도 유지.
- 영양: 기존 일반 필터의 저당 5g, 저염 250mg, 고단백 15g을 공유 모듈로 통일. 명시한 AI 숫자는 우선한다. GoalBadge의 나트륨 단일값 label을 나트륨으로 수정.
- 일반 검색: 공백 토큰 모두가 상품명·브랜드·카테고리·기존 태그 중 하나 이상과 일치하는 결과만 반환. 단백질 간편식으로 실제 카탈로그 결과를 확인했다.
- 인증 복귀: 현재 라우터 + sessionStorage(탭별, 30분, 1회 소비). 내부 경로만 허용하고 외부/프로토콜 상대/인코딩된 역슬래시/제어문자 경로는 차단. 이메일 로그인, Google/Kakao 복귀와 가입 완료 후 복귀에 연결. 저장소가 불가능하면 기존 기본 이동 유지.
- Orders: 주문 요청과 리뷰 권한 요청을 별도 effect/state로 분리. 리뷰 요청 실패·지연은 주문 표시를 막지 않으며 리뷰 동작만 사용할 수 없는 상태로 처리한다.
- null: 상품 어댑터에서 미등록값 유지. 필터 조건을 충족하지 않으며 영양 정렬에서는 뒤로 배치. 비교·상세·카드·합계는 정보 없음으로 표시하고 AI 요청에서도 null을 0으로 바꾸지 않는다. 등록된 실제 0은 유지.

## 수동 적용 순서

1. 현재 DB에 20260907000100_delivered_review_rewards.sql의 reviews, user_coupons.source, get_my_review_items, submit_order_item_review와 percent 기반 결제 RPC가 존재하는지 확인한다. 이미 적용된 과거 migration을 재실행하거나 전체 db push를 하지 않는다. 누락된 경우 기존 review-reward-rollout.md의 선행 조건을 확인한 뒤 해당 migration을 먼저 적용한다.
2. [20260908000100_first_purchase_review_reward.sql](C:/dev/caremarket/supabase/migrations/20260908000100_first_purchase_review_reward.sql) 전체를 한 transaction으로 한 번 실행한다. 기존 데이터 삭제·초기화 없음. 이 SQL에는 account 지급 기록, INSERT guard, 리뷰 권한 조회의 보상 데이터 분리, 쿠폰명 수정이 포함된다.
3. DB 적용 성공을 확인한 뒤 변경된 ai-search와 ai-insights Edge Functions 및 프런트를 기존 배포 절차로 배포한다. 공유 모듈 변경은 Edge Functions 재배포가 필요하다.
4. 실제 Google/Kakao 로그인과 Toss 테스트 결제, 복수 DB 연결에서 첫 주문 여러 상품 리뷰의 동시 요청을 검증한다.

## 검증

- 전체 npm test: **248 통과, 실패 0, skip 0**. 기존 환경 의존 SQL 테스트도 임시 로컬 PGlite를 지정해 실행했다. 프로젝트 package.json/lockfile 의존성 변경 없음.
- DB 실실행: 과거 중복 쿠폰 보존, 신규가입 중복 차단, 배송 전 작성 차단, 둘째 구매 리뷰 허용·보상 없음, 첫 구매 별점 1점 보상, 반복 RPC/추가 상품/삭제 후 복원 시 미중복, 20%·10% 주문금액과 결제 RPC 검증.
- PGlite의 겹쳐 호출한 RPC는 단일 엔진에서 직렬 실행된다. 여러 PostgreSQL 연결의 실제 잠금 경합은 아직 직접 검증하지 않았다.
- npm run build: 성공. 500kB 초과 JS chunk 안내 경고만 존재하며 이번 범위에서 번들 구조는 변경하지 않았다.
- git diff --check 및 JSX 태그 순서/시각 속성 비교 통과. CSS, Header/Footer, Drawer, 상품 카드, 샘플 원본 변경 없음.
- 기존 AI fixture의 숫자 없는 저당 기대값은 새 정책에 따라 2g → 5g으로 수정. OAuth 기본 복귀 테스트에는 추가된 복귀 함수 의존성을 주입했고, 실제 라우터 복귀 회귀 테스트도 추가했다.

재실행(PowerShell, 이 작업에서 설치한 임시 엔진 사용):

```powershell
$env:PGLITE_MODULE = 'C:\dev\caremarket\tmp\quality-db\node_modules\@electric-sql\pglite\dist\index.js'
npm test
npm run build
```

직접 미검증: 운영 DB migration 실행, 실서비스 OAuth 왕복, 실제 Toss 테스트 결제창 완주, 실제 다중 DB 세션 경쟁, 브라우저 픽셀 비교. 코드·SQL 테스트에서 검증한 범위와 구분한다.
