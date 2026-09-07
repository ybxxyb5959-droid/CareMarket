# 상품 유형별 영양 표시·비교·장바구니 분석

> 후속 변경: [영양제 포트폴리오 UX](./supplement-portfolio-ux.md)를 참고하세요. 아래는 이전 작업 기록이며, ‘함량 미등록’ 표시 정책은 폐기했습니다. 현재는 함량이 있는 행만 표시하고 별도 demo catalog 및 비교 안내 tooltip을 사용합니다.

## 확인한 데이터

2026-09-07 Supabase REST의 `products`를 읽기 전용 조회하여 영양제 10개를 확인했다.
카테고리는 `영양제·비타민`, 원재료는 `main_ingredients text[]`, 섭취 기준은 `serving_size text`이다.
별도 활성 성분 함량 컬럼은 없다. 조회 결과는 로컬 `tmp/supplement-db-audit.json`에 보관했다.

| 상품 ID | 실제 등록 내용 | 표시 한계 |
|---|---|---|
| 71 멀티비타민 | 비타민B군 복합체, 비타민C, 비타민D3, 아연, 셀레늄 | 개별 함량 미등록 |
| 72 오메가3 | 정제어유 (EPA 및 DHA 함유유지 1,000mg), 비타민E | 유지량을 EPA+DHA 합계 또는 각각의 함량으로 해석하지 않음 |
| 75 마그네슘 | 쌀발효마그네슘 315mg, 비타민B6염산염 | 원료명을 마그네슘 원소량으로 단순화하지 않음 |
| 76 비타민D | 스위스산 비타민D3오일 4000IU 등 | 원료명과 IU 보존, μg 변환 없음 |

DB·seed 데이터는 변경하지 않았다. 현재 등록 문자열 끝에 명시된 함량만 분리하고,
원료명·복합체·괄호 설명·단위를 보존한다. 숫자가 없는 성분은 함량 미등록,
상품에 성분 자체가 없으면 비교표에서 `-`를 표시한다. 상품명/요약에서 함량을 추출하지 않는다.

개별 함량을 정밀하게 비교하려면 향후 `supplement_facts` 같은 JSONB 필드에
`basis`, `serving`, `ingredients: [{ key, name, amount, unit }]`를 저장하는 최소 확장을 검토할 수 있다.
원료량과 활성 성분량은 별도 key가 필요하다. 확인된 라벨 자료를 바탕으로 입력해야 하며,
이번 작업에서 migration이나 임의 데이터 입력은 하지 않았다.

## 이번 작업에서 수정/추가한 파일

- `src/components/SupplementIngredients.jsx` — 신규 상세 성분 표
- `src/components/ProductComparisonModal.jsx` — 유형별 행, Winner 차단, CTA, 기본 비교
- `src/components/CartAiInsight.jsx` — 그룹별 표시, 주요 성분, API 실패 시 기본 분석
- `src/components/CartDrawer.jsx` — 영양제의 식품 영양 강조 제거
- `src/components/GoalBadge.jsx` — 영양제를 보조 영양 상품/주요 성분으로 표시
- `src/pages/ProductDetail.jsx` — 주요 성분 우선, 일반 식품 기존 표 유지
- `src/pages/Cart.jsx` — 영양제 목록도 성분 중심 표시
- `src/data/mock.js` — 영양제 category 상수를 서버 공통 모듈에서 사용
- `src/lib/nutrition.js` — 식품 합계에서 영양제 제외
- `src/index.css` — 장바구니 그룹 제목 여백만 추가
- `supabase/functions/_shared/product-type.js` — 공통 분기·파싱·동적 행·비교 정책
- `supabase/functions/_shared/cart-nutrition-analysis.js` — 식품/영양제 판정과 분모 분리
- `supabase/functions/_shared/ai-insights-contract.js` — null recommendation 허용
- `supabase/functions/ai-insights/handler.js` — 영양제는 확정된 데이터로 응답, Winner 강제 지시 제거
- `tests/supplement-analysis.test.mjs` — 데이터·비교·장바구니·서버 회귀 테스트
- `tests/supplement-ui.browser.mjs` — 1440/790 브라우저 시나리오
- `docs/supplement-category-analysis.md` — 이 보고서

기존 미커밋 변경은 보존했다. commit/push와 배포는 수행하지 않았다.

## 정책

일반 식품 표는 그대로 유지한다. 영양제 상세는 등록된 주요 성분 6개를 먼저 표시하고,
추가 성분은 전체 성분 보기로 펼친다. 그 아래에 기존 일반 영양정보를 보조로 표시한다.
비교표는 양쪽 성분 key의 합집합을 사용한다. 공백·대소문자·Unicode 표기만 정규화하고,
다른 원료명을 같은 영양소라고 추정해 합치지 않는다.

동일한 등록 성분 key 구성을 가진 영양제만 직접 비교 가능으로 분류한다.
공통 부원료 하나만으로 유사 제품으로 판정하지 않는다. 동일 제품군도 단일 Winner 대신
함량/가격 우선 조건을 설명한다. 식품 목표에서 영양제만 비교하면 직접 관련성 낮음,
혼합 유형 또는 서로 다른 성분 구성은 역할 다름으로 처리한다. 성분 자료가 없으면
구성의 차이 자체도 단정하지 않는다.

영양제가 포함된 비교/장바구니는 서버 코드가 등록 사실로 문장을 구성하고 Gemini를 호출하지 않는다.
일반 식품 Gemini 호출은 유지하되 추천을 반드시 선택하지 않도록 하고 null을 허용한다.
UI에서도 영양제 비교에는 이전 서버가 보낸 Winner와 생성 문장을 표시하지 않는다.
AI 실패 시 브라우저 공통 규칙으로 비교/장바구니 결과를 표시한다.
서버 변경을 운영에 적용하려면 추후 `ai-insights` Edge Function 배포가 필요하다.

장바구니는 영양제를 보조 영양 상품으로 분리하며 영양제 탐색에서는 영양제 구성을 먼저 표시한다.
식품 기준의 분모와 단백질 보완 대상에서 영양제를 제외한다. 실제 알레르기/카페인 조건은 유지한다.
성분 정보가 바뀌면 분석 캐시가 갱신되도록 서명에 포함하고 분석 버전을 올렸다.

## 검증

- 닭가슴살 상세 기존 영양 표 유지
- 멀티비타민 상세 성분명/함량 미등록 표시, 일반 영양정보는 보조
- 오메가3 실제 EPA 및 DHA 함유유지 표시, 개별 함량 추정 없음
- 멀티비타민 vs 오메가3 Winner 없음
- 마그네슘 A/B 동일 성분의 315mg/200mg 동적 행 검증
  (B는 테스트 전용 fixture이며 실제 DB에 존재하는 두 번째 상품으로 보고하지 않음)
- 식품 vs 영양제 역할 차이 설명, Winner 없음
- 근육량 증가 장바구니 직접 관련 식품/보조 영양 상품 분리
- 영양제 탐색 장바구니 주요 성분 중심 표시
- 서버 키 미설정, API 실패, 이전 AI의 잘못된 Winner 응답에 대한 기본 결과 확인
- 1440px/790px 상세·비교·장바구니 가로 넘침 및 브라우저 오류 검사

기존 breakpoint와 페이지 폭은 변경하지 않았다. 운영 DB 정량값이 부족한 시나리오는
표시 불가능 상태를 검증했으며, 실제 함량이 완비된 것으로 간주하지 않는다.
