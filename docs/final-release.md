# CareMarket 최종 마감 기록 · 2026-09-06

## 후속 보완 완료 · 베스트 / 쿠폰 / 관리자 판매 현황

아래의 최초 사전 점검 기록 이후, 이번 작업에서 운영 DB의 실제 스키마를 다시 확인하고 다음을 반영했습니다.

- `20260906000500_best_products`: 기존 SQL 그대로 반영. 공개 RPC 200 및 판매 상품 표시 확인.
- `20260905000600_order_fulfillment_bulk`, `20260906000700_welcome_coupon`: 필요한 선행 wrapper와 쿠폰 테이블·정책·가입/결제 함수를 하나의 트랜잭션으로 반영.
- `confirm-payment`: 기존 배포본과 비교 후 쿠폰 충돌 보상 취소 변경만 배포. Secret과 JWT 설정 유지.
- `20260906001000_admin_sales_analytics`: `orders.paid_at`, 최초 결제 완료 시각 기록 trigger, 기간 인덱스, 관리자 전용 집계 RPC. 기존 주문의 시각은 조작/소급 입력하지 않음.
- 관리자 차트 목업 제거. `/admin/history`에 7·30·90일/직접 기간, KPI·일별 차트·카테고리·베스트·직전 기간 비교. 새로고침 기간 유지, 빈 기간 0원, 날짜 글자 검은색.
- 쿠폰 UI: 보유 쿠폰 상세 목록, 사용 상태·발급/사용일, 주문서 선택·적용·적용 취소. 빈 목록의 가입 안내 제거.
- 신규회원의 마이페이지/주문서 새로고침을 맞춤 상품 화면으로 가로채던 초기 진입 조건과 관리자 history 경로 복원 보완.
- 동일 회원의 세션 갱신 때 재조회 없이 profileLoading만 true가 되던 문제 수정. 회원이 바뀔 때만 초기 로딩을 설정하고 회귀 테스트 추가.

이번 수정 파일: `src/App.jsx`, `src/StoreProvider.jsx`, `src/components/AdminTopbar.jsx`, `src/components/MyCoupons.jsx`, `src/pages/AdminDashboard.jsx`, `src/lib/admin.js`, `src/lib/admin-dashboard.js`, `src/lib/navigation.js`, `src/lib/payments.js`, `src/index.css`, `supabase/migrations/20260906001000_admin_sales_analytics.sql`, `tests/admin-access.test.mjs`, `tests/admin-dashboard.test.mjs`, `tests/final-features-sql.test.mjs`, `README.md`, `docs/final-release.md`. 베스트·출고·쿠폰 기존 migration과 기존 결제 handler 변경은 재사용하여 배포했습니다. 작업 시작 전 변경사항과 동시 진행된 상품 별점 변경은 이 목록에서 제외했습니다.

검증:

- 실제 공개 회원가입 1회 → 쿠폰 1장 → 새로고침 후 마이페이지 → 주문서 적용/취소 → 사용자 카드 인증 → Toss 테스트 결제 4,440원 성공 → 사용 완료 확인.
- 상품 1,800원 − 할인 360원 + 배송비 3,000원. 취소 시 4,800원 복원. 서버의 사용 쿠폰 재요청은 `CHECKOUT_COUPON_UNAVAILABLE`로 차단.
- 테스트 완료 주문 `cm_1e27417af1a841ec8ded8f87639bd144`: `preparing`, 결제 시각 저장. 테스트용 가입 계정 `caremarket-verify-1788680354427@example.invalid`과 테스트 주문은 검증 기록으로 남김. 실제 청구는 없음. 해당 계정에 미완료 테스트 주문 1건도 있으며 매출 집계에서 제외됨.
- 실제 관리자 화면: 오늘 매출 4,800 → 9,240원, 최근 30일 매출 67,800 → 72,240원, 주문 3 → 4건, 수량 4 → 5개. 카테고리와 상품 순위도 증가 확인.
- 실제 관리자 7/30/90일·직접 기간·빈 기간·새로고침·상품/주문 관리 조회 확인.
- 운영 DB 롤백 테스트: 쿠폰 중복 발급/사용·미결제 미사용·재고/사용 원자성·멱등성, 기간/권한/한국 날짜/결제 시각 집계. 베스트는 동일 함수 SQL과 격리된 임시 테이블로 빈 상태·미결제 제외·판매순 확인. 검증용 SQL 변경은 모두 롤백.
- `npm test`: 162 통과, 실패 0, 기존 선택적 PGlite 2개 skip(런타임 미지정). SQL은 위 실제 DB 롤백 검증으로 별도 확인.
- lint 오류 없음(기존 경고 6개), Vite build 성공(기존 번들 크기 경고).
- Git commit/push와 Vercel 프론트엔드 재배포는 수행하지 않음. 원래 미반영되어 있던 리뷰/재고 등 이번 범위 밖 migration은 적용하지 않음.

이하 내용은 최초 작업 시점의 이력입니다. 베스트·쿠폰·관리자 차트 상태는 위 후속 기록을 기준으로 합니다.

Production: https://caremarket.vercel.app/  
연결 Supabase project ref: `owxgtzepynkwdixmwhim`

## 구현 상태

STEP 1~7 로컬 구현 및 README 최신화 완료. STEP 9의 로컬 검증은 통과했지만 원격 반영·외부 서비스 E2E는 대기 중입니다. 아직 “CareMarket 신규 기능 개발 완료”로 판정하지 않습니다.

- 재고 상한: UI·cart RPC 및 직접 테이블 쓰기에 적용
- 베스트·신상품: 실제 주문 수량 집계 / 기존 등록 시각
- 리뷰: 완료 구매 인증·본인 CRUD·별점·리뷰 수
- 쿠폰: 신규 프로필 자동 발급·서버 할인·원자적 사용
- 이벤트: 기존 팝업 재사용·회원가입 연결·세션 닫기
- 미사용 UI·mock 배열·stale browser fixture 최소 정리

## 원격 사전 점검

읽기 전용 CLI 확인 결과:

- `ai-search`, `ai-insights`, `confirm-payment`는 ACTIVE.
- 신규 migration `20260906000400`~`20260906000700` 미반영.
- 과거 migration `20260905000200`, `20260905000300`, `20260905000500`, `20260905000600`, `20260905000700`, `20260906000300`도 원격 적용 이력에 없음.
- 스키마 대조 결과 연락처·약관 컬럼/가입 trigger, `email_exists`, wishlist 테이블·RLS는 존재. 이력만 보고 재실행하지 않음.
- `complete_paid_order_with_inventory`, `admin_bulk_ship_orders`는 실제 원격에도 없음. `20260905000600_order_fulfillment_bulk.sql` 선행 반영이 필요. 신규 쿠폰 migration은 해당 선행 함수가 없으면 중단하도록 방어.
- 과거 profile backfill·이미지 변경의 개별 데이터 적용 여부는 조회하지 않음. 기존 데이터 재실행·덮어쓰기 대상에서 제외.
- `db push --include-all`, migration repair, products seed 재실행을 하지 않음.

## 반영 순서

1. 확인된 미반영 출고 migration `20260905000600`만 선행 반영. 이미 존재하는 스키마와 과거 데이터 migration은 재실행하지 않음.
2. `confirm-payment`의 쿠폰 충돌 보상 취소 코드 배포 후 쿠폰 SQL 반영.
3. 신규 migration 4개를 순서대로 반영. 쿠폰 SQL은 기존 `complete_paid_order_with_inventory`와 출고 wrapper가 존재해야 함.
4. 프론트엔드 배포 후 기존/신규 기능 회귀 확인.

결제 관련 DB·Function 변경, Secret 입력·외부 계정 설정은 사용자 확인 후 실행합니다. 자동 git commit/push는 하지 않습니다.

## 검증 기록

- 로컬 PGlite 포함 `npm test`: 176개 통과, skip 0.
- 동시 판매로 재고가 줄어 수량 변경이 거절되면 장바구니를 다시 조회해 최신 재고와 수량 버튼 상태를 반영. 회귀 테스트 통과.
- `npm run lint`: 오류 없음. 기존 React 경고 6건.
- `npm run build`: 통과. 기존 번들 500 kB 경고.
- 이벤트 CTA → 회원가입, 동일 세션 재노출 방지: 브라우저 확인.
- 1440/768/390: 신상품 100개 실데이터 로딩 및 상세 화면 가로 넘침 없음. 베스트·리뷰 DB 미반영 시 오류/재시도 상태 확인.
- FAQ·장바구니 빈 상태·마이페이지 로그인 안내·협업 제안 폼의 공개 화면을 세 viewport에서 확인.

| 최종 Flow | 현재 검증 | 남은 검증 |
| --- | --- | --- |
| 가입 → 쿠폰 | 실제 SQL 가입 trigger·중복 발급 차단 | 원격 Auth 가입·쿠폰 조회 |
| 상품·리뷰·장바구니 | 실상품 공개 UI·SQL 리뷰 RLS·재고/RPC 테스트 | 로그인 UI의 CRUD 연결 |
| AI·쿠폰·결제·주문 | 기존 AI 테스트·쿠폰/일반 결제 SQL·Toss handler 멱등/보상 취소 | 실제 Toss 테스트 승인·주문내역 |
| FAQ·문의·관리자 답변 | 공개 FAQ 및 기존 문의/관리자 테스트 | 인증된 고객↔관리자 왕복 |
| 관리자·협업 제안 | 기존 관리 테스트·공개 제안 폼 | 실제 관리자 출고·답변·제안 확인 |

## 알려진 제한

- 기존 회원 쿠폰 소급 발급 없음.
- 기존 관리자 차트의 UI sample 데이터는 유지.
- SQL 테스트는 `PGLITE_MODULE` 환경변수 미설정 시 skip되므로 최종 검증 시 명시해야 함.

## 구독 기능 제거 · 2026-09-06

사용자 요청으로 홈 구독 배너, 전용 코드·스타일·테스트를 제거했습니다. Production 구독 Function, 전용 테이블과 테스트 데이터, 이번 작업에서 추가한 Resend Secret 두 항목도 삭제했습니다. 적용된 생성 migration과 삭제 migration은 DB 이력 일관성을 위해 유지합니다.

제거 후 테스트 171개 통과(skip 0), 빌드 성공, lint 오류 없음(기존 경고 6개). localhost 메인페이지에서 배너 제거 확인. 프론트엔드 Production 재배포는 수행하지 않았습니다.
