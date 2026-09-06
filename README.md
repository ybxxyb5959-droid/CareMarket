# CareMarket

건강한 선택을 더 쉽게. 구매 목적과 영양정보를 함께 살펴보고 주문하는 웰니스 커머스입니다. React 화면과 Supabase Auth·DB·RLS, Gemini AI, Toss Payments 테스트 결제가 연결되어 있습니다.

> 포트폴리오·캡스톤용 프로젝트입니다. **가상 상품 데이터**를 사용하며 실제 판매·배송은 제공하지 않습니다. 결제는 **Toss Payments 테스트 환경**입니다. 관리자 차트는 DB에 저장된 실제 완료 주문을 집계합니다.

## 기획 배경

상품명과 가격뿐 아니라 단백질·당류·나트륨·카페인·알레르기 정보를 비교하도록 기획했습니다. 근육량 증가, 체중 관리, 식단 영양 관리, 영양제 탐색의 네 가지 목적에 맞춰 정보를 강조합니다. 검색·분석 기준은 의료 진단이나 처방이 아닙니다.

## Production URL

[CareMarket 서비스](https://caremarket.vercel.app/)

이번 최종 마감 변경의 원격 반영 여부와 외부 검증 상태는 [최종 마감 기록](docs/final-release.md)을 확인하세요. 로컬 구현과 Production 반영은 구분합니다.

## 주요 기능

- Supabase 회원가입·로그인, 배송지·구매 목적·제외 조건 설정
- DB 상품 조회, 카테고리·조건 필터, 일반 검색, Gemini 자연어 검색
- `/best`: paid/preparing/shipped/delivered 주문 수량 집계 순위. pending 제외, 판매 없음은 Empty 처리
- `/new`: 실제 `products.created_at` 최신 등록순
- 상품 상세·영양정보·위시리스트·구매 인증 리뷰
- 계정별 장바구니, 서버 재고 상한, 영양 분석·상품 비교
- 신규회원 20% 쿠폰, 주문서, Toss 테스트 결제, 주문내역
- FAQ, 본인 1:1 문의·관리자 답변, 브랜드 입점·제휴 제안

## 고객 Flow

회원가입 → 쿠폰 자동 발급 → 로그인 → 구매 목적 설정 → 전체/베스트/신상품/AI 검색 → 상품 상세 → 장바구니·재고 확인 → 영양 분석 → 배송정보·쿠폰 선택 → Toss 테스트 결제 → 주문내역 → 구매 리뷰 작성·수정·삭제.

FAQ → 1:1 문의 → 문의 내역에서 관리자 답변 확인.

## 관리자 Flow

관리자 계정 로그인 → 대시보드 → 상품 관리 → 주문·출고 → 결제 미완료 → 협업 제안 → 1:1 문의 답변.

브랜드 방문자는 입점·제휴 안내 → 제안 작성으로 접수합니다. 관리자는 협업 제안 화면에서 확인하며 일반 사용자는 관리자 데이터에 접근할 수 없습니다.

## 기술 Stack

| 영역 | 기술 |
| --- | --- |
| 화면 | React 19, JavaScript, CSS, Vite 8 |
| 데이터·인증 | Supabase Auth, PostgreSQL, RLS, RPC |
| 서버 | Supabase Edge Functions, Deno, native fetch |
| AI | Gemini Structured Output, 서버 검증·결정적 계산 |
| 결제 | Toss Payments SDK·서버 승인 API, 테스트 키 제한 |
| 이메일 | Resend HTTP API |
| 배포 | Vercel SPA routing |
| 검증 | Node test runner, oxlint, Vite build, 선택적 PGlite, 브라우저 회귀 |

## Architecture

```text
React / StoreProvider / History API routes
 ├─ Supabase Auth → 사용자 세션
 ├─ REST + RLS → 상품·프로필·장바구니·주문·리뷰·문의
 ├─ PostgreSQL RPC → 재고·주문 금액·쿠폰·결제 완료 트랜잭션
 └─ Edge Functions
     ├─ ai-search / ai-insights → Gemini
     └─ confirm-payment → Toss 승인·확인·실패 보상 취소
```

`src/pages`는 화면, `src/components`는 UI, `src/lib`는 조회·검증·계산입니다. 기존 `src/data/mock.js`에는 목표·필터·카테고리·홈 콘텐츠 상수가 남아 있으며 미사용 가상 상품·회원·주문·리뷰 배열은 제거했습니다. 디자인은 ivory/off-white, forest green, sage, 여백과 얇은 구분선을 사용합니다.

## Supabase / RLS

- 활성 상품은 공개 조회, 상품 변경은 DB 관리자 권한 검증을 거칩니다.
- 프로필·설정·장바구니·위시리스트는 사용자 소유권으로 제한합니다.
- 주문·주문 상품은 본인 또는 관리자만 조회하며 고객이 결제 완료 상태를 직접 쓰지 못합니다.
- 장바구니 RPC와 직접 INSERT/UPDATE 모두 `products.stock`을 검증합니다. 재고 예약은 아니므로 결제 시 다시 검증합니다.
- 리뷰는 공개 조회, 본인 완료 구매건만 작성, 본인 별점·내용만 수정/삭제합니다.
- 쿠폰 발급·사용 처리와 구독자 테이블 쓰기는 브라우저에 허용하지 않습니다.
- service role key는 Edge Function 내부에서만 사용합니다.

## Toss Payments

주문 RPC가 DB 가격·재고·배송비를 확인하고 구매 시점의 가격과 배송정보를 저장합니다. 배송비는 상품 합계 40,000원 이상 무료, 미만 3,000원입니다. 쿠폰은 상품금액에만 적용합니다.

서버 주문 ID·금액으로 Toss 결제를 요청합니다. `confirm-payment`는 로그인 사용자·주문 소유권·금액을 검증하고 `test_` 키만 허용합니다. 승인·취소에 서로 다른 멱등 키를 사용하고, 재고 차감·장바구니 정리·쿠폰 사용은 같은 DB 트랜잭션으로 처리합니다. 동일 결제 재확인은 중복 차감하지 않습니다.

확정적인 재고·상품·쿠폰·금액 무결성 실패는 자동 취소를 시도합니다. 네트워크 오류 등 결과가 불확실하면 중복 결제를 유도하지 않고 상태 확인을 안내합니다.

## AI 구조

`ai-search`는 자연어를 허용된 검색 조건으로 변환합니다. 서버가 구조·허용값·수치를 검증하고 클라이언트는 실제 DB 상품을 필터링합니다. 가짜 상품을 생성하지 않습니다.

`ai-insights`는 인증된 사용자 장바구니를 서버에서 조회하고 등록 영양정보를 결정적으로 합산합니다. Gemini는 제한된 설명을 보완하며 실패 시 가능한 계산 결과를 유지합니다. 비교는 선택한 실제 2~3개 상품만 사용합니다. 기존 빠른 필터의 공유 계약은 유지하고 미사용 AI 필터 추천 UI는 제거했습니다.

## 구매 인증 리뷰

별점 1~5, 1~500자 후기, 작성·본인 수정·삭제, 평균 별점·리뷰 수·0건 상태를 제공합니다. paid/preparing/shipped/delivered 상태의 본인 주문 상품만 작성합니다. `order_item_id` UNIQUE로 동일 구매건 중복을 막고 사용자·상품·구매건 연결은 수정할 수 없습니다. 사진·AI 요약·좋아요·신고는 포함하지 않습니다.

## 신규회원 쿠폰과 이벤트

신규회원 20% 한 종류입니다. migration 이후 생성되는 프로필에 자동 발급하며 기존 회원에게 소급 발급하지 않습니다. 마이페이지에서 쿠폰명·할인율·발급일·사용 상태를 확인하고 주문서에서 선택·적용·적용 취소합니다. 상품금액의 20%를 원 단위 내림으로 할인하며 배송비는 제외합니다. 별도 유효기간·최소 구매액·할인 상한은 두지 않습니다.

발급은 `(user_id, coupon_id)` UNIQUE, 사용은 DB 행 잠금과 결제 트랜잭션으로 보호합니다. 미완료 주문 생성만으로 쿠폰을 소비하지 않습니다. 같은 쿠폰으로 여러 결제를 시도해도 하나만 완료되며 뒤늦은 충돌은 승인 취소 대상입니다. 기존 홈 팝업은 실제 회원가입 흐름으로 연결되고 닫으면 같은 세션에서 다시 표시하지 않습니다.

## 관리자 판매 현황

`/admin`은 오늘 KPI와 최근 7일 차트, `/admin/history`는 최근 7·30·90일 및 직접 기간(최대 3,660일)을 조회합니다. 기존 KPI·차트 컴포넌트를 재사용하며 조회 기간은 URL에 보존합니다. 총 결제금액·주문 수·판매수량·평균 결제금액·일별 추이·카테고리별 수량·기간 내 베스트 상품과 직전 동일 기간 비교를 제공합니다.

관리자 전용 `get_admin_sales_summary(date,date)`가 `orders`, `order_items`, `products.category`를 집계합니다. 한국 시간의 `paid_at`이 기준이며 도입 전 주문은 `created_at`으로 대체하고 화면에 표시합니다. 결제금액은 쿠폰 할인 후 배송비 포함, 베스트 상품금액은 주문 당시 상품 단가 × 수량으로 할인·배송비 배분 전입니다. 매출 없는 날은 0으로 채우고 별도 일별 통계 테이블은 저장하지 않습니다.

## FAQ / 1:1 문의

FAQ는 정적 항목 검색·카테고리를 제공합니다. 문의는 로그인 사용자와 연결해 저장하고 본인만 조회합니다. 관리자 답변은 문의 내역에서 확인합니다. 브랜드 협업 제안은 별도 접수·관리 흐름입니다.

## 테스트

```bash
npm test
npm run lint
npm run build
```

SQL 테스트는 별도 설치된 `@electric-sql/pglite`의 `dist/index.js` 절대 경로를 `PGLITE_MODULE`에 지정하면 실행됩니다. 미설정 시 SQL 테스트는 skip됩니다. 프로젝트 런타임 의존성은 추가하지 않았습니다.

검증 대상: 계정 전환·장바구니 동기화·RLS, 재고 0/1/3·직접 요청, 판매 순위 pending 제외, 리뷰 권한, 쿠폰 서버 계산·원자성·재사용 차단·멱등성, 결제 보상 취소, 구독 동시성·발송 실패, 기존 고객·관리자 기능. 브라우저 기준은 1440/768/390 viewport이며 로컬 테스트와 실제 외부 서비스 검증은 구분합니다.

## 주요 트러블슈팅

- 계정 전환 중 이전 장바구니 응답: 요청 generation과 계정별 직렬 쓰기 큐로 차단합니다.
- RPC 외 직접 재고 초과 쓰기: 테이블 trigger에서도 검증합니다.
- 클라이언트 금액 조작: DB 가격·서버 쿠폰 계산이 최종 금액의 기준입니다.
- 승인 후 DB 실패: 확정 실패는 취소, 불확실한 결과는 재조회·상태 확인으로 처리합니다.
- 배송지 변경 후 과거 주문 변화: 주문 생성 시 배송 snapshot을 저장합니다.
- 직접 URL 새로고침 404: `vercel.json` SPA fallback과 History API parser를 사용합니다.
- 미배포·조회 실패: 오류/재시도 상태를 표시하며 가짜 성공·mock 상품으로 대체하지 않습니다.

## 실행 방법

1. Vite 8을 지원하는 Node.js와 npm을 준비하고 `npm ci`를 실행합니다.
2. `.env.example`을 참고해 `.env.local`에 아래 공개 설정을 입력합니다.

```dotenv
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_TOSS_CLIENT_KEY=
```

3. 연결된 Supabase 프로젝트를 확인하고 migration·Edge Function을 반영합니다. 운영 products seed 전체 재실행은 하지 않습니다.
4. `npm run dev`로 실행합니다. `npm run build` 산출물은 `dist`입니다.

Edge 전용 Secrets: `GEMINI_API_KEY`, `TOSS_SECRET_KEY`(테스트 키). 허용 origin은 `AI_SEARCH_ALLOWED_ORIGINS`, `AI_INSIGHTS_ALLOWED_ORIGINS`, `PAYMENT_ALLOWED_ORIGINS`입니다. 정확한 HTTPS origin을 쉼표로 구분하며 localhost 개발은 별도 허용합니다. Secret 값은 코드·README·브라우저 환경변수에 넣지 않습니다.

## 프로젝트 한계 / 데모 고지

- 포트폴리오·캡스톤용 가상 상품입니다. 가격·재고·영양정보는 실제 상품의 구매 근거가 아닙니다.
- Toss 테스트 결제이며 실제 판매·배송·물류 연동은 없습니다.
- 관리자 KPI·차트·기간별 베스트는 실제 주문 DB 집계입니다. 결제 시각 기록 도입 전 주문의 날짜는 생성일 기준으로 표시합니다.
- AI 설명은 참고 정보입니다. 알레르기 안전·의료적 적합성을 보장하지 않습니다.
- 정기 뉴스레터 캠페인·자동 재발송·고급 쿠폰·회원등급·포인트는 구현 범위에 없습니다.
- 원격 반영 및 실제 가입·Toss 테스트 결제·메일 수신 검증 전에는 전체 개발 종료로 판정하지 않습니다.

제품 이미지는 `public/assets/products/product-NNN-*.webp`에 저장합니다. `npm run dev`와 `npm run build` 실행 전 파일 SHA-256으로 `src/data/product-images.json`을 생성하며, 이미지 URL의 `?v=` 값이 파일 변경 시 갱신됩니다. 개발 환경과 Vercel 운영 빌드는 동일한 이미지 resolver를 사용합니다. 기존 Unsplash URL 또는 같은 로컬 파일 경로는 번들 이미지로 연결하고, 관리자가 별도로 지정한 외부 URL은 유지합니다. 관리자 상품 목록에도 같은 규칙을 적용합니다.

이미지를 교체한 후 파일과 생성된 manifest를 함께 커밋하고 배포하세요. 기존의 `import.meta.env.DEV` 전용 미리보기 때문에 운영에서 DB의 예전 이미지가 나오던 문제를 제거했으므로, 운영 DB에 seed 전체를 다시 실행할 필요가 없습니다.
