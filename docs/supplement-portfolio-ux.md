# 영양제 포트폴리오 UX — 2026-09-07

## 후속 요청 반영

### 광고 이미지 및 영양정보 배치

- 크레아틴/카테킨/바나바의 광고용 제품 사진을 ImageGen으로 각각 생성했다. `public/assets/demo/supplement-900001-photo.webp`, `supplement-900002-photo.webp`, `supplement-900003-photo.webp`를 catalog의 image에 연결하여 카드·상세·장바구니에서 공통 사용한다. 원본 생성 이미지는 보존하고 WebP로 인코딩했다(1254×1254, 약 134~183KB).
- 패키지는 가상 CARE LABS 제품이며 건강 효과나 함량 문구를 이미지에 추가하지 않았다. 기존 SVG는 보존하되 더 이상 기본 상품 이미지로 연결하지 않는다.
- 모든 영양제 상세의 주요 성분 함량과 영양성분을 좌우 두 열로 배치했다. 열량·단백질·탄수화물·지방·당류·나트륨을 오른쪽 열에서 표시하고, 원래 숫자는 그대로 유지한다. 일반 식품 영양정보는 기존 배치를 유지한다.
- 본문 영양제 탐색 안내 문장은 후속 요청에 따라 삭제했다.

사용자가 기존 catalog도 모두 더미 상품이라고 확인하고, 주요 성분 함량이 전부 비어 있는 상품에도 임의의 더미 함량을 채우도록 요청했다. 따라서 아래의 ‘71/79 미등록 유지’ 기록은 이전 상태다.

- 71 멀티비타민: 비타민B군 복합체 25mg, 비타민C 100mg, 비타민D3 10μg, 아연 8.5mg, 셀레늄 55μg.
- 79 옥타코사놀·아르기닌: L-아르기닌 1,000mg, 옥타코사놀함유유지 20mg, 마카추출분말 500mg, 아연 8.5mg. 유지량은 옥타코사놀 활성 성분량을 의미하지 않는다.
- 값은 `supabase/functions/_shared/catalog-demo-actives.js`의 명시적인 mock 데이터다. 상품 ID와 이름이 일치하고 기존 함량이 하나도 없을 때만 적용한다. 기존에 숫자가 있는 상품에는 추가/덮어쓰기를 하지 않는다.
- 브라우저와 서버 공통 성분 해석에 적용하여 상세·카드·비교·장바구니에 같은 값을 사용한다. adapter는 `isDemoIngredientData`로 구분한다. 화면에는 임의 입력 배지나 안내를 추가하지 않는다.
- DB 원본 및 seed는 수정하지 않는다. 현재 catalog 영양제 10종 모두 표시 가능한 주요 성분 함량을 갖는다.
- 비교 AI 요약 아래 상품 상세보기 버튼을 제거했다. 정보 아이콘은 SVG를 사용한 24px 원형 버튼, 연한 녹색 테두리·배경, hover/열림 상태 및 키보드 focus 표시로 마감했다. 기존 tooltip 조작은 유지한다.
- 추가 검증 파일: `tests/catalog-demo-actives.test.mjs`. 기존 원본 보존, 상품 식별 범위, 모든 영양제 함량 표시를 확인한다.
- 후속 UI 요청으로 본문 성분 탐색 칩(전체/비타민·미네랄/오메가3/기타/크레아틴)을 제거했다. 상단 영양제 드롭다운에 기타를 추가하며, 기존 비타민/오메가3/유산균 어느 분류에도 해당하지 않는 상품만 보여준다. 탐색 목적의 기본 정렬과 안내 문구는 유지한다.
- 최종 검증: npm test 209개 중 207 통과, 2 skipped, 실패 0. npm run build 성공(기존 번들 크기 경고). 1440px/790px에서 두 상품의 함량 표시, 상세보기 버튼 제거, 원형 info 버튼 hover/click/tap/키보드/ESC/외부 클릭, 본문 탭 제거 및 상단 기타 분류 모두 통과했다.

이 문서는 이전 `supplement-category-analysis.md`의 ‘함량 미등록 표시’ 정책을 대체한다.

## 사전 확인 및 데이터 현황

- 실제 카테고리: `영양제·비타민`. 화면 메뉴는 `영양제`.
- 저장 위치: `products.main_ingredients` 문자열 배열, 섭취 기준은 `serving_size`. 브라우저 adapter는 `mainIngredients`, `nutrition.servingSize`로 전달한다.
- 기존 읽기 전용 조회 자료를 검토하고, 작업 중 REST GET으로 다시 확인했다. 영양제 10종 중 명시적 함량 등록 8종. 재조회 자료: `tmp/supplement-ux-db-audit.json`.
- 모든 함량이 비어 있는 실제 상품: **71 데일리 올인원 활력 멀티비타민 & 미네랄 60정**, **79 옥타코사놀 아르기닌 맥스 활력환 30포**. 이 상품에는 demo 함량을 넣지 않는다.
- 부분 미등록도 존재한다. 예: 72 비타민E, 73 프락토올리고당, 74 비타민B군, 75 비타민B6염산염, 76 K2/MCT, 78 히알루론산·엘라스틴. 등록되지 않은 값은 추정하지 않는다.
- 기존 추천 점수: 구매 목적별 category 점수 + 식품 영양 점수 + 데이터 신뢰도, 상위 상품군 다양화. 영양제끼리의 정렬에만 목적 연관 성분을 우선하는 tie-break를 추가했다. 일반 식품 산식은 유지한다.
- 비교: 기존 공통 `comparisonPolicy`가 영양제 포함 시 Winner를 차단한다. UI와 서버의 공통 등록 데이터 비교를 유지하고 안내/tooltip을 추가했다.
- 장바구니: 기존 공통 분석이 식품/영양제를 분리하며 식품 영양 평가의 분모에서 영양제를 제외한다. 이 분류를 유지하고 demo cart도 같은 분석에 연결했다.

## 대표 상품과 탐색

현재 DB에는 목적별 성분에 해당하는 대표 상품이 없어 다음 내부 mock 상품을 catalog에 추가한다.

| 목적 | demo ID / 상품명 | 시연용 등록 함량 | 시연 가격 / 기준 |
|---|---|---|---|
| 근육량 증가 | 900001 크레아틴 모노 60회분 | 크레아틴 모노하이드레이트 3,000mg | 24,900원 / 1일 1스푼 |
| 체중 관리 | 900002 카테킨 데일리 60캡슐 | 카테킨 300mg | 19,900원 / 1일 1캡슐 |
| 식단 영양 관리 | 900003 바나바잎 데일리 60정 | 바나바잎 추출물 100mg | 18,900원 / 1일 1정 |

**위 이름·가격·성분·함량·섭취 기준·이미지는 전부 허구의 CareMarket demo 등록 정보다. 실제 브랜드 스펙, 권장 섭취량, 건강 효과를 의미하지 않는다.** 브랜드 표시는 `CARE LABS · DEMO`. 이미지는 프로젝트 내부 SVG 패키지 도안이다.

`appendDemoSupplements`는 같은 ID 또는 같은 목적 연관 성분을 가진 실제 상품이 있으면 해당 demo를 추가하지 않는다. 실제 객체/DB/seed는 수정하지 않는다. 향후 실제 대표 상품이 등록되면 해당 상품이 우선 사용된다.

영양제 탐색은 목적별 성분 가중치를 적용하지 않고 기본 ID 순서를 유지한다. 현재 로드된 영양제에 존재하는 성분 종류만 칩으로 표시한다. 전체, 비타민·미네랄, 오메가3, 크레아틴, 기타 중 실제 catalog에 있는 종류만 나타난다. 홈 안내와 CTA는 성분 비교 / 영양제 전체 보기로 연결한다. 가격 정렬은 사용자의 선택을 그대로 따른다.

## 성분 표시와 비교

- `supplementIngredients`: 등록 문자열 끝의 명시적인 수치/단위만 해석. 원료명과 괄호 설명을 유지하고 제품명/설명에서 함량을 추출하지 않는다.
- `measuredSupplementIngredients`: 명시적 함량이 있는 성분만 반환. null/undefined/빈 문자열/성분명만 있는 행은 상세 및 함량 비교 행에서 제외한다.
- `demoSupplementActives` 및 `withDemoSupplementActives`: `isDemoProduct`이고 기존 등록 함량이 하나도 없을 때만 별도 demo 값을 넣고 `isDemoIngredientData: true`로 표시한다. 실제 상품에는 적용하지 않는다.
- 상세는 주요 성분 함량 → 일반 영양정보·보조 정보 순서. 실제 상품 전체 미등록 시 짧은 안내만 표시하며 빈 성분 박스는 만들지 않는다.
- 오메가3(72)는 등록된 **정제어유 (EPA 및 DHA 함유유지) 1,000mg**만 표시한다. 이를 EPA+DHA 600mg 등으로 바꾸지 않으며 비타민E 행은 숨긴다.
- 카드에는 등록 함량이 있는 주요 성분 최대 2개. 긴 성분도 함량을 읽을 수 있도록 영양제 성분 영역만 줄바꿈한다. 일반 식품 카드/영양표는 유지한다.
- 비교는 가격, 등록 섭취 기준, 주요 성분, 실제 함량 행의 합집합, 알레르기 등을 표시. 없는 비교 값은 `-`.
- 영양제끼리(동일 성분 제품 포함), 식품+영양제 모두 Winner 없음. 일반 식품 비교 흐름은 유지한다.
- 영양제 포함 비교는 Gemini 호출 없이 현재 등록 데이터로 요약한다. 건강 효과·개인별 필요 성분·우열을 추론하지 않는다.
- 비교 아래 작은 info button: hover/click, 키보드 Enter로 열기; 외부 클릭/ESC로 닫기. ESC로 tooltip을 닫을 때 비교 dialog는 유지한다. `aria-label`, `aria-expanded`, `aria-describedby`, `role=tooltip` 연결.

## 장바구니와 실제 주문 분리

- demo 상품은 로그인 세션의 **메모리 장바구니**에만 추가한다. 수량 변경과 삭제도 메모리에서 처리하며 상품/장바구니/찜/주문 DB에 demo ID를 전송하지 않는다.
- 새로고침 또는 계정 변경 시 demo 장바구니는 초기화된다. 실제 장바구니 동작은 유지한다.
- 영양제가 포함된 장바구니는 현재 화면 데이터의 공통 규칙으로 분석하여 이전 AI 응답이나 서버 cart에 없는 demo 상품의 누락을 방지한다.
- 식품은 직접 관련 상품, 영양제는 보조 영양 상품으로 구분. 영양제 탐색은 영양제 구성/주요 성분 중심. 영양제에는 고단백·저당·저열량 판정을 적용하지 않는다.
- demo 상품 포함 시 실제 주문 이동 및 Checkout의 주문 생성 호출을 차단한다. 시연용 상품을 제외하면 기존 주문 흐름을 사용할 수 있다.

## 이번 작업의 수정/추가 파일

- `supabase/functions/_shared/product-type.js`
- `src/data/demo-supplements.js` (신규)
- `src/lib/products.js`, `src/lib/catalog.js`
- `src/components/SupplementIngredients.jsx`, `GoalBadge.jsx`, `ProductCard.jsx`, `ProductComparisonModal.jsx`, `CartAiInsight.jsx`
- `src/components/SupplementComparisonNotice.jsx` (신규)
- `src/pages/AllProducts.jsx`, `Home.jsx`, `ProductDetail.jsx`, `Checkout.jsx`
- `src/StoreProvider.jsx`, `src/index.css`
- `public/assets/demo/supplement-900001.svg`, `supplement-900002.svg`, `supplement-900003.svg` (신규)
- `tests/supplement-analysis.test.mjs`, `tests/supplement-ui.browser.mjs`, `tests/supplement-demo.test.mjs` (신규)
- 이 문서. `tmp/`에는 읽기 전용 감사 스크립트/자료, 실행 로그와 화면 캡처가 있다.

## 검증 및 변경 범위

- `npm test`: 206개 중 204 통과, 2 skipped, 실패 없음.
- `npm run build`: 성공. 번들 500KB 경고는 남아 있다.
- 브라우저: HTTP fixtures 기반 1440px/790px 상세 7종, 네 목적별 catalog 정렬, 전체 탐색/성분 필터, 비교 Winner 차단, info hover/click/790px tap/키보드/ESC/외부 클릭 모두 통과. demo 3종 장바구니 분석과 실제 주문 차단도 통과했다. page error 0. 테스트 상품 999는 비교 검증 전용이며 실제 상품이 아니다.
- 기존 페이지 폭/breakpoint 유지. 주요 컨테이너 가로 넘침과 브라우저 page error 검사.
- **DB 변경/마이그레이션/seed 변경 없음. 실제 상품 함량 덮어쓰기 없음. 배포/commit/push 없음.** 작업 시작 전 미커밋 변경은 보존했다.
