# CareMarket — 맞춤형 웰빙 건강식품 쇼핑몰 (프론트엔드 프로토타입)

React + Vite + JavaScript 기반의 UI/UX 프로토타입입니다.
**모든 데이터는 목업(mock)** 이며 Supabase · 실제 로그인 · DB · Gemini API · Toss Payments는 연결하지 않습니다.
결제·주문은 화면상에서만 동작하는 가상 흐름입니다.

## 실행

```bash
npm install
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드
npm run lint     # oxlint
```

상단 검정 데모 바에서 10개 화면을 자유롭게 이동할 수 있습니다 (발표용).

## 사용자 흐름

회원가입 → 로그인 → 구입 목적 설정 → 보조 조건 설정 → 상품 목록 → 상품 상세 → 장바구니 → 주문내역

- **구입 목적(4)**: 근육량 증가 · 체중 관리 · 식단 영양 관리 · 영양제 탐색
- **보조 조건(5)**: 저당 · 저염 · 고단백 · 카페인 제외 · 알레르기 제외
- **핵심 인터랙션**: 선택한 목적에 따라 상품 카드에서 **강조되는 영양 지표가 실시간으로 바뀝니다**
  (예: 근육량 → 순수 단백질, 체중 관리 → 열량·당류, 식단 관리 → 나트륨, 영양제 → 핵심 활성성분).

## 화면 (10)

1. 메인 상품 목록  2. 로그인  3. 회원가입  4. 건강 목표 설정  5. 상품 상세
6. 장바구니  7. 마이페이지  8. 주문내역  9. 관리자 상품관리  10. 관리자 주문관리

## 디자인

흰색/웜 페이퍼 배경 위 절제된 포레스트·세이지 포인트 컬러, 과한 그라데이션 배제,
Fraunces(세리프) + Pretendard(본문) 조합의 에디토리얼 웰빙 톤. PC 중심 · 모바일 반응형.

## 구조

```
src/
  main.jsx / App.jsx        진입점 · 뷰 라우팅(상태 기반)
  store.jsx                 컨텍스트 + 훅 (useStore, useAutoSlide)
  StoreProvider.jsx         전역 상태/액션 프로바이더
  data/mock.js              목업 데이터 (상품·목표·필터·주문·루틴)
  lib/format.js             원화/할인율 포매터
  components/               Header · Footer · DemoNav · ProductCard · GoalBadge · CartDrawer · Toast · Icon …
  pages/                    Home · GoalSetup · ProductDetail · Cart · Orders · MyPage · Login · Register · AdminProducts · AdminOrders
```

상품 이미지는 Unsplash를 사용하며, 로딩 실패 시 세이지 톤 플레이스홀더로 자연스럽게 대체됩니다.
