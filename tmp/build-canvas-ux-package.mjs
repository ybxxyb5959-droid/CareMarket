import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const root = process.cwd()
const out = path.join(root, 'docs/canvas-ux')
const entries = []
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replaceAll('\r\n', '\n')
function entry(file, purpose, regions = null) {
  const source = read(file)
  const regionsResolved = (regions || [[null, null]]).map(([start, end]) => {
    const a = start === null ? 0 : source.indexOf(start)
    const b = end === null ? source.length : source.indexOf(end, a + (start?.length || 0))
    if (a < 0 || b < 0 || b <= a) throw new Error(`Missing region in ${file}: ${start} / ${end}`)
    const first = source.slice(0, a).split('\n').length
    const text = source.slice(a, b).trimEnd()
    if (/\.from\(|\.rpc\(|\.auth\.|import\.meta\.env/.test(text)) throw new Error(`Data implementation in excerpt: ${file}`)
    return { first, last: first + text.split('\n').length - 1, text }
  })
  entries.push({ file, purpose, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex'), regions: regionsResolved })
}
entry('src/main.jsx', '앱 mount와 스타일 연결')
entry('src/App.jsx', '전체 view 매핑과 인증·OAuth·관리자 Shell 분기')
entry('src/lib/navigation.js', 'route 해석과 URL 생성')
entry('src/store.jsx', '공통 context와 히어로 자동 전환')
entry('src/StoreProvider.jsx', '전역 상태·라우팅·AI 검색·담기·주문 진입. 인증·DB 저장 구현 제외', [
  ['  const [view, setView]', '  // 토스트'],
  ['  const rememberScroll =', '  const toggleWish ='],
  ['  const requireCartLogin =', '  const saveWellnessSettings ='],
])
entry('src/components/Header.jsx', '검색 초안/확정·자동완성·AI 모드·회원 메뉴·모바일 검색', [['const AI_SEARCH_EXAMPLES', null]])
entry('src/components/Footer.jsx', '서비스 링크와 홈 내부 스크롤')
entry('src/pages/Home.jsx', '히어로·목적 체험·추천·콘텐츠 진입')
entry('src/pages/AllProducts.jsx', '빠른 조건·알레르기 OFF·AI 상태·비교 선택', [['const AI_EXAMPLES', null]])
entry('src/pages/ProductCollection.jsx', '컬렉션 상태·알레르기 토글·목록. 데이터 조회 effect 제외', [
  ['export default function', '  useEffect(() =>'],
  ['  const visibleProducts =', null],
])
entry('src/pages/CustomShop.jsx', '목적 없음과 맞춤 추천 행의 분기')
entry('src/pages/GoalSetup.jsx', '목적 1개·조건/성분 다중 선택·저장 CTA')
entry('src/components/ProductCard.jsx', '상세 진입·찜·담기·비교')
entry('src/components/GoalBadge.jsx', '목적 영양 강조와 개인 알레르기 배지')
entry('src/pages/ProductDetail.jsx', '수량·예상금액·알레르기 경고·정보 탭·모바일 CTA')
entry('src/components/CartDrawer.jsx', 'Drawer 표시·닫기·수량·경고·주문')
entry('src/pages/Cart.jsx', '낙관적 수량·전체금액·접힘·AI 분석')
entry('src/components/CartAiInsight.jsx', '기본 분석/AI 요청/캐시/변경 상태와 상세·compact UI. 분석 함수 자체는 제외', [['const INITIAL_ANALYSIS', null]])
entry('src/components/ProductComparisonModal.jsx', '모달 생명주기·실제 수치표·AI 비교·실패 상태')
entry('src/pages/Checkout.jsx', '배송지·쿠폰·금액 변경 확인·결제 흐름; 서비스 호출은 인터페이스 참조', [['export default function Checkout', null]])
entry('src/components/checkout/CheckoutOrderItems.jsx', '주문 상품 읽기 전용 표시')
entry('src/components/checkout/CheckoutBuyerInfo.jsx', '회원정보 동일 토글·배송지 접힘/편집')
entry('src/components/checkout/CheckoutSummary.jsx', '금액 요약·결제 중 상태·하단 고정 CTA')
entry('src/components/checkout/CheckoutPaymentMethods.jsx', '위젯 표시 상태. SDK 초기화와 환경 설정 제외', [
  ['export default function', '  useEffect(() =>'],
  ['  return (\n    <section', null],
])
entry('src/pages/PaymentSuccess.jsx', '승인 확인 loading/success/pending/error 분기', [['export default function', null]])
entry('src/pages/PaymentFail.jsx', '실패 복귀·재결제')
entry('src/pages/Orders.jsx', '주문내역·조회 예외·배송 상세 펼침', [['const STATUS_LABELS', null]])
entry('src/pages/Login.jsx', '일반 로그인·간편 로그인·미지원 기능')
entry('src/pages/Register.jsx', '약관 2단계·입력 검증·OAuth 추가 가입')
entry('src/pages/MyPage.jsx', '회원정보 편집·최근 주문·설정·쿠폰·탈퇴 안내', [['const STATUS_LABELS', null]])
entry('src/pages/Wishlist.jsx', '찜 목록과 비회원·오류·빈 상태')
entry('src/components/WishlistQuickPanel.jsx', '고정 찜 패널·담기·전체보기')
entry('src/components/MyCoupons.jsx', '쿠폰 선택 초안과 실제 적용·사용완료. 데이터 조회 제외', [
  ['const couponDate', '  useEffect(() =>'],
  ['  return <section', null],
])
entry('src/components/EventPopup.jsx', '세션 내 환영 팝업·native dialog')
entry('src/components/CartLoginPrompt.jsx', '비회원 담기 dialog')
entry('src/components/Toast.jsx', '토스트 메시지/액션 렌더링')
entry('src/components/ProductImage.jsx', '상품 이미지 오류 fallback')
entry('src/components/Icon.jsx', '공통 SVG 아이콘')
entry('src/components/Stars.jsx', '별점·샘플 표시')
entry('src/components/ProductReviews.jsx', '샘플 후기 펼침/접힘')
entry('src/components/WellnessTable.jsx', '쇼퍼블 이미지·좌표 분기·팝오버·일괄 담기')
entry('src/components/DailyRoutine.jsx', '시간대 탭·자동 시각 갱신')
entry('src/pages/Deals.jsx', '특가 route shell')
entry('src/components/TodayDealsSection.jsx', '일별 특가·카운트다운·로딩')
entry('src/components/DealProductCard.jsx', '특가 카드 상세 진입')
entry('src/pages/ServiceInfo.jsx', '안내 route별 콘텐츠와 다음 CTA')
entry('src/pages/Support.jsx', '로컬 FAQ 검색·카테고리·단일 답변 펼침')
entry('src/pages/SupportInquiry.jsx', '문의 폼·검증·접수 결과·작성/내역 탭', [['function FieldError', null]])
entry('src/pages/SupportInquiries.jsx', '문의 내역·로컬 상세·답변 상태', [['const formatDate', null]])
entry('src/components/InquiryModeTabs.jsx', '작성/작성내역 탭')
entry('src/pages/PartnerProposal.jsx', '제휴 작성·검증·접수 완료', [['function FieldError', null]])
entry('src/pages/NotFound.jsx', '404 복귀 동선')
entry('src/components/AdminGate.jsx', '관리자 인증·권한 UI')
entry('src/components/AdminTopbar.jsx', '관리자 내비게이션')
entry('src/pages/AdminDashboard.jsx', '관리 지표·기간 선택·운영 화면 이동. 데이터 로더는 제외', [
  ['function MetricValue', 'function useSalesSummary'],
  ['function SalesCharts', 'function AdminDashboardContent'],
  ['  const products = resources.products.data', null],
])
entry('src/pages/AdminProducts.jsx', '상품 편집·미저장 확인·검색·판매 상태. 서비스 구현은 제외', [['const FILTERS', null]])
entry('src/pages/AdminOrders.jsx', '주문 상세·상태 전환·선택 출고 확인', [['const FILTERS', null]])
entry('src/pages/AdminPartnerships.jsx', '제안 필터·상세·메모·저장·미저장 확인', [['const STATUS_FILTERS', null]])
entry('src/pages/AdminInquiries.jsx', '문의 필터·답변 입력·등록후 읽기전용', [['const FILTERS', null]])
entry('src/lib/catalog.js', '순수 목록 필터·목적 점수·재고·성분 매칭')
entry('src/lib/ai-search.js', 'AI 결과가 실제 상품 목록으로 변환되는 로컬 UI 로직', [['export const AI_SORT_TO_UI', null]])
entry('src/lib/payments.js', '회원 배송지 토글·완성 조건·결제 오류 문구', [[null, 'export function normalizeCheckoutShipping']])
entry('src/data/mock.js', '목적·보조 조건·알레르기·히어로·카테고리의 공개 UI 설정. 샘플 상품 덤프 제외', [['export const GOALS', '// 상품']])

const main = '# CareMarket 관련 프론트 코드 — UI/사용자 동작 발췌\n\n'
  + '기준은 `01-UX-SPEC.md`와 동일하다. 발췌 사이의 생략 영역과 일부 import/서비스 구현은 의도적으로 제외했다. 아래 블록은 원본의 줄 범위를 보존한 읽기용 자료이며 통째로 실행할 수 없다. 서버/DB/환경 값은 포함하지 않는다. 데이터 서비스 이름은 화면이 기다리는 비동기 동작의 경계로만 읽는다. 분석 함수의 이름이 남아 있어도 서버 구현은 제공하지 않는다.\n\n'
  + '각 파일의 state/이벤트/조건부 렌더링을 함께 읽고, 화면 간 흐름은 UX 명세를 따른다. 원본 코드의 문구와 실제 동작이 다른 경우 명세의 현재 구현 주석을 우선한다.\n\n'
let body = main
for (const e of entries) {
  body += `## ${e.file}\n\n${e.purpose}\n\n`
  for (const region of e.regions) body += `원본 줄 ${region.first}–${region.last}\n\n\`\`\`${e.file.endsWith('.jsx') ? 'jsx' : 'js'}\n${region.text}\n\`\`\`\n\n`
}
fs.writeFileSync(path.join(out, '02-FRONTEND-CODE.md'), body)
fs.copyFileSync(path.join(root, 'src/index.css'), path.join(out, '03-index.css'))
const css = fs.readFileSync(path.join(root, 'src/index.css'))
const manifest = { date: '2026-09-07', basis: 'current working tree, including uncommitted changes', validation: 'static source analysis; no live API or browser verification', code: entries.map(({file, purpose, sha256, regions}) => ({file, purpose, sha256, ranges: regions.map(({first,last}) => ({first,last}))})), styles: {file: 'src/index.css', sha256: crypto.createHash('sha256').update(css).digest('hex')} }
fs.writeFileSync(path.join(out, '04-SOURCE-MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n')
console.log(JSON.stringify({files: entries.length, codeBytes: Buffer.byteLength(body), cssBytes: css.length}))
