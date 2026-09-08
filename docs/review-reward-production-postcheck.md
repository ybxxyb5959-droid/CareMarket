# 운영 리뷰 보상 사후 검증 — 2026-09-08

운영 프로젝트: owxgtzepynkwdixmwhim, main PRODUCTION. 로그인된 Supabase SQL Editor에서 SELECT만 실행했다. 운영 주문/리뷰/쿠폰 생성, 수정, 삭제, migration 재실행, commit/push/배포는 수행하지 않았다. 이번 차수의 산출물은 이 검증 문서뿐이며 애플리케이션 코드와 SQL 수정 없음.

## 실제 적용 상태

review_reward_accounts(user_id uuid PRIMARY KEY, claimed_at timestamptz NOT NULL DEFAULT now()) 존재. user_id는 profiles FK. RLS 활성. authenticated/anon 직접 DML 권한 없음.

user_coupons_first_purchase_review_guard는 BEFORE INSERT이며 enabled=O. 기존 profile_welcome_coupon, orders_record_paid_at, reviews_updated trigger도 enabled=O.

reviews_order_item_id_key, reviews_user_request_unique, reviews_public_product_created_idx, review_reward_accounts_pkey, user_coupons_welcome_once, user_coupons_review_order_once 및 주문 인덱스 존재. 관련 invalid constraint/index 모두 0개.

migration 이력에는 20260906000700, 20260906001000, 20260907000100이 존재하지만 20260908000100 행은 없다. SQL Editor 수동 적용은 실제 스키마에 반영됐으며, 이력 기록과 별개다. 전체 db push 또는 이번 SQL 재실행을 해서는 안 된다. 향후 배포 전에 기존 migration 이력 관리 절차로 applied 상태만 별도 동기화해야 한다(이번 검증에서 미실행).

## 운영 함수와 로컬 정의 비교

pg_proc.prosrc의 공백을 제거한 MD5를 로컬 최신 migration의 본문과 비교해 아래 10개 모두 일치했다. 이것은 실제 운영 함수 조회 결과이며 파일 존재만으로 적용을 추정한 것이 아니다.

| 함수 | 운영/로컬 MD5 |
|---|---|
| guard_first_purchase_review_reward | 01bf634e4055b944ab817dab17475d78 |
| get_my_review_items | 507fbbb65dd3131fac9f2ff1da81e51a |
| submit_order_item_review | 7872f522463c71e687d0bc2c16d4f863 |
| issue_welcome_coupon | 3726e2ee82f3eaa47f949d1d10997970 |
| create_coupon_checkout_order | 88391d08bbc17b2e0f59b5204c0f564c |
| complete_paid_order_with_inventory | 55a7b8d960e182836b4f7dc14c1e81f8 |
| complete_paid_order | eaacb3710aa44e684f1769793cdb3f1e |
| record_order_paid_at | 06c6876f338d1b4042cff5f7251d1782 |
| get_public_product_reviews | 449c177002f879db07dcde0f5b835f88 |
| get_product_review_summary | 367917c3af442c1b29dfaeb44354cc14 |

인증 필요 RPC는 authenticated에, 결제 확정 RPC는 service_role에 실행 권한이 있다. 관련 SECURITY DEFINER 함수의 search_path는 빈 값이다. 원본 함수 조회에서 이 권한도 확인했다.

## 첫 구매 판정

실제 orders_status_check 값은 pending, paid, preparing, shipped, delivered뿐이다. 첫 구매 후보는 paid/preparing/shipped/delivered이고, coalesce(paid_at, created_at), order_id 순서의 첫 행이다. 배송완료 순서가 아니다.

정상 신규 결제는 로컬 confirm-payment handler가 Toss 응답의 주문번호/결제키/금액을 확인하고 status=DONE일 때만 서버 확정 RPC를 호출한다. 운영의 확인된 RPC는 원자적으로 결제·재고·쿠폰 사용을 처리한 뒤 paid에서 preparing으로 진행한다. 운영 orders_record_paid_at은 pending → paid/preparing이고 payment_key가 있을 때 결제 확정 시각을 기록한다. 실패·취소·미확정 결제 시도는 pending에 남으므로 첫 구매에서 제외된다. 별도의 failed/cancelled 상태를 가정하지 않았다. 배포된 Edge Function 소스 자체는 이 차수에서 다운로드해 비교하지 않았으며 handler 설명은 로컬 코드 기준이다.

과거 정상 주문 3건은 paid_at=null이므로 생성시각으로 대체한다. 해당 계정은 3개이고 현재 정상 구매가 여러 개인 계정은 0개라 현재 데이터의 주문 간 순서 충돌은 없다. 다만 과거의 실제 결제 시각을 이 DB만으로 증명할 수는 없다. 근거 없는 timestamp 보정은 하지 않았다.

## 보상과 중복 방지

첫 구매 주문 배송완료 + 최초 리뷰만 10%, 계정당 한 번이다. 별점 1~5점 동일. 모든 배송완료 주문의 상품은 리뷰 작성 가능하며 보상 eligibility와 분리되어 있다.

기존 submit RPC의 order/item FOR UPDATE 잠금, order_item_id UNIQUE, user_id/request_id UNIQUE를 유지한다. INSERT trigger가 최초 구매/배송완료/첫 리뷰를 확인하고 review_reward_accounts.user_id PK를 INSERT ON CONFLICT DO NOTHING으로 선점한다. 지급 기록과 쿠폰은 같은 RPC transaction에 속한다. 응답 유실·RPC 재시도와 여러 상품 요청에서도 두 번째 지급을 차단한다. 실제 복수 PostgreSQL 연결의 잠금 경쟁은 이번 read-only 운영 검증에서 재현하지 않았다.

신규가입은 source=welcome/coupon_id=welcome20, 리뷰는 source=review_reward/coupon_id=review10으로 CHECK constraint가 분리한다. welcome UNIQUE는 welcome 행만 대상이므로 한 계정이 두 쿠폰을 함께 보유할 수 있다. 로컬 격리 DB에서 이를 확인했다. 현재 운영에서 실제 두 종류 모두 보유한 계정은 0개이며, 이를 정상 실운영 사례가 있다고 과장하지 않았다.

## 운영 데이터 집계

- orders 24개: pending 20 / paid 1 / preparing 1 / delivered 2.
- reviews 1개(공개 1개).
- user_coupons 5개: welcome 4 / review_reward 1. welcome 사용 완료 1개.
- review_reward_accounts 1개, 기존 review_reward 1개와 일치.
- welcome/review 계정별 중복, 지급 기록 누락, 지급 기록만 있고 쿠폰 없음, review 고아 참조, 소유자 불일치, 사용시각/사용주문 불일치: 모두 0.
- 현재 리뷰 쿠폰의 주문은 현재 판정된 첫 구매에 해당. 리뷰와 쿠폰 연결 누락 0.
- 쿠폰 이름/율: 신규가입 20% 할인 / 20, 첫 구매 리뷰 감사 10% 할인 / 10.
- 운영 공개 RPC: 상품 71 → count=1, average=4.0. 후기 없는 상품 → count=0, average=null.

적용 직전의 전체 데이터 snapshot은 제공되지 않았다. 따라서 기존 리뷰 본문/주문 상태/user_coupons가 전후 바이트 단위로 같다고 증명할 수는 없다. 적용 SQL에는 reviews/orders의 INSERT/UPDATE/DELETE가 없고 user_coupons 발급도 없으며, 기존 지급 이력을 account 기록에 복사할 뿐이다. 현재 무결성 SELECT와 로컬 과거 데이터 보존 테스트에서 이상은 발견되지 않았다.

## 발견된 실제 문제: 운영 프런트가 이전 버전

[운영 사이트](https://caremarket.vercel.app/)의 HTML이 가리키는 JS는 /assets/index-B3WiFs_h.js였다. 공개 파일을 GET으로 읽어 확인했고 동일 Supabase 프로젝트 참조도 확인했다.

- CheckoutSummary에 '신규회원 20% 할인' 하드코딩이 남아 있다. DB 율/서버 계산은 맞지만 리뷰 쿠폰 선택 시 표시가 다를 수 있다.
- ProductReviews에서 실제 count M에 샘플 count C를 더하는 N=C+M과 가중 평균 계산이 남아 있다.
- Orders의 주문/리뷰 조회를 묶은 기존 실패 처리가 남아 있다.
- 리뷰 안내가 '이 주문의 첫 리뷰'이며 계정 기준 보상 안내가 반영되지 않았다.

로컬 작업본에는 이 수정이 이미 존재하고 테스트도 통과한다. 최소 해결은 기존 수정본의 검토·배포이며, 동일 코드를 다시 고치거나 UI를 수정할 필요가 없다. 사용자의 자동 배포 금지에 따라 배포하지 않았다.

## 검증 결과와 다음 확인

전체 npm test를 PGLITE_MODULE 지정 후 실행: 248 통과, 실패 0, skip 0. 별도 임시 로컬 DB 실행에서 기존 계약 테스트와 세 번째 주문 무보상, 새 계정 별점 5점 첫 리뷰 보상을 포함해 17 통과. 운영 함수 지문이 일치하는 로컬 SQL로 검증했으며 운영 테스트 데이터는 생성하지 않았다.

A 첫 구매 첫 리뷰 지급 / B 같은 주문 추가 리뷰 미지급 / C 두 번째 주문 미지급 / D 세 번째 주문 미지급 / E 두 번째 주문에 먼저 리뷰 작성해도 미지급 / F 별점 1점 지급 / G 별점 5점 지급을 로컬에서 확인했다.

배포 후 브라우저 E2E: 신규 계정 welcome20 한 장 → 두 주문 중 먼저 결제된 주문이 나중에 배송되어도 첫 구매 유지 → 둘째 주문 선리뷰 무보상 → 첫 구매 리뷰(1점/5점 각각 별도 계정) reward10 한 장 → 추가 상품/셋째 주문/재시도/두 탭 중복 차단 → 두 쿠폰의 명칭·할인금액·최종금액 → 실제 후기만 집계 → 리뷰 요청 실패에도 주문 표시.

결론: DB 보상 핵심 구조는 적용되어 테스트할 수 있으나, 현재 공개 서비스 전체가 요청한 표시/동작 정합성을 충족한 상태인가에 대한 답은 NO. 기존 프런트 수정본 배포가 필요하다. 추가 비즈니스 migration은 필요하지 않으며, migration 이력 동기화와 과거 paid_at의 검증 한계는 별도 관리한다.

UI/CSS/레이아웃 변경 없음.
