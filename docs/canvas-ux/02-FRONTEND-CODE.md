# CareMarket 관련 프론트 코드 — UI/사용자 동작 발췌

기준은 `01-UX-SPEC.md`와 동일하다. 발췌 사이의 생략 영역과 일부 import/서비스 구현은 의도적으로 제외했다. 아래 블록은 원본의 줄 범위를 보존한 읽기용 자료이며 통째로 실행할 수 없다. 서버/DB/환경 값은 포함하지 않는다. 데이터 서비스 이름은 화면이 기다리는 비동기 동작의 경계로만 읽는다. 분석 함수의 이름이 남아 있어도 서버 구현은 제공하지 않는다.

각 파일의 state/이벤트/조건부 렌더링을 함께 읽고, 화면 간 흐름은 UX 명세를 따른다. 원본 코드의 문구와 실제 동작이 다른 경우 명세의 현재 구현 주석을 우선한다.

## src/main.jsx

앱 mount와 스타일 연결

원본 줄 1–10

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

## src/App.jsx

전체 view 매핑과 인증·OAuth·관리자 Shell 분기

원본 줄 1–109

```jsx
import { StoreProvider } from './StoreProvider'
import { useStore } from './store'
import Header from './components/Header'
import Footer from './components/Footer'
import AdminTopbar from './components/AdminTopbar'
import Toast from './components/Toast'
import CartDrawer from './components/CartDrawer'
import CartLoginPrompt from './components/CartLoginPrompt'
import EventPopup from './components/EventPopup'
import Home from './pages/Home'
import Deals from './pages/Deals'
import ProductCollection from './pages/ProductCollection'
import AllProducts from './pages/AllProducts'
import CustomShop from './pages/CustomShop'
import GoalSetup from './pages/GoalSetup'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import PaymentSuccess from './pages/PaymentSuccess'
import PaymentFail from './pages/PaymentFail'
import Orders from './pages/Orders'
import MyPage from './pages/MyPage'
import Wishlist from './pages/Wishlist'
import Login from './pages/Login'
import Register from './pages/Register'
import AdminProducts from './pages/AdminProducts'
import AdminDashboard from './pages/AdminDashboard'
import AdminOrders from './pages/AdminOrders'
import AdminPartnerships from './pages/AdminPartnerships'
import AdminInquiries from './pages/AdminInquiries'
import ServiceInfo from './pages/ServiceInfo'
import PartnerProposal from './pages/PartnerProposal'
import Support from './pages/Support'
import SupportInquiry from './pages/SupportInquiry'
import SupportInquiries from './pages/SupportInquiries'
import NotFound from './pages/NotFound'

const PAGES = {
  main: Home,
  deals: Deals,
  best: ProductCollection,
  new: ProductCollection,
  products: AllProducts,
  custom: CustomShop,
  goalSetup: GoalSetup,
  detail: ProductDetail,
  cart: Cart,
  checkout: Checkout,
  paymentSuccess: PaymentSuccess,
  paymentFail: PaymentFail,
  orders: Orders,
  mypage: MyPage,
  wishlist: Wishlist,
  login: Login,
  register: Register,
  adminDashboard: AdminDashboard,
  adminHistory: AdminDashboard,
  adminProducts: AdminProducts,
  adminOrders: AdminOrders,
  adminPartnerships: AdminPartnerships,
  adminInquiries: AdminInquiries,
  about: ServiceInfo,
  principles: ServiceInfo,
  partners: ServiceInfo,
  partnerProposal: PartnerProposal,
  terms: ServiceInfo,
  privacy: ServiceInfo,
  cleanLabel: ServiceInfo,
  support: Support,
  supportInquiry: SupportInquiry,
  supportInquiries: SupportInquiries,
  notFound: NotFound,
}

function Shell() {
  const { view, loginPromptOpen, user, authLoading, authUserId, oauthRegistrationRequired, profileError, reloadProfile, logout } = useStore()
  const pendingOAuthProfile = user?.oauth && oauthRegistrationRequired === null
  const completingOAuth = user?.oauth && oauthRegistrationRequired === true
  const Page = completingOAuth ? Register : PAGES[view] || NotFound
  const isAdmin = ['adminDashboard', 'adminHistory', 'adminProducts', 'adminOrders', 'adminPartnerships', 'adminInquiries'].includes(view)
  return (
    <div className="app">
      {isAdmin ? <AdminTopbar /> : <Header />}
      <main>
        <div className="view-fade" key={completingOAuth ? `oauth-register:${authUserId}` : view}>
          {authLoading || pendingOAuthProfile ? <div className="wrap page auth-page">
            <div className="auth-container">
              <p role={profileError ? 'alert' : 'status'}>{profileError || '로그인 정보를 확인하고 있습니다.'}</p>
              {profileError && <><button type="button" className="btn btn-primary" onClick={reloadProfile}>다시 시도</button><button type="button" className="btn btn-text" onClick={logout}>로그아웃</button></>}
            </div>
          </div> : <Page />}
        </div>
      </main>
      {!isAdmin && <Footer />}
      {!pendingOAuthProfile && !completingOAuth && <CartDrawer />}
      <Toast />
      {loginPromptOpen && <CartLoginPrompt />}
      {!isAdmin && !pendingOAuthProfile && !completingOAuth && <EventPopup />}
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
```

## src/lib/navigation.js

route 해석과 URL 생성

원본 줄 1–92

```js
const VIEW_PATHS = {
  main: '/',
  deals: '/deals',
  best: '/best',
  new: '/new',
  products: '/products',
  custom: '/for-you',
  goalSetup: '/goals',
  cart: '/cart',
  checkout: '/checkout',
  orders: '/orders',
  mypage: '/mypage',
  wishlist: '/wishlist',
  login: '/login',
  register: '/register',
  adminDashboard: '/admin',
  adminHistory: '/admin/history',
  adminProducts: '/admin/products',
  adminOrders: '/admin/orders',
  adminPartnerships: '/admin/partnerships',
  adminInquiries: '/admin/inquiries',
  about: '/about',
  principles: '/principles',
  partners: '/partners',
  partnerProposal: '/partners/proposal',
  terms: '/terms',
  privacy: '/privacy',
  cleanLabel: '/clean-label',
  support: '/support',
  supportInquiry: '/support/inquiry',
  supportInquiries: '/support/inquiries',
  paymentSuccess: '/payment/success',
  paymentFail: '/payment/fail',
}

const PATH_VIEWS = Object.fromEntries(Object.entries(VIEW_PATHS).map(([view, path]) => [path, view]))

export function parseAppLocation(location) {
  const rawPathname = location?.pathname || '/'
  const pathname = rawPathname === '/' ? '/' : rawPathname.replace(/\/+$/, '') || '/'
  const params = new URLSearchParams(location?.search || '')
  const detail = pathname.match(/^\/products\/([^/]+)$/)
  if (detail) {
    const numericId = Number(detail[1])
    return {
      view: 'detail',
      productId: Number.isSafeInteger(numericId) && numericId > 0 ? numericId : detail[1],
    }
  }
  const isSearch = pathname === '/search'
  const view = isSearch ? 'products' : (PATH_VIEWS[pathname] || 'notFound')
  const mode = params.get('mode') === 'ai' ? 'ai' : 'normal'
  const query = params.get('q') || ''
  return {
    view,
    productId: null,
    search: mode === 'normal' ? query : '',
    aiQuery: mode === 'ai' ? query : '',
    searchMode: mode,
    shopCategory: params.get('category') || '전체상품',
    shopSub: params.get('sub') || '전체',
    dealsOnly: params.get('deals') === '1',
    sortBy: params.get('sort') || 'recommend',
  }
}

export function catalogUrl({ search, searchMode, aiQuery, shopCategory, shopSub, dealsOnly, sortBy }) {
  const params = new URLSearchParams()
  const query = searchMode === 'ai' ? aiQuery : search
  if (query) params.set('q', query)
  if (searchMode === 'ai') params.set('mode', 'ai')
  if (shopCategory && shopCategory !== '전체상품') params.set('category', shopCategory)
  if (shopSub && shopSub !== '전체') params.set('sub', shopSub)
  if (dealsOnly) params.set('deals', '1')
  if (sortBy && sortBy !== 'recommend') params.set('sort', sortBy)
  const base = query ? '/search' : '/products'
  const suffix = params.toString()
  return suffix ? `${base}?${suffix}` : base
}

export function viewUrl(view) {
  return VIEW_PATHS[view] || '/'
}

export function adminOrdersUrl({ status } = {}) {
  return status === 'pending' ? '/admin/orders?status=pending' : VIEW_PATHS.adminOrders
}

export function productUrl(productId) {
  const id = Number(productId)
  return Number.isSafeInteger(id) && id > 0 ? `/products/${id}` : '/products'
}
```

## src/store.jsx

공통 context와 히어로 자동 전환

원본 줄 1–15

```jsx
import { createContext, useContext, useEffect, useState } from 'react'

// 컨텍스트 + 훅만 담은 모듈 (컴포넌트를 함께 내보내지 않아 Fast Refresh 안전)
export const StoreContext = createContext(null)
export const useStore = () => useContext(StoreContext)

// 히어로 슬라이드 자동 전환 훅
export function useAutoSlide(length, delay = 6000) {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => setI((p) => (p + 1) % length), delay)
    return () => window.clearInterval(t)
  }, [length, delay])
  return [i, setI]
}
```

## src/StoreProvider.jsx

전역 상태·라우팅·AI 검색·담기·주문 진입. 인증·DB 저장 구현 제외

원본 줄 57–106

```jsx
  const [view, setView] = useState(initialRoute.view)
  const [selectedProduct, setSelectedProduct] = useState(null)

  // 맞춤 조건
  const [goal, setGoal] = useState(DEFAULT_GOAL)
  const [subFilters, setSubFilters] = useState(DEFAULT_SUB_FILTERS)
  const [allergies, setAllergies] = useState([])
  const [search, setSearch] = useState(initialRoute.search || '')
  const [sortBy, setSortBy] = useState(initialRoute.sortBy || 'recommend')

  // 검색 모드: 'normal'(상품명/카테고리) | 'ai'(자연어 조건). 사용자가 직접 전환
  const [searchMode, setSearchMode] = useState(initialRoute.searchMode || 'normal')
  const [aiQuery, setAiQuery] = useState(initialRoute.aiQuery || '')
  const [aiResult, setAiResult] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(null)
  const aiRequest = useRef(null)

  useEffect(() => () => aiRequest.current?.abort(), [])

  // 상단 제품 카테고리 브라우징 (목표와 별개 축)
  const [shopCategory, setShopCategory] = useState(initialRoute.shopCategory || '전체상품')
  const [shopSub, setShopSub] = useState(initialRoute.shopSub || '전체')
  const [dealsOnly, setDealsOnly] = useState(Boolean(initialRoute.dealsOnly))

  // 커머스 상태
  const [wishlist, setWishlist] = useState([])
  const [wishlistLoading, setWishlistLoading] = useState(false)
  const [wishlistError, setWishlistError] = useState(null)
  const [wishlistReloadKey, setWishlistReloadKey] = useState(0)
  const wishlistPending = useRef(new Set())
  const [cartState, setCartState] = useState(EMPTY_CART)
  const [loginPromptOpen, setLoginPromptOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [products, setProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [productsError, setProductsError] = useState(null)
  const [productsReloadKey, setProductsReloadKey] = useState(0)
  const [user, setUser] = useState(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [authUserId, setAuthUserId] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [oauthRegistrationRequired, setOauthRegistrationRequired] = useState(null)
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState(null)
  const [profileReloadKey, setProfileReloadKey] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)
  // 배송 자동입력 등에 쓰는 회원 연락처 정보 (마이그레이션 적용 전에는 빈 값)
  const [profile, setProfile] = useState(EMPTY_PROFILE)
```

원본 줄 438–578

```jsx
  const rememberScroll = () => {
    window.history.replaceState({ ...window.history.state, view, scrollY: window.scrollY }, '', window.location.href)
  }
  const catalogStateUrl = (overrides = {}) => catalogUrl({ search, searchMode, aiQuery, shopCategory, shopSub, dealsOnly, sortBy, ...overrides })
  const navigate = (v, options = {}) => {
    if ((['adminHistory', 'adminProducts', 'adminOrders', 'adminPartnerships', 'adminInquiries'].includes(v) || v === 'adminDashboard') && !authLoading && !isAdmin) {
      showToast('관리자 권한이 필요한 페이지입니다.')
      setView('main')
      window.history.pushState({ view: 'main', scrollY: 0 }, '', '/')
      scrollTop()
      return
    }
    rememberScroll()
    // Ordinary catalog links exit AI search; only an explicit search keeps it active.
    const resetAi = v === 'products' && !options.preserveAiSearch
    if (resetAi) clearAiSearch()
    const nextUrl = v === 'products'
      ? catalogStateUrl(resetAi ? {
        searchMode: 'normal', aiQuery: '',
        sortBy: ['protein', 'sugar', 'sodium'].includes(sortBy) ? 'recommend' : sortBy,
      } : {})
      : v === 'adminOrders'
      ? adminOrdersUrl(options)
      : viewUrl(v)
    if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
      window.history.pushState({ view: v, scrollY: 0 }, '', nextUrl)
    }
    setView(v)
    scrollTop()
  }

  const openProduct = (product) => {
    rememberScroll()
    window.history.pushState({ view: 'detail', productId: product.id, scrollY: 0 }, '', productUrl(product.id))
    setSelectedProduct(product)
    setView('detail')
    scrollTop()
  }

  useEffect(() => {
    if (view !== 'products') return
    const nextUrl = catalogStateUrl()
    if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
      window.history.replaceState({ ...window.history.state, view: 'products' }, '', nextUrl)
    }
  // Catalog state is intentionally mirrored to the current history entry.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, search, searchMode, aiQuery, shopCategory, shopSub, dealsOnly, sortBy])

  useEffect(() => {
    const previousRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    window.history.replaceState({ ...window.history.state, view, scrollY: window.history.state?.scrollY ?? window.scrollY }, '', window.location.href)
    const onPopState = (event) => {
      const route = parseAppLocation(window.location)
      setView(route.view)
      if (route.view === 'detail') {
        setSelectedProduct(products.find((product) => product.id === route.productId) || null)
      } else if (route.view === 'products') {
        setSearch(route.search || '')
        setSearchMode(route.searchMode || 'normal')
        setAiQuery(route.aiQuery || '')
        setShopCategory(route.shopCategory || '전체상품')
        setShopSub(route.shopSub || '전체')
        setDealsOnly(Boolean(route.dealsOnly))
        setSortBy(route.sortBy || 'recommend')
      }
      window.requestAnimationFrame(() => window.scrollTo({ top: event.state?.scrollY || 0, behavior: 'auto' }))
    }
    window.addEventListener('popstate', onPopState)
    return () => {
      window.removeEventListener('popstate', onPopState)
      window.history.scrollRestoration = previousRestoration
    }
  }, [products, view])

  const runAiSearch = async (raw) => {
    const query = typeof (raw ?? aiQuery) === 'string' ? (raw ?? aiQuery).trim() : ''
    aiRequest.current?.abort()
    const request = new AbortController()
    aiRequest.current = request
    setAiQuery(query)
    setSearchMode('ai')
    setAiResult(null)
    setAiError(null)
    setAiLoading(true)
    setDealsOnly(false)
    navigate('products', { preserveAiSearch: true })
    window.setTimeout(() => document.getElementById('product-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
    try {
      const filters = await requestAiConditions(supabase, query, request.signal)
      if (aiRequest.current !== request || request.signal.aborted) return
      setAiResult({ query, filters, conditions: conditionLabels(filters) })
      setSortBy(AI_SORT_TO_UI[filters.sort_by])
    } catch (error) {
      if (aiRequest.current === request && !request.signal.aborted) setAiError(error.message)
    } finally {
      if (aiRequest.current === request && !request.signal.aborted) setAiLoading(false)
    }
  }

  const resetAiSearchState = () => {
    aiRequest.current?.abort()
    aiRequest.current = null
    setAiLoading(false)
    setAiError(null)
    setAiResult(null)
    setAiQuery('')
    setSearchMode('normal')
  }

  const clearAiSearch = () => {
    resetAiSearchState()
    if (['protein', 'sugar', 'sodium'].includes(sortBy)) setSortBy('recommend')
  }

  const navigateToCatalog = (category = '전체상품', sub = '전체') => {
    resetAiSearchState()
    setSearch('')
    setSubFilters([])
    setShopCategory(category)
    setShopSub(sub)
    setDealsOnly(false)
    setSortBy('recommend')

    rememberScroll()
    const nextUrl = catalogUrl({
      search: '',
      searchMode: 'normal',
      aiQuery: '',
      shopCategory: category,
      shopSub: sub,
      dealsOnly: false,
      sortBy: 'recommend',
    })
    if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
      window.history.pushState({ view: 'products', scrollY: 0 }, '', nextUrl)
    }
    setView('products')
    scrollTop()
  }
```

원본 줄 604–661

```jsx
  const requireCartLogin = () => {
    if (!loggingOut.current && authUserId && cartController.getOwner() === authUserId) return true
    setDrawerOpen(false)
    setLoginPromptOpen(true)
    return false
  }

  const addToCart = async (product, count = 1) => {
    if (!requireCartLogin()) return false
    const existing = cart.find(item => item.product.id === product.id)?.quantity || 0
    if (!Number.isInteger(count) || count < 1 || existing + count > product.stock) {
      showToast('현재 구매 가능한 최대 수량입니다.')
      return false
    }
    const generation = cartController.getGeneration()
    const saved = await cartController.add(product.id, count)
    if (saved && generation === cartController.getGeneration()) {
      showToast('장바구니에 담았어요.', 'default', {
        label: '장바구니 보기',
        onClick: () => {
          window.clearTimeout(toastTimer.current)
          setToast(null)
          setDrawerOpen(true)
        },
      })
      return true
    }
    return false
  }

  const changeCartQty = (id, delta) => requireCartLogin()
    ? cartController.changeQuantity(id, delta) : Promise.resolve(false)

  const removeFromCart = async (id) => {
    if (!requireCartLogin()) return false
    const generation = cartController.getGeneration()
    const saved = await cartController.remove(id)
    if (saved && generation === cartController.getGeneration()) {
      showToast('상품을 삭제했습니다.')
      return true
    }
    return false
  }

  const toggleAllergy = (a) =>
    setAllergies((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]))

  const toggleSub = (tag) =>
    setSubFilters((prev) => (prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]))

  const { productTotal: cartTotal, deliveryFee } = calculateCartPricing(cart)
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)

  const checkout = () => {
    if (!requireCartLogin() || cart.length === 0 || cartPending || cartLoading || cartError) return
    setDrawerOpen(false)
    navigate('checkout')
  }
```

## src/components/Header.jsx

검색 초안/확정·자동완성·AI 모드·회원 메뉴·모바일 검색

원본 줄 9–471

```jsx
const AI_SEARCH_EXAMPLES = [
  '카페인 없는 영양제 찾아줘',
  '당류 낮고 단백질 높은 간식 찾아줘',
  '나트륨 낮은 식품 찾아줘',
]

// 자동완성: 실제 상품 데이터에서 추천 검색어 vocab을 만든다 (하드코딩 배열 아님)
const SUG_SEED = ['프로틴', '간편식', '건강음료', '건강간식', '영양제', '저당', '저염', '고단백', '카페인 제외']
const SUG_STOP = new Set(['오리지널', '프리미엄', '데일리', '스페셜', '에디션', '오늘', '한입', '리얼', '순수', '고소한', '부드러운', '꾸덕한', '생생', '천연', '국산', '유기농', '무첨가', '무가당', '무염', '저온', '저칼로리', '저지방', '로우', '제로', '하이', '베이스', '믹스', '맛'])

function buildVocab(products) {
  const freq = new Map()
  for (const p of products) {
    for (const raw of String(p.name || '').split(/[\s()·&,%/+]+/)) {
      const t = raw.replace(/\d+([.,]\d+)?\s*(g|kg|ml|l|iu|mg|억|종|정|포|캡슐|알|팩|개입|개|x)?$/i, '').trim()
      if (t.length < 2 || SUG_STOP.has(t) || /^\d/.test(t)) continue
      freq.set(t, (freq.get(t) || 0) + 1)
    }
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0])
}

function buildSuggestions(products, vocab, query) {
  const q = query.trim().toLowerCase()
  if (!q) return { terms: [], items: [] }
  const has = (s) => String(s || '').toLowerCase().includes(q)
  const terms = []
  for (const t of [...SUG_SEED, ...vocab]) {
    if (has(t) && !terms.includes(t)) terms.push(t)
    if (terms.length >= 5) break
  }
  const items = products.filter((p) => has(p.name) || has(p.category) || (p.tags || []).some(has)).slice(0, 3)
  return { terms, items }
}

function AnnouncementBar({ navigate, isLoggedIn }) {
  const [active, setActive] = useState(0)
  const [interacting, setInteracting] = useState(false)

  useEffect(() => {
    if (interacting) return undefined
    const timer = window.setInterval(() => setActive(current => 1 - current), 5000)
    return () => window.clearInterval(timer)
  }, [interacting])

  const openCoupons = () => {
    if (!isLoggedIn) { navigate('login'); return }
    navigate('mypage')
    window.history.replaceState(window.history.state, '', '/mypage#my-coupons')
    document.getElementById('my-coupons')?.scrollIntoView({ block: 'start' })
  }

  return <div className="announce" aria-label="쇼핑 혜택 안내"
    onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)}
    onFocus={() => setInteracting(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false) }}>
    <div className="announce-shell">
      <div className="announce-viewport">
        <div className="announce-track" style={{ transform: `translateY(-${active * 50}%)` }}>
          <div className="announce-inner" aria-hidden={active !== 0} inert={active !== 0}>
            <b>ORGANIC &amp; CLEAN</b>
            <span>자연에서 온 무첨가 할인식단 · 40,000원 이상 무료배송</span>
            <button type="button" className="link" onClick={() => navigate('custom')}>내 맞춤 상품 보기 →</button>
          </div>
          <div className="announce-inner" aria-hidden={active !== 1} inert={active !== 1}>
            <b>WELCOME BENEFIT</b>
            <span>반가워요, 신규 가입 <strong>20% 쿠폰 지급</strong></span>
            <button type="button" className="link" onClick={openCoupons}>쿠폰함 확인하기 →</button>
          </div>
        </div>
      </div>
    </div>
  </div>
}

function CompanyMenu({ navigate }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!menuRef.current?.contains(event.target)) setOpen(false)
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  const openView = (view) => {
    setOpen(false)
    navigate(view)
  }

  return (
    <div
      className={`company-menu${open ? ' open' : ''}`}
      ref={menuRef}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="company-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        CareMarket <Icon name="chevron-down" size={13} />
      </button>
      <div className="company-dropdown" role="menu" aria-label="CareMarket 안내">
        <strong>CareMarket</strong>
        <button type="button" role="menuitem" onClick={() => openView('about')}>케어마켓 소개</button>
        <button type="button" role="menuitem" onClick={() => openView('principles')}>철학과 원칙</button>
        <div className="company-dropdown-divider" />
        <button type="button" className="company-menu-item partner" role="menuitem" onClick={() => openView('partners')}>
          브랜드 입점 · 제휴 <Icon name="chevron-right" size={13} />
        </button>
      </div>
    </div>
  )
}

export default function Header() {
  const {
    navigate, navigateToCatalog, search, setSearch, view,
    searchMode, setSearchMode, aiQuery, setAiQuery, aiLoading, runAiSearch, clearAiSearch,
    shopCategory, shopSub, setDealsOnly,
    wishlist, cartCount, setDrawerOpen, isLoggedIn, requireCartLogin,
    products, openProduct, isAdmin,
  } = useStore()
  const [aiPlaceholder, setAiPlaceholder] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchInput, setSearchInput] = useState(null)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [sugOpen, setSugOpen] = useState(false)
  const [hi, setHi] = useState(-1)
  const searchInputRef = useRef(null)

  const isAi = searchMode === 'ai'
  // 일반 검색: 클릭(focus) 또는 입력 시 왼쪽 돋보기를 숨기고 오른쪽 검색 버튼을 노출
  const searchDraft = searchInput ?? search
  const normalActive = !isAi && (searchFocused || Boolean(searchDraft))

  // 자동완성 (일반 검색 전용, 실제 상품 데이터 기반)
  const vocab = useMemo(() => buildVocab(products), [products])
  const suggestions = useMemo(() => buildSuggestions(products, vocab, searchDraft), [products, vocab, searchDraft])
  const sugCount = suggestions.terms.length + suggestions.items.length
  const sugVisible = !isAi && searchFocused && sugOpen && searchDraft.trim().length >= 1 && sugCount > 0

  // 카테고리/하위 선택 → 필터 적용 후 상품 목록으로 스크롤
  const openCategory = (c, sub) => {
    setSearchInput(null)
    setSugOpen(false)
    setHi(-1)
    setMobileSearchOpen(false)
    navigateToCatalog(c.name, sub)
  }

  useEffect(() => {
    if (!isAi) return undefined

    let exampleIndex = 0
    let charIndex = 0
    let isDeleting = false
    let timer

    const typeExample = () => {
      const example = AI_SEARCH_EXAMPLES[exampleIndex]
      charIndex += isDeleting ? -1 : 1
      setAiPlaceholder(example.slice(0, charIndex))

      if (!isDeleting && charIndex === example.length) {
        isDeleting = true
        timer = window.setTimeout(typeExample, 1500)
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false
        exampleIndex = (exampleIndex + 1) % AI_SEARCH_EXAMPLES.length
        timer = window.setTimeout(typeExample, 320)
      } else {
        timer = window.setTimeout(typeExample, isDeleting ? 32 : 62)
      }
    }

    typeExample()
    return () => window.clearTimeout(timer)
  }, [isAi])

  const enterAiMode = () => {
    setSearchMode('ai')
    setSearch('')
  }
  const scrollToResults = () => {
    setDealsOnly(false)
    navigate('products')
  }
  const onSearchSubmit = (e) => {
    e.preventDefault()
    if (isAi) {
      if (!aiLoading) void runAiSearch()
      setMobileSearchOpen(false)
      return
    }
    setSearch(searchDraft.trim())
    setSearchInput(null)
    setSugOpen(false)
    setMobileSearchOpen(false)
    scrollToResults()
  }

  const selectTerm = (t) => { setSearchInput(null); setSearch(t); setSugOpen(false); setHi(-1); setMobileSearchOpen(false); scrollToResults() }
  const selectProduct = (p) => { setSugOpen(false); setHi(-1); openProduct(p) }
  const onSearchKeyDown = (e) => {
    if (e.key === 'Escape') { setSugOpen(false); setHi(-1); return }
    if (!sugVisible) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, sugCount - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, -1)) }
    else if (e.key === 'Enter' && hi >= 0) {
      e.preventDefault()
      if (hi < suggestions.terms.length) selectTerm(suggestions.terms[hi])
      else selectProduct(suggestions.items[hi - suggestions.terms.length])
    }
  }

  return (
    <>
      {/* 공지 스트립 */}
      <AnnouncementBar navigate={navigate} isLoggedIn={isLoggedIn} />

      {/* GNB */}
      <header className="header">
        <div className="wrap">
          <div className="header-main">
            <div className="brand" onClick={() => navigate('main')}>
              <div className="brand-mark"><Icon name="leaf" size={20} /></div>
              <div>
                <div className="brand-name">CareMarket</div>
                <div className="brand-sub">Pure &amp; Clean Food</div>
              </div>
            </div>

            <form className={`search${isAi ? ' ai' : ''}${normalActive ? ' focused' : ''}${mobileSearchOpen ? ' mobile-open' : ''}`} onSubmit={onSearchSubmit}>
              <button
                type="button"
                className="mobile-search-mode"
                onClick={isAi ? clearAiSearch : enterAiMode}
                aria-label={isAi ? '일반 검색으로 전환' : 'AI 검색으로 전환'}
                title={isAi ? '일반 검색' : 'AI 검색'}
              >
                <Icon name={isAi ? 'chevron-left' : 'sparkles'} size={17} />
              </button>
              {(isAi || !normalActive) && (
                <Icon name={isAi ? 'sparkles' : 'search'} size={17} className={`s-ico${isAi ? ' ai' : ''}`} />
              )}
              {isAi ? (
                <input
                  type="text"
                  placeholder={aiPlaceholder}
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  ref={searchInputRef}
                  aria-label="AI 자연어 검색"
                  maxLength={QUERY_MAX_LENGTH}
                  aria-busy={aiLoading}
                />
              ) : (
                <input
                  type="text"
                  placeholder="상품명 또는 카테고리 검색"
                  value={searchDraft}
                  ref={searchInputRef}
                  onChange={(e) => { setSearchInput(e.target.value); setSugOpen(e.target.value.trim().length >= 1); setHi(-1) }}
                  onFocus={() => { setSearchFocused(true); if (searchDraft.trim()) setSugOpen(true) }}
                  onBlur={() => setSearchFocused(false)}
                  onKeyDown={onSearchKeyDown}
                  aria-label="상품명 또는 카테고리 검색"
                  role="combobox"
                  aria-expanded={sugVisible}
                  aria-autocomplete="list"
                />
              )}
              {isAi && (
                <button type="submit" className="s-ai-submit" disabled={aiLoading}
                  title={aiLoading ? '검색 조건 해석 중' : 'AI 검색 실행'} aria-label="AI 검색 실행">
                  <Icon name={aiLoading ? 'clock' : 'search'} size={17} />
                </button>
              )}
              {normalActive && (
                <button type="submit" className="s-ai-submit" title="검색" aria-label="검색"
                  onMouseDown={(e) => e.preventDefault()}>
                  <Icon name="search" size={17} />
                </button>
              )}
              {isAi
                ? aiQuery && (
                    <button type="button" className="s-clear" onClick={() => setAiQuery('')} aria-label="검색어 지우기">
                      <Icon name="x" size={15} />
                    </button>
                  )
                : searchDraft && (
                    <button type="button" className="s-clear" onClick={() => setSearchInput('')} aria-label="검색어 지우기">
                      <Icon name="x" size={15} />
                    </button>
                  )}

              <button
                type="button"
                className={`search-inline-mode${isAi ? ' on' : ''}`}
                onClick={isAi ? clearAiSearch : enterAiMode}
                aria-label={isAi ? '일반 검색으로 전환' : 'AI 검색으로 전환'}
                title={isAi ? '일반 검색으로 전환' : 'AI 자연어 검색으로 전환'}
              >
                <Icon name={isAi ? 'search' : 'sparkles'} size={14} />
                <span>{isAi ? '일반' : 'AI'}</span>
              </button>

              <button type="button" className="mobile-search-close" onClick={() => { setMobileSearchOpen(false); setSugOpen(false) }} aria-label="검색 닫기">
                <Icon name="x" size={19} />
              </button>

              {sugVisible && (
                <div className="search-sug" role="listbox" onMouseDown={(e) => e.preventDefault()}>
                  {suggestions.terms.length > 0 && (
                    <div className="sug-group">
                      <div className="sug-label">추천 검색어</div>
                      {suggestions.terms.map((t, i) => (
                        <button type="button" key={t} className={`sug-term${hi === i ? ' hi' : ''}`}
                          onMouseEnter={() => setHi(i)} onClick={() => selectTerm(t)}>
                          <Icon name="search" size={14} /> <span>{t}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {suggestions.items.length > 0 && (
                    <div className="sug-group">
                      <div className="sug-label">관련 상품</div>
                      {suggestions.items.map((p, i) => {
                        const idx = suggestions.terms.length + i
                        return (
                          <button type="button" key={p.id} className={`sug-prod${hi === idx ? ' hi' : ''}`}
                            onMouseEnter={() => setHi(idx)} onClick={() => selectProduct(p)}>
                            <span className="sug-thumb"><ProductImage src={p.image} alt="" /></span>
                            <span className="sug-pname">{p.name}</span>
                            <span className="sug-pprice">{won(p.price)}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </form>

            <div className="header-actions">
              <button
                type="button"
                className="icon-btn mobile-search-trigger"
                onClick={() => {
                  setMobileSearchOpen(true)
                  window.requestAnimationFrame(() => searchInputRef.current?.focus())
                }}
                aria-label="검색 열기"
              >
                <Icon name="search" size={20} />
              </button>
              {isLoggedIn ? (
                <>
                  {isAdmin && (
                    <button
                      type="button"
                      className="header-admin-btn"
                      onClick={() => navigate('adminDashboard')}
                      title="관리자 화면으로 전환"
                    >
                      <Icon name="shield-check" size={15} /> <span>관리자 화면</span>
                    </button>
                  )}
                  <button
                    className="icon-btn header-wishlist-btn"
                    onClick={() => navigate('wishlist')}
                    aria-label={`찜한 상품 ${wishlist.length}개`}
                    title="찜한 상품"
                    style={wishlist.length ? { color: 'var(--danger)' } : undefined}
                  >
                    <Icon name="heart" size={20} fill={wishlist.length ? 'currentColor' : 'none'} />
                    {wishlist.length > 0 && <span className="header-wishlist-count">{wishlist.length > 99 ? '99+' : wishlist.length}</span>}
                  </button>
                  <button className="icon-btn" onClick={() => navigate('mypage')} aria-label="마이페이지">
                    <Icon name="user" size={20} />
                  </button>
                </>
              ) : (
                <button className="header-shop-action header-login-btn" onClick={() => navigate('login')} aria-label="로그인">
                  <Icon name="user" size={21} /> <span>로그인</span>
                </button>
              )}
              <button className="cart-btn" aria-label={`장바구니 ${cartCount}개`} onClick={() => { if (requireCartLogin()) setDrawerOpen(true) }}>
                <span className="cart-icon-wrap">
                  <Icon name="cart" size={21} />
                  <span className="qty">{cartCount}</span>
                </span>
                <span className="cart-label">장바구니</span>
              </button>
            </div>
          </div>

          {/* 제품 카테고리 네비게이션 (iHerb 스타일 · 하위는 드롭다운) */}
          <div className="header-nav no-scrollbar">
            <div className="goal-nav">
              {CATEGORIES.map((c) => (
                c.subs ? (
                  <div key={c.id} className="cat-item">
                    <button
                      className={shopCategory === c.name ? 'on' : ''}
                      onClick={() => openCategory(c, '전체')}
                    >
                      {c.name}<Icon name="chevron-down" size={13} />
                    </button>
                    <div className="cat-dropdown">
                      {['전체', ...c.subs.map((s) => s.name)].map((name) => (
                        <button
                          key={name}
                          className={shopCategory === c.name && shopSub === name ? 'on' : ''}
                          onClick={() => openCategory(c, name)}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <button
                    key={c.id}
                    className={shopCategory === c.name ? 'on' : ''}
                    onClick={() => openCategory(c, '전체')}
                  >
                    {c.name}
                  </button>
                )
              ))}
              <button
                type="button"
                className={`deal-nav-item${view === 'deals' ? ' on' : ''}`}
                onClick={() => navigate('deals')}
              >
                특가상품
              </button>
            </div>
            <div className="header-nav-right">
              <CompanyMenu navigate={navigate} />
              <button type="button" className="order-lookup-link" onClick={() => navigate('orders')}>주문 · 배송 조회</button>
            </div>
          </div>
        </div>
      </header>
    </>
  )
}
```

## src/components/Footer.jsx

서비스 링크와 홈 내부 스크롤

원본 줄 1–64

```jsx
import { useStore } from '../store'

const GROUPS = [
  { title: 'SHOP', links: [
    ['전체상품', 'products'], ['베스트', 'best'], ['신상품', 'new'], ['오늘의 웰빙 테이블', 'wellness'],
  ] },
  { title: 'ABOUT', links: [
    ['케어마켓 소개', 'about'], ['철학과 원칙', 'principles'], ['클린라벨 정보 기준', 'cleanLabel'],
  ] },
  { title: 'PARTNERS', links: [
    ['브랜드 입점 · 제휴', 'partners'],
  ] },
  { title: 'SUPPORT', links: [
    ['주문 · 배송 조회', 'orders'], ['FAQ', 'support'], ['1:1 문의', 'supportInquiry'],
  ] },
  { title: 'POLICY', links: [
    ['이용약관', 'terms'], ['개인정보처리방침', 'privacy'],
  ] },
]

export default function Footer() {
  const { navigate } = useStore()
  const openLink = (view) => {
    if (view === 'wellness') {
      navigate('main')
      window.setTimeout(() => {
        document.querySelector('.wellness-table-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 0)
      return
    }
    navigate(view)
  }

  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-top">
          <div className="footer-brand">
            <span className="nm">CareMarket</span>
            <span className="tl">Pure &amp; Clean Nutrition</span>
          </div>
          <nav className="footer-links" aria-label="서비스 안내">
            {GROUPS.map((group) => (
              <section className="footer-group" key={group.title}>
                <h2>{group.title}</h2>
                <div>
                  {group.links.map(([label, view]) => view ? (
                    <button key={label} type="button" onClick={() => openLink(view)}>{label}</button>
                  ) : (
                    <span key={label} className="footer-link-pending" aria-disabled="true" title="준비 중">{label}</span>
                  ))}
                </div>
              </section>
            ))}
          </nav>
        </div>
        <div className="footer-fine">
          <p>CareMarket은 건강식품과 식단 상품을 둘러보고 주문할 수 있는 서비스입니다.</p>
          <p>상품 정보와 주문 관련 안내는 각 상품 상세 및 주문내역에서 확인할 수 있습니다.</p>
        </div>
      </div>
    </footer>
  )
}
```

## src/pages/Home.jsx

히어로·목적 체험·추천·콘텐츠 진입

원본 줄 1–271

```jsx
import { useMemo, useState } from 'react'
import { useStore, useAutoSlide } from '../store'
import { GOALS, HERO_SLIDES, VALUES } from '../data/mock'
import Icon from '../components/Icon'
import ProductCard from '../components/ProductCard'
import WellnessTable from '../components/WellnessTable'
import DailyRoutine from '../components/DailyRoutine'
import { filterAndSort } from '../lib/catalog'

// 주목표별 강조 안내문
const GOAL_GUIDE = {
  '근육량 증가': '단백질 식품을 우선하고 단백질·당류 정보를 함께 반영합니다.',
  '체중 관리': '식사·단백질 식품을 우선하고 열량·당류 정보를 함께 반영합니다.',
  '식단 영양 관리': '식단을 구성할 수 있는 식품을 우선하고 나트륨·당류 정보를 함께 반영합니다.',
  '영양제 탐색': '영양제·비타민 상품을 우선 표시합니다.',
}

export default function Home() {
  const {
    goal, setGoal, subFilters, setSubFilters, allergies,
    products, productsLoading, productsError, reloadProducts, openProduct, navigate,
    isLoggedIn, logout, setShopCategory, setShopSub, setSortBy,
    setDealsOnly,
  } = useStore()

  const [slide, setSlide] = useAutoSlide(HERO_SLIDES.length)
  const [focusGoal, setFocusGoal] = useState(null) // 비로그인 목표 셀렉터: 포커스된 목표
  const hero = HERO_SLIDES[slide]
  const activeGoal = GOALS.find((g) => g.name === focusGoal)

  // 맞춤 추천 4개 (목표 기반, 필터 무관)
  const recommended = useMemo(
    () => filterAndSort(products, { search: '', subFilters: [], allergies, sortBy: 'recommend', goal, shopCategory: '전체상품', shopSub: '전체' }).slice(0, 4),
    [products, allergies, goal],
  )

  // Hero 컬렉션 CTA → 컬렉션 필터 설정 후 전체상품 페이지로 이동
  const applyCollection = (col) => {
    if (!col) return
    setShopCategory(col.category)
    setShopSub(col.sub)
    setSubFilters(col.subFilters || [])
    navigate('products')
  }
  const goToProducts = (opts = {}) => {
    setDealsOnly(false)
    setShopCategory('전체상품')
    setShopSub('전체')
    if (opts.recommend) setSortBy('recommend')
    navigate('products')
  }

  return (
    <div className="home-page">
      {/* ── 히어로 ── */}
      <section className="hero">
        {HERO_SLIDES.map((s, i) => (
          <div
            key={s.id}
            className="hero-bg"
            style={{ backgroundImage: `url(${s.image})`, opacity: i === slide ? 1 : 0 }}
          />
        ))}
        <div className="hero-scrim" />
        <div className="hero-inner">
          <div className="hero-copy">
            <span className="hero-eyebrow"><Icon name="leaf" size={14} /> {hero.tag}</span>
            <h1>{hero.title}</h1>
            <p>{hero.desc}</p>
            <div className="hero-cta">
              <button
                className="btn btn-primary btn-lg"
                onClick={() => applyCollection(hero.collection)}
              >
                {hero.btn} <Icon name="arrow-up-right" size={17} />
              </button>
            </div>
            <div className="hero-badge"><Icon name="shield-check" size={15} /> {hero.badge}</div>
          </div>

          <div className="hero-cards">
            {products.slice(1, 3).map((p) => (
              <button key={p.id} type="button" className="hero-card" onClick={() => openProduct(p)}>
                <div className="thumb" style={{ backgroundImage: `url(${p.image})` }} />
                <div className="oc">{p.origin}</div>
                <div className="nm">{p.name}</div>
                <div className="pr">{p.price.toLocaleString('ko-KR')}원</div>
              </button>
            ))}
          </div>
        </div>

        <div className="hero-dots">
          <div className="hero-dots-inner">
            <div className="dots">
              {HERO_SLIDES.map((_, i) => (
                <button key={i} className={i === slide ? 'on' : ''} onClick={() => setSlide(i)} aria-label={`슬라이드 ${i + 1}`} />
              ))}
            </div>
            <div className="hero-arrows">
              <button onClick={() => setSlide((slide - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)} aria-label="이전"><Icon name="chevron-left" size={17} /></button>
              <button onClick={() => setSlide((slide + 1) % HERO_SLIDES.length)} aria-label="다음"><Icon name="chevron-right" size={17} /></button>
            </div>
          </div>
        </div>
      </section>

      {isLoggedIn ? (
        /* ── (로그인) 나의 맞춤 쇼핑 기준 — 히어로 하단 흰 배경 구획 ── */
        <section className="home-personalization home-personalization-member home-personalization-hero">
          <div className="wrap">
            <div className="home-personalization-row">
              <div>
                <span className="eyebrow">나의 맞춤 쇼핑 기준</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--serif)', fontSize: 25, fontWeight: 500, letterSpacing: '-0.015em', color: 'var(--ink)' }}>
                    {goal}
                  </span>
                  {subFilters.length > 0 && (
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--brand-600)' }}>
                      {subFilters.join(' · ')}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 8 }}>{GOAL_GUIDE[goal]}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                <button
                  onClick={() => navigate('goalSetup')}
                  style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-600)', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}
                >
                  설정 변경 →
                </button>
                <button onClick={logout} style={{ fontSize: 13, fontWeight: 600, color: 'var(--faint)', whiteSpace: 'nowrap' }}>
                  로그아웃
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        /* ── (비로그인) 지금 나에게 맞는 쇼핑 기준 — 히어로 하단 흰 배경 구획 ── */
        <section className="home-personalization home-personalization-hero home-personalization-guest">
          <div className="wrap">
            <div style={{ marginBottom: 30 }}>
              <span className="eyebrow">맞춤 쇼핑</span>
              <h2 className="serif" style={{ fontSize: 30, marginTop: 10 }}>나에게 맞는 케어</h2>
              <p style={{ color: 'var(--muted)', marginTop: 10, fontSize: 14.5, maxWidth: 560 }}>
                관심있는 케어를 선택해 보세요.
              </p>
            </div>

            <div className="goal-select">
              {!activeGoal ? (
                <div className="gsel-row">
                  {GOALS.map((g, i) => (
                    <button
                      key={g.id}
                      className="gsel"
                      style={{ animationDelay: `${i * 0.06}s` }}
                      onClick={() => { setFocusGoal(g.name); setGoal(g.name) }}
                    >
                      <span className="gsel-en"><Icon name={g.icon} size={14} /> {g.en}</span>
                      <span className="gsel-name">{g.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="gsel-focus" key={focusGoal}>
                  <button className="gsel-current" onClick={() => setFocusGoal(null)} title="다른 목표 보기">
                    <span className="gsel-en"><Icon name={activeGoal.icon} size={14} /> {activeGoal.en}</span>
                    <span className="gsel-name">{activeGoal.name}</span>
                  </button>
                  <div className="gsel-focus-desc">
                    <p className="gsel-desc-text">{activeGoal.desc}</p>
                    <div className="gsel-guide"><Icon name="sparkles" size={14} /> {GOAL_GUIDE[activeGoal.name]}</div>
                    <button className="gsel-back" onClick={() => setFocusGoal(null)}>← 다른 목표 보기</button>
                  </div>
                </div>
              )}
            </div>

            {/* 비로그인 가입 안내 — 카드 없이 배경 위 텍스트 + 얇은 구분선 */}
            <div
              style={{
                marginTop: 44,
                paddingTop: 30,
                borderTop: '1px solid var(--line)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 24,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <span className="eyebrow">회원 맞춤 혜택</span>
                <h3 className="serif" style={{ fontSize: 22, marginTop: 6, color: 'var(--ink)' }}>
                  나만의 맞춤 웰빙 마켓을 완성하세요
                </h3>
                <p style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 6, maxWidth: 540 }}>
                  나에게 맞는 제품을 보여드립니다.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                <button className="btn btn-primary" onClick={() => navigate('register')}>
                  회원가입 <Icon name="arrow-up-right" size={16} />
                </button>
                <button className="btn btn-ghost" onClick={() => navigate('login')}>로그인</button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── 맞춤 추천 상품: 설명 콘텐츠보다 먼저 구매 진입점을 제공 ── */}
      <section className="section home-recommended">
        <div className="wrap">
          <div className="home-section-heading">
            <div className="section-head">
              <span className="eyebrow">맞춤 추천</span>
              <h2 className="serif">{goal}에 맞춘 추천 상품</h2>
              <p>{GOAL_GUIDE[goal]}</p>
            </div>
            <button type="button" className="more-link" onClick={() => goToProducts({ recommend: true })}>
              추천 상품 더보기 <Icon name="chevron-right" size={15} />
            </button>
          </div>
          {productsLoading ? (
            <div className="empty" aria-live="polite"><Icon name="package" size={40} /><h3>추천 상품을 불러오고 있습니다.</h3></div>
          ) : productsError ? (
            <div className="empty home-recommended-error" role="alert">
              <Icon name="alert-circle" size={40} />
              <h3>상품을 불러오지 못했어요.</h3>
              <p>잠시 후 다시 시도해 주세요.</p>
              <button type="button" className="btn btn-primary" onClick={reloadProducts}>다시 시도</button>
            </div>
          ) : recommended.length ? (
            <div className="product-grid">
              {recommended.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div className="empty"><Icon name="package" size={40} /><h3>현재 추천할 수 있는 상품이 없어요.</h3><p>전체 상품에서 다른 건강한 선택을 둘러보세요.</p><button type="button" className="btn btn-primary" onClick={() => goToProducts({ recommend: true })}>전체 상품 보기</button></div>
          )}
        </div>
      </section>

      {/* ── 오늘의 웰빙 테이블 (Shoppable image) ── */}
      <WellnessTable />
      <DailyRoutine />

      {/* ── 가치 배너 (Trust) ── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="values">
            {VALUES.map((v, i) => (
              <div key={i} className="value">
                <div className="v-ico"><Icon name={v.icon} size={19} /></div>
                <div>
                  <h4>{v.title}</h4>
                  <p>{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}
```

## src/pages/AllProducts.jsx

빠른 조건·알레르기 OFF·AI 상태·비교 선택

원본 줄 11–215

```jsx
const AI_EXAMPLES = ['카페인 없는 영양제 찾아줘', '당류 낮고 단백질 높은 간식 찾아줘', '저염 식품 찾아줘']

export default function AllProducts() {
  const {
    goal, search, setSearch, sortBy, setSortBy,
    subFilters, toggleSub, setSubFilters, allergies,
    products, productsLoading, productsError, reloadProducts, navigate,
    searchMode, aiResult: aiSearch, aiLoading, aiError, runAiSearch, clearAiSearch,
    shopCategory, shopSub, dealsOnly, setDealsOnly,
    isLoggedIn, showToast, authUserId,
  } = useStore()
  const allergyKey = `${authUserId || 'anonymous'}:${[...allergies].sort().join('|')}`
  const [shownAllergyKey, setShownAllergyKey] = useState(null)
  const hideAllergens = shownAllergyKey !== allergyKey
  const [compareIds, setCompareIds] = useState([])
  const [compareOpen, setCompareOpen] = useState(false)
  const availableIds = useMemo(() => availableFilterIds(shopCategory), [shopCategory])
  const availableFilters = useMemo(
    () => availableIds.map(id => SUB_FILTERS.find(filter => filter.id === id)).filter(Boolean),
    [availableIds],
  )
  const availableTags = useMemo(() => availableFilters.map(filter => filter.tag), [availableFilters])
  useEffect(() => {
    setSubFilters((current) => {
      const next = current.filter(tag => availableTags.includes(tag))
      return next.length === current.length ? current : next
    })
  }, [availableTags, setSubFilters])

  const filtered = useMemo(
    () => filterAndSort(products, { search: searchMode === 'ai' ? '' : search, subFilters, allergies, sortBy, goal, shopCategory, shopSub, dealsOnly, hideAllergens }),
    [products, search, searchMode, subFilters, allergies, sortBy, goal, shopCategory, shopSub, dealsOnly, hideAllergens],
  )

  const aiProducts = useMemo(() => {
    if (searchMode !== 'ai') return filtered
    if (aiLoading || aiError || !aiSearch) return []
    const sort = Object.entries(AI_SORT_TO_UI).find(([, ui]) => ui === sortBy)?.[0] || 'relevance'
    return filterAiProducts(filtered, aiSearch.filters, sort)
  }, [aiSearch, filtered, searchMode, aiLoading, aiError, sortBy])

  const title = searchMode === 'ai' ? 'AI 검색 결과' : dealsOnly ? '특가 상품' : `${shopCategory}${shopSub !== '전체' ? ` · ${shopSub}` : ''}`
  const compareProducts = useMemo(
    () => compareIds.map((id) => products.find((product) => product.id === id)).filter(Boolean),
    [compareIds, products],
  )
  const toggleCompare = (productId) => {
    setCompareIds((current) => {
      if (current.includes(productId)) return current.filter((id) => id !== productId)
      if (current.length >= 3) {
        showToast('상품은 최대 3개까지 비교할 수 있습니다.')
        return current
      }
      return [...current, productId]
    })
  }
  const openComparison = () => {
    if (compareProducts.length < 2) return
    if (!isLoggedIn) {
      showToast('상품 비교는 로그인 후 이용할 수 있습니다.')
      return
    }
    setCompareOpen(true)
  }

  return (
    <div className="wrap page">
      <div id="product-list" className="page-mid" style={{ margin: '0 auto' }}>
        <div className="page-head">
          <div>
            <span className="eyebrow">{goal} 기준 영양 강조</span>
            <h1 className="page-title" style={{ marginTop: 6 }}>{title}</h1>
          </div>
          <button className="btn btn-text btn-sm" onClick={() => navigate('main')}>← 홈으로</button>
        </div>

        {searchMode === 'normal' && search.trim() && !productsLoading && !productsError && (
          <div className="search-result-summary" aria-live="polite">
            <p><strong>‘{search.trim()}’</strong> 검색 결과 <b>{aiProducts.length}개</b></p>
            <button type="button" onClick={() => setSearch('')} aria-label={`${search.trim()} 검색어 제거`}>
              <span>{search.trim()}</span><Icon name="x" size={14} />
            </button>
          </div>
        )}

        {searchMode === 'ai' && !aiSearch && !aiLoading && !aiError && (
          <div className="ai-hint">
            <span className="ai-hint-label"><Icon name="sparkles" size={14} /> AI 자연어 검색 예시</span>
            {AI_EXAMPLES.map((ex) => (
              <button key={ex} type="button" className="chip" onClick={() => runAiSearch(ex)}>{ex}</button>
            ))}
          </div>
        )}

        {searchMode === 'ai' && aiLoading && (
          <div className="ai-result-summary" role="status">
            <div className="ai-result-head"><h3>검색 조건을 정리하고 있어요.</h3></div>
            <p className="ai-result-count">잠시만 기다려 주세요.</p>
          </div>
        )}

        {searchMode === 'ai' && aiError && (
          <div className="ai-result-summary" role="alert">
            <div className="ai-result-head"><h3>AI 검색을 완료하지 못했어요.</h3></div>
            <p className="ai-result-count">{aiError}</p>
            <div className="ai-error-actions">
              <button className="btn btn-soft btn-sm" onClick={() => runAiSearch()}>다시 시도</button>
              <button className="f-reset" onClick={clearAiSearch}>일반 검색으로 전환</button>
            </div>
          </div>
        )}

        {searchMode === 'ai' && aiSearch && (
          <div className="ai-result-summary">
            <div className="ai-result-head">
              <div>
                <span className="eyebrow">AI Search Result</span>
                <h3>AI가 이해한 검색 조건</h3>
              </div>
              <button type="button" className="f-reset" onClick={clearAiSearch}>전체 상품 보기</button>
            </div>
            <p className="ai-query">“{aiSearch.query}”</p>
            <div className="ai-condition-tags">
              {aiSearch.conditions.map((condition) => <span key={condition}>{condition}</span>)}
            </div>
            <p className="ai-fallback">수치 기준은 의료 기준이 아닌 CareMarket 내부 검색 기준입니다.</p>
            {aiSearch.filters.excluded_allergens.length > 0 && <p className="ai-fallback">등록된 성분 정보 기준으로 제외하며, 알레르기 안전을 보장하지 않습니다.</p>}
            {!productsLoading && !productsError && <p className="ai-result-count">조건에 맞는 상품 <b>{aiProducts.length}</b>개를 찾았습니다.</p>}
          </div>
        )}

        <div className="filterbar" style={{ marginBottom: 26 }}>
          <div className="filterbar-main">
            <div className="f-tags">
              <span className="f-label"><Icon name="sliders" size={15} /> 빠른 조건</span>
              {availableFilters.map((f) => (
                <button key={f.id} className={`chip${subFilters.includes(f.tag) ? ' on' : ''}`} onClick={() => toggleSub(f.tag)} title={f.hint}>
                  {subFilters.includes(f.tag) && <Icon name="check" size={13} strokeWidth={2.6} />}
                  {f.label}
                </button>
              ))}
              {subFilters.length > 0 && (
                <button className="f-reset" onClick={() => setSubFilters([])}>초기화</button>
              )}
            </div>
            {allergies.length > 0 && <div className="allergen-filter">
              <label><input type="checkbox" checked={hideAllergens} onChange={event => setShownAllergyKey(event.target.checked ? null : allergyKey)} /> 내 알레르기 성분 포함 상품 숨기기</label>
              <small>설정된 알레르기: {allergies.join(' · ')}</small>
            </div>}
          </div>
          <div className="f-sort">
            <span>총 <b>{aiProducts.length}</b>개</span>
            <span className="divider-v" />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="recommend">{searchMode === 'ai' ? '관련도순' : '맞춤 추천순'}</option>
              <option value="lowPrice">낮은 가격순</option>
              <option value="highPrice">높은 가격순</option>
              {searchMode === 'ai' && <>
                <option value="protein">단백질 높은순</option>
                <option value="sugar">당류 낮은순</option>
                <option value="sodium">나트륨 낮은순</option>
              </>}
            </select>
          </div>
        </div>

        {!productsLoading && !productsError && aiProducts.length > 0 && (
          <div className="compare-toolbar">
            <div><Icon name="cart" size={15} /><span>비교할 상품을 선택하세요</span><b>{compareIds.length}/3</b></div>
            <button type="button" className="btn btn-soft btn-sm" disabled={compareProducts.length < 2} onClick={openComparison}>비교하기</button>
          </div>
        )}

        {productsLoading ? (
          <div className="empty" aria-live="polite">
            <Icon name="package" size={44} />
            <h3>상품을 불러오고 있습니다.</h3>
            <p>최신 상품과 영양정보를 확인하는 중입니다.</p>
          </div>
        ) : productsError ? (
          <div className="empty" role="alert">
            <Icon name="alert-circle" size={44} />
            <h3>상품을 불러오지 못했습니다.</h3>
            <p>잠시 후 다시 시도해 주세요.</p>
            <button className="btn btn-primary" onClick={reloadProducts}>다시 불러오기</button>
          </div>
        ) : searchMode === 'ai' && (aiLoading || aiError) ? null : aiProducts.length === 0 ? (
          <div className="empty">
            <Icon name="alert-circle" size={44} />
            <h3>선택하신 조건에 맞는 상품이 없습니다.</h3>
            <p>저당·저염·고단백 등 보조 조건을 조정하거나 검색어를 초기화해 보세요.</p>
            <button className="btn btn-primary" onClick={() => { setSubFilters([]); setSearch(''); setDealsOnly(false); clearAiSearch() }}>조건 전체 초기화</button>
          </div>
        ) : (
          <div className="product-grid">
            {aiProducts.map((p) => (
              <ProductCard key={p.id} product={p} compareSelected={compareIds.includes(p.id)} onCompareToggle={toggleCompare} />
            ))}
          </div>
        )}
      </div>
      {compareOpen && <ProductComparisonModal products={compareProducts} goal={goal} onClose={() => setCompareOpen(false)} />}
    </div>
  )
}
```

## src/pages/ProductCollection.jsx

컬렉션 상태·알레르기 토글·목록. 데이터 조회 effect 제외

원본 줄 8–14

```jsx
export default function ProductCollection() {
  const { view, allergies, authUserId } = useStore()
  const allergyKey = `${view}:${authUserId || 'anonymous'}:${[...allergies].sort().join('|')}`
  const [shownAllergyKey, setShownAllergyKey] = useState(null)
  const hideAllergens = shownAllergyKey !== allergyKey
  const [state, setState] = useState({ loading: true, products: [], error: false })
  const [retry, setRetry] = useState(0)
```

원본 줄 24–37

```jsx
  const visibleProducts = state.products.filter(product => !hideAllergens || !matchingAllergens(product, allergies).length)
  const best = view === 'best'
  return <div className="wrap page"><div className="page-mid">
    <div className="page-head"><div><h1 className="page-title">{best ? '베스트' : '신상품'}</h1>
      <p>{best ? '결제가 완료된 주문의 판매 수량을 기준으로 만나보세요.' : '최근 등록된 상품부터 만나보세요.'}</p></div></div>
    {allergies.length > 0 && <div className="filterbar allergen-filter">
      <label><input type="checkbox" checked={hideAllergens} onChange={event => setShownAllergyKey(event.target.checked ? null : allergyKey)} /> 내 알레르기 성분 포함 상품 숨기기</label>
      <small>설정된 알레르기: {allergies.join(' · ')}</small>
    </div>}
    {state.loading ? <p role="status">상품을 불러오고 있습니다.</p> : state.error ? <div className="empty" role="alert"><p>상품을 불러오지 못했어요.</p><button className="btn btn-soft" onClick={() => { setState({ loading: true, products: [], error: false }); setRetry(n => n + 1) }}>다시 시도</button></div>
      : visibleProducts.length ? <div className="product-grid">{visibleProducts.map(p => <ProductCard key={p.id} product={p} />)}</div>
        : <div className="empty"><h3>{best ? '아직 판매 집계된 상품이 없어요.' : '등록된 상품이 없어요.'}</h3></div>}
  </div></div>
}
```

## src/pages/CustomShop.jsx

목적 없음과 맞춤 추천 행의 분기

원본 줄 1–149

```jsx
import { useMemo } from 'react'
import { useStore } from '../store'
import { filterAndSort, hasComparableNutrition } from '../lib/catalog'
import Icon from '../components/Icon'
import ProductCard from '../components/ProductCard'

// 목표별 추천 기준 안내 (실제 정렬 로직 goalScore와 일치하는 설명만 사용)
const GOAL_INTRO = {
  '근육량 증가': '단백질 식품을 우선하고 단백질·당류 정보를 함께 반영해요.',
  '체중 관리': '식사·단백질 식품을 우선하고 열량·당류 정보를 함께 반영해요.',
  '식단 영양 관리': '식단을 구성할 수 있는 식품을 우선하고 나트륨·당류 정보를 함께 반영해요.',
  '영양제 탐색': '영양제·비타민 상품을 먼저 보여드려요.',
}

// 추천 상품 묶음(행). 항목이 없으면 렌더하지 않는다.
function ProductRow({ title, hint, items }) {
  if (!items.length) return null
  return (
    <section className="foryou-row">
      <div className="foryou-row-head">
        <h2>{title}</h2>
        {hint && <span className="foryou-row-hint">{hint}</span>}
      </div>
      <div className="foryou-grid">
        {items.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  )
}

export default function CustomShop() {
  const {
    goal, subFilters, allergies,
    products, productsLoading, settingsLoading,
    isLoggedIn, navigate,
  } = useStore()

  // 로그인 회원인데 주 구매 목적이 없으면(goal === null) '조건 미설정' 상태다.
  const needsSetup = isLoggedIn && !goal
  const loading = productsLoading || (isLoggedIn && settingsLoading)

  // 알레르기 성분은 안전을 위해 어떤 행에서도 항상 제외한다.
  const safe = useMemo(
    () => (allergies.length ? products.filter((p) => !p.allergens.some((a) => allergies.includes(a))) : products),
    [products, allergies],
  )

  // 1) 오늘의 맞춤 상품 — 현재 목표/조건 기반 추천 정렬 (Home과 동일한 filterAndSort 재사용)
  const forYou = useMemo(
    () => (goal
      ? filterAndSort(products, { search: '', subFilters, allergies, sortBy: 'recommend', goal, shopCategory: '전체상품', shopSub: '전체' }).slice(0, 8)
      : []),
    [products, subFilters, allergies, goal],
  )

  // 2) 단백질 채우기 — 실제 단백질 함량(15g 이상) 기준
  const proteinRow = useMemo(
    () => [...safe].filter((p) => p.nutrition.protein >= 15).sort((a, b) => b.nutrition.protein - a.nutrition.protein).slice(0, 8),
    [safe],
  )

  // 3) 가볍게 즐기기 좋은 상품 — 실제 열량(200kcal 이하) 기준
  const lightRow = useMemo(
    () => [...safe]
      .filter((p) => hasComparableNutrition(p, '체중 관리') && p.nutrition.calories <= 200)
      .sort((a, b) => a.nutrition.calories - b.nutrition.calories || a.id - b.id)
      .slice(0, 8),
    [safe],
  )

  const intro = isLoggedIn
    ? (goal ? GOAL_INTRO[goal] : '')
    : '지금은 기본 추천을 보고 있어요. 로그인하면 나에게 맞는 추천을 받을 수 있어요.'

  // 현재 적용 중인 조건 칩 (실제 설정값만 표시)
  const excludeChips = allergies.map((a) => `${a} 제외`)

  return (
    <div className="wrap page">
      <div className="page-mid foryou-page" style={{ margin: '0 auto' }}>
        <header className="foryou-head">
          <div className="foryou-head-copy">
            <span className="eyebrow">FOR YOU</span>
            <h1 className="page-title" style={{ marginTop: 6 }}>나를 위한 웰니스 추천</h1>
            {!needsSetup && (
              <p className="foryou-sub">
                {goal && <><b>{goal}</b>에 맞춘 추천이에요. </>}
                {intro}
              </p>
            )}
            {!needsSetup && (subFilters.length > 0 || excludeChips.length > 0) && (
              <div className="foryou-chips">
                {subFilters.map((tag) => <span key={tag} className="foryou-chip">{tag}</span>)}
                {excludeChips.map((label) => <span key={label} className="foryou-chip foryou-chip-mute">{label}</span>)}
              </div>
            )}
          </div>
          <div className="foryou-head-actions">
            {isLoggedIn ? (
              <button type="button" className="btn btn-soft btn-sm" onClick={() => navigate('goalSetup')}>
                <Icon name="sliders" size={15} /> 추천 조건 변경
              </button>
            ) : (
              <button type="button" className="btn btn-soft btn-sm" onClick={() => navigate('login')}>
                <Icon name="user" size={15} /> 로그인하고 맞춤 추천 받기
              </button>
            )}
          </div>
        </header>

        {loading ? (
          <div className="empty" aria-live="polite">
            <Icon name="package" size={44} />
            <h3>맞춤 상품을 불러오고 있습니다.</h3>
            <p>현재 설정된 추천 기준을 확인하는 중입니다.</p>
          </div>
        ) : needsSetup ? (
          <div className="empty">
            <Icon name="sliders" size={44} />
            <h3>아직 맞춤 추천 기준이 설정되지 않았어요.</h3>
            <p>구매 목적과 선택 조건을 설정하면 나에게 맞는 상품을 모아서 보여드려요.</p>
            <button className="btn btn-primary" onClick={() => navigate('goalSetup')}>
              <Icon name="sliders" size={16} /> 추천 조건 설정하기
            </button>
          </div>
        ) : forYou.length === 0 && proteinRow.length === 0 && lightRow.length === 0 ? (
          <div className="empty">
            <Icon name="alert-circle" size={44} />
            <h3>조건에 맞는 상품이 없습니다.</h3>
            <p>선택 조건이나 제외 성분을 조정하면 더 많은 상품을 볼 수 있어요.</p>
            <button className="btn btn-primary" onClick={() => navigate('goalSetup')}>추천 조건 변경</button>
          </div>
        ) : (
          <>
            <ProductRow title="오늘의 맞춤 상품" hint={goal ? `${goal} 기준` : undefined} items={forYou} />
            <ProductRow title="단백질 채우기" hint="단백질 15g 이상" items={proteinRow} />
            <ProductRow title="가볍게 즐기기 좋은 상품" hint="200kcal 이하" items={lightRow} />

            <div className="foryou-foot">
              <button type="button" className="btn btn-text btn-sm" onClick={() => navigate('products')}>
                전체 상품 보기 <Icon name="chevron-right" size={15} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

## src/pages/GoalSetup.jsx

목적 1개·조건/성분 다중 선택·저장 CTA

원본 줄 1–100

```jsx
import { useState } from 'react'
import { useStore } from '../store'
import { GOALS, SUB_FILTERS, ALLERGENS } from '../data/mock'
import Icon from '../components/Icon'

export default function GoalSetup() {
  const {
    goal, setGoal, subFilters, toggleSub,
    allergies, toggleAllergy, saveWellnessSettings, settingsLoading,
  } = useStore()
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (isSaving || settingsLoading) return
    setIsSaving(true)
    try {
      await saveWellnessSettings()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="wrap page">
      <div className="page-narrow" style={{ margin: '0 auto' }}>
        <div className="panel panel-pad-lg">
          <div className="auth-head">
            <span className="tag tag-soft" style={{ marginBottom: 12 }}>CareMarket 맞춤 추천 기준</span>
            <h2 style={{ marginTop: 8 }}>내 맞춤 추천 기준</h2>
            <p>여기서 정한 구매 목적과 선택 조건에 따라 맞춤 상품의 추천 순서와 강조 영양 정보가 맞춰집니다. 언제든 바꿀 수 있어요. 주 구매 목적은 필수, 선택 조건은 자유롭게 고르세요.</p>
          </div>

          {/* 1단계 — 구입 목적 */}
          <div className="step">
            <div className="step-label"><span className="step-num">1</span> 주 구매 목적 <span style={{ color: 'var(--faint)', fontWeight: 500, fontSize: 13 }}>(필수 · 1개)</span></div>
            <div className="goal-pick-grid">
              {GOALS.map((g) => {
                const on = goal === g.name
                return (
                  <div key={g.id} className={`goal-pick${on ? ' on' : ''}`} onClick={() => setGoal(g.name)}>
                    <div className="gp-ico"><Icon name={g.icon} size={22} /></div>
                    <div style={{ flex: 1 }}>
                      <div className="gp-nm">{g.name} {on && <Icon name="check-circle" size={17} style={{ color: 'var(--brand-500)' }} />}</div>
                      <p className="gp-desc">{g.desc}</p>
                      <span className="gp-metric">강조 지표 · {g.focusMetric}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 2단계 — 보조 조건 */}
          <div className="step">
            <div className="step-label"><span className="step-num">2</span> 선택 조건 <span style={{ color: 'var(--faint)', fontWeight: 500, fontSize: 13 }}>(선택 · 다중)</span></div>
            <div className="sub-grid">
              {SUB_FILTERS.map((s) => {
                const on = subFilters.includes(s.tag)
                return (
                  <button key={s.id} className={`sub-pick${on ? ' on' : ''}`} onClick={() => toggleSub(s.tag)}>
                    <span>{s.label} <span style={{ opacity: 0.6, fontWeight: 500, fontSize: 11 }}>· {s.hint}</span></span>
                    <Icon name={on ? 'check' : 'plus'} size={15} strokeWidth={on ? 2.6 : 1.8} />
                  </button>
                )
              })}
            </div>
          </div>

          {/* 3단계 — 알레르기 제외 */}
          <div className="step">
            <div className="step-label"><span className="step-num">3</span> 알레르기 안심 제외 성분</div>
            <div className="allergy-wrap">
              {ALLERGENS.map((a) => {
                const on = allergies.includes(a)
                return (
                  <button key={a} className={`allergy${on ? ' on' : ''}`} onClick={() => toggleAllergy(a)}>
                    {on ? `✕ ${a} 제외됨` : `+ ${a}`}
                  </button>
                )
              })}
            </div>
            <p style={{ fontSize: 12, color: 'var(--faint)', marginTop: 10 }}>
              선택한 성분이 포함된 상품은 목록에서 기본적으로 숨겨집니다. 목록의 숨김 옵션을 해제하면 경고와 함께 확인할 수 있습니다.
            </p>
          </div>

          <div className="step">
            <button
              className="btn btn-primary btn-lg btn-block"
              onClick={handleSave}
              disabled={isSaving || settingsLoading}
            >
              <Icon name="check-circle" size={17} /> 이 조건으로 맞춤 상품 보기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

## src/components/ProductCard.jsx

상세 진입·찜·담기·비교

원본 줄 1–69

```jsx
import { AllergenBadges } from './GoalBadge'
import { useStore } from '../store'
import Icon from './Icon'
import GoalBadge from './GoalBadge'
import ProductImage from './ProductImage'
import { SampleRating } from './Stars'
import { discountRate, won } from '../lib/format'

export default function ProductCard({ product, compareSelected = false, onCompareToggle = null }) {
  const { goal, allergies, wishlist, toggleWish, addToCart, openProduct } = useStore()
  const wished = wishlist.includes(product.id)

  return (
    <article className="card">
      <div className="card-media" onClick={() => openProduct(product)}>
        <ProductImage src={product.image} alt={product.name} />
        {onCompareToggle && (
          <button
            type="button"
            className={`card-compare${compareSelected ? ' on' : ''}`}
            onClick={(event) => { event.stopPropagation(); onCompareToggle(product.id) }}
            aria-pressed={compareSelected}
          >
            <span className="card-compare-box">{compareSelected && <Icon name="check" size={12} strokeWidth={2.8} />}</span>
            비교
          </button>
        )}
        <button
          className="card-wish"
          onClick={(e) => { e.stopPropagation(); toggleWish(product.id) }}
          aria-label="위시리스트"
          style={wished ? { color: 'var(--danger)' } : undefined}
        >
          <Icon name="heart" size={17} fill={wished ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="card-body">
        <div className="card-top"><span className="card-brand">{product.brand}</span></div>

        <h3 className="card-name" onClick={() => openProduct(product)}>{product.name}</h3>
        <SampleRating productId={product.id} showSampleLabel={false} />

        <span className="card-origin">
          <Icon name="leaf" size={13} />
          <span>{product.origin}</span>
        </span>

        <div className="card-price">
          <div className="orig">{won(product.originalPrice)}</div>
          <div className="now">
            <span className="disc">{discountRate(product.originalPrice, product.price)}%</span>
            <span className="amt">{won(product.price)}</span>
          </div>
        </div>

        <GoalBadge goal={goal} product={product} />
                      <div><AllergenBadges product={product} allergies={allergies} /></div>

        <div className="card-actions">
          <button className="card-add" disabled={product.stock < 1} onClick={() => addToCart(product, 1)} aria-label={product.stock < 1 ? '품절' : '장바구니 담기'}>
            <Icon name="cart" size={18} />
            <span>담기</span>
          </button>
        </div>
      </div>
    </article>
  )
}
```

## src/components/GoalBadge.jsx

목적 영양 강조와 개인 알레르기 배지

원본 줄 1–45

```jsx
import { matchingAllergens } from '../lib/catalog'
import Icon from './Icon'
import { dailyPct } from '../lib/format'

// 사용자의 주목표에 따라 카드에서 강조되는 영양정보가 달라진다
export default function GoalBadge({ goal, product }) {
  const n = product.nutrition
  switch (goal) {
    case '근육량 증가':
      return (
        <div className="goal-badge gb-muscle">
          <span className="gb-label"><Icon name="dumbbell" size={15} /> 순수 단백질</span>
          <span className="gb-value">{n.protein}g <small>({dailyPct(n.protein, 55)}%)</small></span>
        </div>
      )
    case '체중 관리':
      return (
        <div className="goal-badge gb-weight">
          <span className="gb-label"><Icon name="flame" size={15} /> 열량 · 당류</span>
          <span className="gb-value">{n.calories}kcal <small>· 당 {n.sugar}g</small></span>
        </div>
      )
    case '영양제 탐색':
      return (
        <div className="goal-badge gb-supp">
          <span className="gb-label"><Icon name="pill" size={15} /> 핵심 활성</span>
          <span className="gb-value" title={n.special}>{n.special}</span>
        </div>
      )
    case '식단 영양 관리':
    default:
      return (
        <div className="goal-badge gb-diet">
          <span className="gb-label"><Icon name="leaf" size={15} /> 나트륨 · 당류</span>
          <span className="gb-value">{n.sodium}mg <small>({dailyPct(n.sodium, 2000)}%)</small></span>
        </div>
      )
  }
}

export function AllergenBadges({ product, allergies }) {
  return matchingAllergens(product, allergies).map(allergen => (
    <span className="tag allergen-badge" key={allergen}>⚠ {allergen} 포함</span>
  ))
}
```

## src/pages/ProductDetail.jsx

수량·예상금액·알레르기 경고·정보 탭·모바일 CTA

원본 줄 1–251

```jsx
import { matchingAllergens } from '../lib/catalog'
import { useState } from 'react'
import { useStore } from '../store'
import Icon from '../components/Icon'
import ProductImage from '../components/ProductImage'
import ProductReviews from '../components/ProductReviews'
import { SampleRating } from '../components/Stars'
import { discountRate, won } from '../lib/format'

const FREE_DELIVERY_THRESHOLD = 40000
const DELIVERY_FEE = 3000
const MAX_PURCHASE_QUANTITY = 99

export default function ProductDetail() {
  const {
    selectedProduct: p, productsLoading, productsError,
    goal, subFilters, allergies, wishlist, toggleWish, addToCart, navigate, setDrawerOpen, reloadProducts,
  } = useStore()
  const [tab, setTab] = useState('nutrition')
  const [quantity, setQuantity] = useState(1)
  const [purchasePending, setPurchasePending] = useState(false)

  if (!p) {
    const isError = !productsLoading && Boolean(productsError)
    return (
      <div className="wrap page page-narrow exception-page">
        <div className="empty" role={isError ? 'alert' : productsLoading ? 'status' : undefined}>
          <Icon name={isError ? 'alert-circle' : 'package'} size={44} />
          <h1>{productsLoading ? '상품을 불러오고 있습니다.' : isError ? '상품을 불러오지 못했어요.' : '상품을 찾을 수 없습니다.'}</h1>
          <p>{productsLoading ? '최신 상품 정보를 확인하는 중입니다.' : isError ? '잠시 후 다시 시도해 주세요.' : '판매가 종료되었거나 존재하지 않는 상품이에요.'}</p>
          {!productsLoading && (
            <div className="exception-actions">
              {isError && <button type="button" className="btn btn-primary" onClick={reloadProducts}>다시 시도</button>}
              <button type="button" className={isError ? 'btn btn-ghost' : 'btn btn-primary'} onClick={() => navigate('products')}>전체 상품 보기</button>
              {!isError && <button type="button" className="btn btn-text" onClick={() => navigate('main')}>← 홈으로 돌아가기</button>}
            </div>
          )}
        </div>
      </div>
    )
  }

  const allergenMatches = matchingAllergens(p, allergies)
  const wished = wishlist.includes(p.id)
  const n = p.nutrition
  const maxQuantity = Math.max(1, Math.min(Math.floor(p.stock), MAX_PURCHASE_QUANTITY))
  const unavailable = p.stock < 1
  const itemTotal = p.price * quantity
  const estimatedDeliveryFee = itemTotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE
  const estimatedTotal = itemTotal + estimatedDeliveryFee
  const rate = discountRate(p.originalPrice, p.price)
  const matches = {
    저당: n.sugar <= 5,
    저염: n.sodium <= 250,
    고단백: n.protein >= 15,
    '카페인 제외': !p.caffeine,
    '알레르기 제외': !allergies.some((allergen) => p.allergens.includes(allergen)),
  }
  const activeConditions = subFilters.filter((filter) => matches[filter] !== undefined)
  const matchedCount = activeConditions.filter((filter) => matches[filter]).length
  const conditionText = (condition) => {
    if (condition === '알레르기 제외' && allergies.length === 0) return '선택한 제외 성분 정보 없음'
    return `${condition} 탐색 기준과 ${matches[condition] ? '일치' : '다름'}`
  }
  const changeQuantity = (delta) => {
    setQuantity((current) => Math.min(maxQuantity, Math.max(1, current + delta)))
  }
  const addSelectedToCart = async () => {
    if (purchasePending || unavailable) return
    setPurchasePending(true)
    try {
      await addToCart(p, quantity)
    } finally {
      setPurchasePending(false)
    }
  }
  const moveToCartForPurchase = async () => {
    if (purchasePending || unavailable) return
    setPurchasePending(true)
    try {
      if (await addToCart(p, quantity)) {
        setDrawerOpen(false)
        navigate('cart')
      }
    } finally {
      setPurchasePending(false)
    }
  }

  return (
    <div className="wrap page product-detail-page">
      <div className="crumbs">
        <span className="c-link" onClick={() => navigate('main')}>홈</span>
        <Icon name="chevron-right" size={13} />
        <span className="c-link" onClick={() => navigate('products')}>상품 목록</span>
        <Icon name="chevron-right" size={13} />
        <span className="cur">{p.name}</span>
      </div>

      <div className="detail-grid">
        <div>
          <div className="detail-media"><ProductImage src={p.image} alt={p.name} /></div>
        </div>

        <section className="detail-info" aria-labelledby="product-title">
          <div className="detail-brand-row">
            <span><b>{p.brand}</b><i aria-hidden="true">·</i>{p.category}</span>
            <button className="detail-wish" onClick={() => toggleWish(p.id)} aria-label={wished ? '위시리스트에서 제외' : '위시리스트에 추가'} style={wished ? { color: 'var(--danger)' } : undefined}>
              <Icon name="heart" size={20} fill={wished ? 'currentColor' : 'none'} />
            </button>
          </div>
          <h1 id="product-title" className="detail-title">{p.name}</h1>
          <SampleRating productId={p.id} />

          <div className="detail-price" aria-label="상품 가격">
            {rate > 0 && <span className="disc">{rate}% 할인</span>}
            {p.originalPrice > p.price && <span className="orig">정상가 {won(p.originalPrice)}</span>}
            <span className="amt"><small>판매가</small>{p.price.toLocaleString('ko-KR')}<em>원</em></span>
          </div>

          <div className="detail-delivery">
            <Icon name="truck" size={18} />
            <div>
              <b>{estimatedDeliveryFee === 0 ? '무료배송 적용' : `배송비 ${won(DELIVERY_FEE)}`}</b>
              <span>이 상품 합계 {won(FREE_DELIVERY_THRESHOLD)} 이상 무료배송</span>
            </div>
          </div>

          {allergenMatches.length > 0 && <div className="allergen-warning" role="note">
            <strong>⚠ 설정하신 알레르기 성분이 포함된 상품입니다.</strong>
            <p>이 상품에는 '{allergenMatches.join(', ')}' 성분이 포함되어 있습니다. 회원님이 제외하도록 설정한 성분입니다. 상품의 원재료 및 알레르기 정보를 확인한 후 선택해주세요.</p>
            <button type="button" className="btn btn-text btn-sm" onClick={() => { setTab('info'); document.getElementById('product-information')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>알레르기 정보 확인</button>
          </div>}
          <div className="detail-order-box">
            <div className="detail-quantity-row">
              <div>
                <b>수량</b>
                <span>{unavailable ? '현재 구매할 수 없습니다.' : `한 번에 최대 ${maxQuantity}개`}</span>
              </div>
              <div className="detail-quantity" role="group" aria-label="상품 수량 선택">
                <button type="button" onClick={() => changeQuantity(-1)} disabled={quantity <= 1 || unavailable} aria-label="수량 줄이기">−</button>
                <output aria-live="polite" aria-label={`선택 수량 ${quantity}개`}>{quantity}</output>
                <button type="button" onClick={() => changeQuantity(1)} disabled={quantity >= maxQuantity || unavailable} aria-label="수량 늘리기">+</button>
              </div>
            </div>
            <div className="detail-total-breakdown">
              <span>상품금액 {won(itemTotal)} + 배송비 {estimatedDeliveryFee === 0 ? '무료' : won(estimatedDeliveryFee)}</span>
              <div><b>예상 결제금액</b><strong>{won(estimatedTotal)}</strong></div>
            </div>
          </div>

          <div className="detail-actions">
            <button className="btn btn-ghost" onClick={addSelectedToCart} disabled={purchasePending || unavailable}>
              <Icon name="cart" size={17} /> {purchasePending ? '처리 중…' : '장바구니 담기'}
            </button>
            <button className="btn btn-primary" onClick={moveToCartForPurchase} disabled={purchasePending || unavailable}>
              {unavailable ? '품절' : '장바구니에서 구매하기'}
            </button>
          </div>
          <p className="detail-purchase-note">선택 수량을 담고 장바구니 확인 단계로 이동합니다. 최종 금액은 장바구니 전체 상품에 따라 달라질 수 있습니다.</p>
        </section>
      </div>

      <section className="detail-description" aria-labelledby="detail-description-title">
        <span>상품 설명</span>
        <h2 id="detail-description-title">{p.name}</h2>
        <p>{p.summary || '등록된 상품 설명이 없습니다.'}</p>
      </section>

      <div className="tabs" id="product-information">
        <div className="tab-nav no-scrollbar">
          {[
            { id: 'nutrition', label: '영양정보' },
            { id: 'info', label: '원재료 및 알레르기' },
            { id: 'qna', label: '배송 · 교환 · 반품' },
          ].map((t) => (
            <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>

        <div className="tab-panel">
          {tab === 'nutrition' && (
            <div className="nutri-card">
              <div className="nutri-head">
                <div>
                  <h4>영양성분 정보</h4>
                  <div className="serv">1회 섭취 기준 · {n.servingSize} · 지방 {n.fat}g</div>
                </div>
                <span className="kcal">{n.calories} kcal</span>
              </div>
              <div className="nutri-grid">
                <div className="nutri-cell"><div className="k">단백질</div><div className="v">{n.protein}g</div></div>
                <div className="nutri-cell"><div className="k">탄수화물</div><div className="v">{n.carbs}g</div></div>
                <div className="nutri-cell"><div className="k">당류</div><div className="v">{n.sugar}g</div></div>
                <div className="nutri-cell"><div className="k">나트륨</div><div className="v">{n.sodium}mg</div></div>
              </div>
            </div>
          )}

          {tab === 'info' && (
            <div className="prose">
              <p>아래 정보는 상품에 등록된 원재료와 영양성분을 바탕으로 안내합니다.</p>
              <div className="box">
                <div>주요 원재료 · {p.mainIngredients.length ? p.mainIngredients.join(', ') : '상품 표시 정보 참조'}</div>
                <div>알레르기 주의 물질 · {p.allergens.length ? p.allergens.join(', ') : '표시된 관리 대상 성분 없음'}</div>
                <div>카페인 · {p.caffeine ? '함유' : '미함유'}</div>
              </div>
            </div>
          )}

          {tab === 'qna' && (
            <div className="prose">
              <p style={{ fontWeight: 700, color: 'var(--ink)' }}>배송 및 주문 안내</p>
              <div className="box">
                <div>· 배송비는 {won(DELIVERY_FEE)}이며, 상품 합계 {won(FREE_DELIVERY_THRESHOLD)} 이상 주문 시 무료입니다.</div>
                <div>· 주문 및 배송 상태는 결제 완료 후 주문내역에서 확인할 수 있습니다.</div>
                <div>· 교환 및 반품의 세부 조건은 현재 등록된 정책 정보가 없어 별도 확인이 필요합니다.</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <section className="detail-match" aria-labelledby="personal-analysis-title">
        <div className="top">
          <span id="personal-analysis-title" className="t"><Icon name="sparkles" size={16} /> 내 목표 기준 분석</span>
        </div>
        {activeConditions.length ? (
          <>
            <div className="detail-match-settings">현재 설정 · {goal} · {activeConditions.join(' · ')}</div>
            <div className="detail-match-list">
              {activeConditions.map((condition) => (
                <span key={condition}>{matches[condition] ? '✓' : '·'} {conditionText(condition)}</span>
              ))}
            </div>
            <p>설정한 탐색 조건 {matchedCount}/{activeConditions.length} 일치</p>
          </>
        ) : (
          <p className="detail-match-empty">보조 조건을 설정하면 이 상품이 내 탐색 기준과 얼마나 맞는지 확인할 수 있습니다.</p>
        )}
      </section>

      <ProductReviews key={p.id} product={p} />
      <aside className="detail-mobile-buy" aria-label="모바일 구매 영역">
        <div><span>예상 결제금액</span><strong>{won(estimatedTotal)}</strong></div>
        <button className="btn btn-ghost" onClick={addSelectedToCart} disabled={purchasePending || unavailable}>담기</button>
        <button className="btn btn-primary" onClick={moveToCartForPurchase} disabled={purchasePending || unavailable}>{unavailable ? '품절' : '장바구니 확인'}</button>
      </aside>
    </div>
  )
}
```

## src/components/CartDrawer.jsx

Drawer 표시·닫기·수량·경고·주문

원본 줄 1–122

```jsx
import { AllergenBadges } from './GoalBadge'
import { useStore } from '../store'
import Icon from './Icon'
import { won } from '../lib/format'
import CartAiInsight from './CartAiInsight'

const formatNutrientValue = (value) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return null
  return number.toLocaleString('ko-KR', { maximumFractionDigits: 1 })
}

function getGoalNutrientLabel(goal, product) {
  const nutrition = product?.nutrition
  if (!nutrition) return null

  if (goal === '근육량 증가') {
    const protein = formatNutrientValue(nutrition.protein)
    return protein == null ? null : `단백질 ${protein}g`
  }

  if (goal === '체중 관리') {
    const calories = formatNutrientValue(nutrition.calories)
    return calories == null ? null : `${calories}kcal`
  }

  if (goal === '식단 영양 관리') {
    const sodium = formatNutrientValue(nutrition.sodium)
    return sodium == null ? null : `나트륨 ${sodium}mg`
  }

  // 영양제 탐색은 구조화된 실제 micronutrient 데이터가 있을 때만 표시한다.
  return null
}

export default function CartDrawer() {
  const {
    drawerOpen, setDrawerOpen, cart, changeCartQty, removeFromCart,
    cartTotal, deliveryFee, cartCount, checkout, navigate,
    cartLoading, cartPending, cartError, reloadCart, goal, allergies,
  } = useStore()

  if (!drawerOpen) return null

  return (
    <>
      <div className="overlay" onClick={() => setDrawerOpen(false)} />
      <aside className="drawer" aria-label="장바구니">
        <div className="drawer-head">
          <div className="dh-title">
            <Icon name="cart" size={19} style={{ color: 'var(--brand-500)' }} />
            <h3>내 장바구니</h3>
            <span className="tag tag-soft">{cartCount}개</span>
          </div>
          <button className="icon-btn" onClick={() => setDrawerOpen(false)} aria-label="닫기">
            <Icon name="x" size={19} />
          </button>
        </div>

        <div className="drawer-body">
          {cartError && <div className="cart-status" role="alert">{cartError} <button className="btn btn-soft btn-sm" onClick={reloadCart}>다시 불러오기</button></div>}
          {cartLoading && <p className="cart-status" role="status">장바구니를 불러오고 있습니다.</p>}
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--faint)' }}>
              <Icon name="leaf" size={38} style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: 13 }}>{cartLoading ? '잠시만 기다려 주세요.' : cartError ? '장바구니를 확인할 수 없습니다.' : '담긴 상품이 없습니다.'}</p>
            </div>
          ) : cart.map(({ product, quantity }) => {
              const nutrientLabel = getGoalNutrientLabel(goal, product)

              return (
                <div key={product.id} className="drawer-item">
                  <div className="drawer-item-media">
                    <img src={product.image} alt={product.name} onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />
                    {nutrientLabel && (
                      <div className="di-nutrient" title="1회 제공량 기준" aria-label={`${nutrientLabel}, 1회 제공량 기준`}>
                        {nutrientLabel}
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="di-brand">{product.brand}</div>
                    <div className="di-name">{product.name}</div>
                      <div><AllergenBadges product={product} allergies={allergies} /></div>
                    <div className="di-price">{won(product.price * quantity)}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                      <div className="qty-stepper">
                        <button aria-label="수량 감소" disabled={quantity <= 1} onClick={() => changeCartQty(product.id, -1)}><Icon name="minus" size={13} /></button>
                        <span>{quantity}</span>
                        <button aria-label="수량 증가" disabled={quantity >= product.stock || cartPending > 0} onClick={() => changeCartQty(product.id, 1)}><Icon name="plus" size={13} /></button>
                      </div>
                      <button className="link-del" onClick={() => removeFromCart(product.id)}>삭제</button>
                    </div>
                    {quantity >= product.stock && <small role="status">현재 구매 가능한 최대 수량입니다.</small>}
                  </div>
                </div>
              )
            })
          }
        </div>

        {cart.length > 0 && (
          <div className="drawer-foot">
            <CartAiInsight compact />
            <div className="drawer-pricing">
              <div className="sum-row"><span>상품 합계</span><b>{won(cartTotal)}</b></div>
              <div className="sum-row"><span>신선 배송비 (4만원 이상 무료)</span><b>{deliveryFee === 0 ? '무료' : won(deliveryFee)}</b></div>
              <div className="sum-total">
                <span className="lbl">결제 예정</span>
                <span className="val">{won(cartTotal + deliveryFee)}</span>
              </div>
            </div>
            <div className="drawer-cta">
              <button className="btn btn-text" onClick={() => { setDrawerOpen(false); navigate('cart') }}>장바구니 상세 보기</button>
              <button className="btn btn-primary" disabled={cartLoading || cartPending > 0 || Boolean(cartError)} onClick={checkout}>주문하기</button>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
```

## src/pages/Cart.jsx

낙관적 수량·전체금액·접힘·AI 분석

원본 줄 1–190

```jsx
import { AllergenBadges } from '../components/GoalBadge'
import { useMemo, useState } from 'react'
import { useStore } from '../store'
import Icon from '../components/Icon'
import { won } from '../lib/format'
import { calculateCartPricing } from '../lib/cart'
import { GOAL_NUTRIENTS, NUTRIENT_META, fmtNutrient } from '../lib/nutrition'
import CartAiInsight from '../components/CartAiInsight'


export default function Cart() {
  const {
    cart, changeCartQty, removeFromCart, openProduct, navigate,
    checkout, goal, allergies, cartLoading, cartPending, cartError, reloadCart,
  } = useStore()
  const [optimisticQuantities, setOptimisticQuantities] = useState({})
  const [productsExpanded, setProductsExpanded] = useState(false)
  const displayCart = useMemo(() => cart.map((item) => ({
    ...item,
    quantity: optimisticQuantities[item.product.id] ?? item.quantity,
  })), [cart, optimisticQuantities])
  const {
    productTotal: cartTotal,
    deliveryFee,
    paymentTotal,
    freeDeliveryRemaining,
  } = calculateCartPricing(displayCart)
  const cartCount = displayCart.reduce((sum, item) => sum + item.quantity, 0)
  const goalKeys = GOAL_NUTRIENTS[goal] || []
  const isSupplement = goal === '영양제 탐색'
  const isBusy = cartLoading || cartPending > 0
  const canCollapseProducts = displayCart.length > 3
  const visibleProducts = canCollapseProducts && !productsExpanded ? displayCart.slice(0, 3) : displayCart

  const productNutri = (product) => {
    if (isSupplement) return product.nutrition.special || `${product.category} 카테고리`
    if (!goalKeys.length) return '등록된 상품 영양정보 기준'
    return goalKeys
      .map((key) => `${NUTRIENT_META[key].label} ${fmtNutrient(key, product.nutrition[key])}`)
      .join(' · ')
  }

  const updateQuantity = async (productId, currentQuantity, delta) => {
    const nextQuantity = Math.max(1, currentQuantity + delta)
    if (delta > 0 && nextQuantity > cart.find(item => item.product.id === productId)?.product.stock) return
    if (nextQuantity === currentQuantity) return

    setOptimisticQuantities((current) => ({ ...current, [productId]: nextQuantity }))
    await changeCartQty(productId, delta)
    setOptimisticQuantities((current) => {
      if (current[productId] !== nextQuantity) return current
      const next = { ...current }
      delete next[productId]
      return next
    })
  }

  const removeItem = (productId) => {
    setOptimisticQuantities((current) => {
      if (!(productId in current)) return current
      const next = { ...current }
      delete next[productId]
      return next
    })
    return removeFromCart(productId)
  }

  return (
    <div className="wrap page cart-page">
      <div className="page-mid cart-page-inner">
        <div className="page-head cart-page-head">
          <div>
            <h1 className="page-title">장바구니</h1>
            <p>담은 상품과 수량을 확인한 뒤 주문을 진행해 주세요.</p>
          </div>
          <span>총 {cart.length}종 · {cartCount}개</span>
        </div>

        {cartLoading ? (
          <div className="empty cart-empty" role="status">
            <Icon name="cart" size={44} />
            <h3>장바구니를 불러오고 있습니다.</h3>
            <p>담아둔 상품을 확인하는 중입니다.</p>
          </div>
        ) : cartError ? (
          <div className="empty cart-empty" role="alert">
            <Icon name="alert-circle" size={44} />
            <h3>장바구니를 불러오지 못했어요.</h3>
            <p>잠시 후 다시 시도해 주세요.</p>
            <button type="button" className="btn btn-primary" onClick={reloadCart}>다시 시도</button>
          </div>
        ) : cart.length === 0 ? (
          <div className="empty cart-empty">
            <Icon name="cart" size={44} />
            <h3>장바구니가 비어 있어요.</h3>
            <p>건강한 선택을 담아보세요.</p>
            <button className="btn btn-primary" onClick={() => navigate('products')}>상품 둘러보기</button>
          </div>
        ) : (
          <>
            <div className="cart-layout">
              <section className="cart-products" aria-labelledby="cart-products-title" aria-busy={isBusy}>
                <div className="cart-section-head">
                  <h2 id="cart-products-title">주문 상품</h2>
                  <span>{cart.length}종 · {cartCount}개</span>
                </div>

                <div id="cart-product-list">
                {visibleProducts.map(({ product, quantity }) => (
                  <article key={product.id} className="cart-item">
                    <button type="button" className="ci-image-button" onClick={() => openProduct(product)} aria-label={`${product.name} 상세 보기`}>
                      <img src={product.image} alt="" onError={(event) => { event.currentTarget.style.visibility = 'hidden' }} />
                    </button>
                    <div className="ci-info">
                      <div className="ci-brand">{product.brand}</div>
                      <button type="button" className="ci-name" onClick={() => openProduct(product)}>{product.name}</button>
                      <div><AllergenBadges product={product} allergies={allergies} /></div>
                      <div className="ci-unit-price"><span>판매가</span><strong>{won(product.price)}</strong></div>
                      <div className="ci-nutri">
                        <span className="ci-nutri-goal">{goal || '일반 영양 정보'}</span>
                        <span className="ci-nutri-vals">{productNutri(product)}</span>
                      </div>
                    </div>
                    <div className="ci-purchase">
                      <div className="ci-item-total">
                        <span>상품 합계</span>
                        <strong>{won(product.price * quantity)}</strong>
                      </div>
                      <div className="ci-controls">
                        <span className="ci-quantity-label">수량</span>
                        <div className="qty-stepper">
                          <button type="button" aria-label={`${product.name} 수량 감소`} disabled={quantity <= 1 || Boolean(cartError)} onClick={() => updateQuantity(product.id, quantity, -1)}><Icon name="minus" size={14} /></button>
                          <span aria-live="polite">{quantity}</span>
                          <button type="button" aria-label={`${product.name} 수량 증가`} disabled={quantity >= product.stock || isBusy || Boolean(cartError)} onClick={() => updateQuantity(product.id, quantity, 1)}><Icon name="plus" size={14} /></button>
                        </div>
                      </div>
                      {quantity >= product.stock && <small role="status">현재 구매 가능한 최대 수량입니다.</small>}
                      <button type="button" className="del" onClick={() => removeItem(product.id)} disabled={isBusy || Boolean(cartError)}>
                        <Icon name="trash" size={15} /> 삭제
                      </button>
                    </div>
                  </article>
                ))}
                </div>
                {canCollapseProducts && (
                  <button type="button" className="btn btn-soft btn-sm cart-products-toggle" aria-expanded={productsExpanded} aria-controls="cart-product-list" onClick={() => setProductsExpanded((expanded) => !expanded)}>
                    {productsExpanded ? '상품 접기' : `나머지 ${displayCart.length - 3}종 더 보기`}
                    <Icon name={productsExpanded ? 'chevron-up' : 'chevron-down'} size={16} />
                  </button>
                )}
              </section>

              <aside className="summary cart-order-summary" aria-labelledby="cart-summary-title" aria-live="polite">
                <div className="cart-summary-head">
                  <h2 id="cart-summary-title">주문 금액</h2>
                  {cartPending > 0 && <span>금액 반영 중…</span>}
                </div>
                <div className="sum-row"><span>상품금액</span><b>{won(cartTotal)}</b></div>
                <div className="sum-row"><span>배송비</span><b>{deliveryFee === 0 ? '무료' : won(deliveryFee)}</b></div>
                <div className={`delivery-progress${deliveryFee === 0 ? ' complete' : ''}`}>
                  <Icon name={deliveryFee === 0 ? 'check' : 'truck'} size={15} />
                  <span>{deliveryFee === 0 ? '무료배송이 적용됐어요' : `무료배송까지 ${won(freeDeliveryRemaining)} 남았어요`}</span>
                </div>
                <div className="sum-total">
                  <span className="lbl">예상 결제금액</span>
                  <span className="val">{won(paymentTotal)}</span>
                </div>
                <button className="btn btn-primary btn-lg btn-block cart-checkout-button" disabled={isBusy || Boolean(cartError)} onClick={checkout}>
                  {cartCount}개 상품 주문하기 <Icon name="chevron-right" size={17} />
                </button>
                <p className="cart-summary-note">결제 단계에서 배송지와 결제수단을 입력합니다.</p>
              </aside>

              <section className="cart-wellness" aria-labelledby="cart-wellness-title">
                <div className="cart-wellness-content">
                  <CartAiInsight cartOverride={displayCart} />
                </div>
              </section>
            </div>

            <div className="cart-mobile-checkout" aria-label="모바일 주문 요약">
              <div><span>예상 결제금액</span><strong>{won(paymentTotal)}</strong></div>
              <button className="btn btn-primary" disabled={isBusy || Boolean(cartError)} onClick={checkout}>{cartCount}개 주문하기</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

## src/components/CartAiInsight.jsx

기본 분석/AI 요청/캐시/변경 상태와 상세·compact UI. 분석 함수 자체는 제외

원본 줄 14–286

```jsx
const INITIAL_ANALYSIS = { status: 'idle', signature: '', insight: null }

function BalanceItems({ items, compact = false }) {
  if (!items?.length) return null
  return (
    <div className={`cart-ai-balance-items${compact ? ' compact' : ''}`} aria-label="영양 구성">
      {items.map((item) => (
        <div key={item.key} className={`cart-ai-balance-item is-${item.status}`} title={item.reason}>
          <Icon name={item.status === 'good' ? 'check' : 'alert-circle'} size={compact ? 13 : 15} />
          <span>{item.label}</span>
          <b>{item.text}</b>
        </div>
      ))}
    </div>
  )
}

// Presentation only: shorten existing findings without changing classifications.
const shortCopy = (text = '', sentences = 2) => {
  const copy = text.split(/(?<=[.!?])\s+/).slice(0, sentences).join(' ')
  return copy.length > 180 ? copy.slice(0, 177).trimEnd() + '…' : copy
}
const briefReason = (text = '') => text
  .replace('등록 제공량 기준 열량이 현재 장바구니 상품 종류별 평균보다 높습니다.', '다른 상품보다 열량이 높은 편이에요.')
  .replace(/설정하신 알레르기 성분\([^)]+\)이 포함되어 있습니다. 원재료 정보를 확인해주세요./, '설정하신 알레르기 성분이 포함되어 있어 원재료 확인이 필요합니다.')
  .replace('비교 정보가 충분하지 않아 판정을 보류했습니다.', '비교 정보를 확인해주세요.')
  .replace(/(단백질|당류|나트륨) [\d.]+(?:mg|g)으로 기존 (.+?) 탐색 기준 밖입니다./, '$2 기준 밖으로 표시 정보를 확인해주세요.')

const METRIC_HINTS = { sugar: '당류 기준 충족', protein: '단백질 기준 충족', sodium: '나트륨 기준 충족', calories: '현재 장바구니 내 비교', attention: '추가 확인 권장', protein_complement: '단백질 기준 확인', supplement: '구매 목적의 상품군', caffeine: '등록 성분 기준' }

function FindingCard({ title, items, attention = false }) {
  return <section className={`cart-ai-finding${attention ? ' is-attention' : ''}`}>
    <h4><Icon name={attention ? 'alert-circle' : 'check-circle'} size={17} />{title}</h4>
    <ul>{items.slice(0, 3).map((item, index) => <li key={index}>
      <span aria-hidden="true">{attention ? '!' : '✓'}</span><p>{item}</p>
    </li>)}</ul>
    {items.length > 3 && <small>외 {items.length - 3}개 · 상품별 자세히 보기에서 확인</small>}
  </section>
}

export default function CartAiInsight({ compact = false, cartOverride = null }) {
  const {
    cart, cartLoading, cartPending, cartError,
    goal, subFilters, allergies, settingsLoading,
    navigate, navigateToCatalog, setSubFilters, setDrawerOpen, authUserId,
  } = useStore()
  const analysisCart = cartOverride || cart
  const requestIdRef = useRef(0)
  const loadingRef = useRef(false)
  const signatureRef = useRef('')
  const cartSignature = useMemo(() => analysisCart
    .map(({ product }) => JSON.stringify([product.id, product.nutrition, product.allergens, product.category]))
    .sort()
    .join('|'), [analysisCart])
  const criteriaSignature = [
    goal || '',
    [...subFilters].sort().join(','),
    [...allergies].sort().join(','),
  ].join('|')
  const analysisKey = `${authUserId || 'anonymous'}|${criteriaSignature}|${cartSignature}`
  const localFallback = useMemo(() => {
    const context = { primaryGoal: goal, selectedConditions: subFilters, excludedAllergens: allergies }
    const deterministic = analyzeCartNutrition(analysisCart, context)
    return composeCartInsight(deterministic, cartAnalysisBasis(context))
  }, [analysisCart, goal, subFilters, allergies])
  const [analysis, setAnalysis] = useState(() => {
    const cached = getCachedCartSummary(analysisKey)
    return cached
      ? { status: 'success', signature: analysisKey, insight: cached }
      : INITIAL_ANALYSIS
  })
  const unavailable = settingsLoading || cartLoading || cartPending > 0 || Boolean(cartError) || !cartSignature

  useEffect(() => {
    signatureRef.current = analysisKey
    requestIdRef.current += 1
    loadingRef.current = false
  }, [analysisKey])

  const cachedForCurrentKey = getCachedCartSummary(analysisKey)
  const renderedAnalysis = analysis.signature !== analysisKey && cachedForCurrentKey
    ? { status: 'success', signature: analysisKey, insight: cachedForCurrentKey }
    : analysis
  const cartChanged = Boolean(renderedAnalysis.signature && renderedAnalysis.signature !== analysisKey)
  const visibleStatus = cartChanged
    ? (renderedAnalysis.status === 'success' || renderedAnalysis.status === 'loading' ? 'stale' : 'idle')
    : renderedAnalysis.status

  const analyze = async () => {
    if (loadingRef.current || unavailable) return
    loadingRef.current = true
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    const requestedSignature = analysisKey
    setAnalysis({ status: 'loading', signature: requestedSignature, insight: null })

    try {
      const response = await requestCartSummary(requestedSignature)
      const basisKey = basis => JSON.stringify([
        basis?.primary_goal || null,
        [...(basis?.selected_conditions || [])].sort(),
        [...(basis?.excluded_allergens || [])].sort(),
      ])
      // Catalog quick filters can differ from persisted profile preferences.
      // Never label a saved-profile narrative as an analysis of different local criteria.
      const insight = basisKey(response.basis) === basisKey(localFallback.basis) ? response : localFallback
      if (requestIdRef.current === requestId && signatureRef.current === requestedSignature) {
        setCachedCartSummary(requestedSignature, insight)
        setAnalysis({ status: 'success', signature: requestedSignature, insight })
      }
    } catch {
      if (requestIdRef.current === requestId && signatureRef.current === requestedSignature) {
        setCachedCartSummary(requestedSignature, localFallback)
        setAnalysis({ status: 'success', signature: requestedSignature, insight: localFallback })
      }
    } finally {
      if (requestIdRef.current === requestId) loadingRef.current = false
    }
  }

  const openSettings = () => {
    if (compact) setDrawerOpen(false)
    navigate('goalSetup')
  }

  const openDetailedAnalysis = () => {
    setDrawerOpen(false)
    navigate('cart')
  }

  const openComplementProducts = () => {
    const filterLabel = insight?.recommendation?.filterLabel
    setDrawerOpen(false)
    navigateToCatalog(goal === '영양제 탐색' ? '영양제' : '전체상품', '전체')
    setSubFilters(filterLabel ? [filterLabel] : [])
  }

  const localCriteriaSet = Boolean(goal || subFilters.length || allergies.length)
  const insight = visibleStatus === 'success' ? renderedAnalysis.insight : localFallback
  const headline = insight?.headline
  const basis = insight?.basis
  const actions = insight?.actions || []
  const hasComplementFilter = Boolean(insight?.recommendation)
  const productReasons = insight?.productReasons || []
  const metrics = insight?.balanceItems || []
  const attentionMetric = metrics.find(item => item.key === 'attention')
  const mainMetrics = [...metrics.filter(item => item.key !== 'attention').slice(0, 3), ...(attentionMetric ? [attentionMetric] : [])]
  const extraMetrics = metrics.filter(item => !mainMetrics.includes(item))
  const positiveLabels = metrics.filter(item => item.key !== 'attention' && item.key !== 'protein_complement' && item.count > 0).slice(0, 2).map(item => item.label.replace(' 상품', ''))
  const summary = insight?.aiExplanationAvailable ? shortCopy(insight.summary) :
    [positiveLabels.length ? positiveLabels.join('·') + ' 기준에 해당하는 상품이 담겨 있어요.' : shortCopy(insight?.summary, 1),
      attentionMetric?.count ? '확인할 상품은 ' + attentionMetric.count + '종이에요.' : '현재 기준에서 별도로 확인할 상품은 없어요.'].join(' ')
  const attentionPreviews = productReasons.filter(product => product.needsAttention).map(product =>
    product.name + ' · ' + briefReason(product.checks.find(reason => reason.includes('알레르기')) || product.checks[0]))

  return (
    <div className={`cart-ai-insight${compact ? ' compact' : ''}`}>
      {compact ? <div className="cart-ai-intro">
        <span><Icon name="sparkles" size={15} /> AI 장바구니 분석</span>
        {visibleStatus !== 'success' && <p>담은 상품의 영양 구성을 내 목표와 비교해드려요.</p>}
      </div> : <header className="cart-ai-dashboard-head">
        <div><h2 id="cart-wellness-title">{headline}</h2><span className="tag tag-soft">현재 구매 목적 · {goal || '미설정'}</span></div>
        <p>담은 상품 {productReasons.length}종을 {goal || '현재 조건'} 기준으로 분석했어요.</p>
      </header>}

      {compact && visibleStatus === 'idle' && (
        <>
          <button type="button" className="cart-ai-trigger" onClick={analyze} disabled={unavailable}>
            {compact ? 'AI 분석하기' : '장바구니 영양 분석하기'}
          </button>
          {!settingsLoading && !localCriteriaSet && (
            <p className="cart-ai-personalization-note">
              맞춤 기준이 없어 일반적인 영양 구성만 분석해요.
              <button type="button" onClick={openSettings}>추천 조건 설정</button>
            </p>
          )}
        </>
      )}

      {compact && visibleStatus === 'loading' && (
        <button type="button" className="cart-ai-trigger is-loading" disabled aria-live="polite">
          <Icon name="sparkles" size={14} /> 장바구니를 분석하고 있어요…
        </button>
      )}

      {compact && visibleStatus === 'stale' && (
        <div className="ai-insight-stale" role="status">
          <p>장바구니가 변경됐어요. 다시 분석해주세요.</p>
          <button type="button" className="btn btn-soft btn-sm" onClick={analyze} disabled={unavailable}>다시 분석</button>
        </div>
      )}

      {insight && (!compact || visibleStatus === 'success') && (
        compact ? (
          <div className="cart-ai-result cart-ai-result-compact">
            <strong>{headline}</strong>
            <BalanceItems items={insight.balanceItems} compact />
            <p>{insight.summary}</p>
            {insight.actions?.map((action) => <p key={action}>{action}</p>)}
            {insight.explanationNotice && <small className="cart-ai-fallback-note">{insight.explanationNotice}</small>}
            <div className="cart-ai-compact-actions">
              <button type="button" onClick={openDetailedAnalysis}>분석 결과 자세히 보기</button>
              <button type="button" onClick={analyze} disabled={unavailable}>다시 분석</button>
            </div>
          </div>
        ) : (
          <div className="cart-ai-result cart-ai-result-detail cart-ai-dashboard">
            <section className="cart-ai-glance">
              <h4><Icon name="sparkles" size={18} /> AI 한눈 요약</h4>
              <p>{summary}</p>
              {!insight.aiExplanationAvailable && <small>등록 정보 기반 기본 분석</small>}
            </section>
            <div className="cart-ai-metrics cart-ai-balance-items" aria-label="핵심 분석 지표">
              {mainMetrics.map(item => <div key={item.key} className={`cart-ai-metric${item.key === 'attention' ? ' is-attention' : ''}`} title={item.reason}>
                <span>{item.label}</span>
                <strong>{item.count}<small>{item.key === 'attention' ? '종' : ' / ' + item.total + '종'}</small></strong>
                <p>{METRIC_HINTS[item.key] || '현재 목적 기준'}</p>
              </div>)}
            </div>
            {extraMetrics.length > 0 && <details className="cart-ai-extra-metrics"><summary><span>추가 조건 지표 {extraMetrics.length}개</span><Icon name="chevron-down" size={15} /></summary><BalanceItems items={extraMetrics} /></details>}
            <div className="cart-ai-findings">
              <FindingCard title="좋은 점" items={insight.goodPoints?.length ? insight.goodPoints : ['현재 기준에 해당하는 상품 정보를 더 살펴보세요.']} />
              <FindingCard title="확인할 점" attention items={attentionPreviews.length ? attentionPreviews : ['현재 기준에서 별도로 확인할 상품은 없습니다.']} />
            </div>
            <section className="cart-ai-product-section">
              <div className="cart-ai-section-heading"><h4>상품별 분석</h4><span>{productReasons.length}종 · 자세한 근거는 펼쳐서 확인</span></div>
              <div className="cart-ai-product-list">
                {productReasons.map(product => {
                  const source = analysisCart.find(item => String(item.product.id) === String(product.id))?.product
                  const allergyHit = source && matchingAllergens(source, allergies).length > 0
                  const tags = product.tags.filter(tag => tag !== '확인 필요')
                  const preview = allergyHit ? '설정하신 알레르기 성분이 포함되어 있어 원재료 확인이 필요합니다.'
                    : product.checks.length ? briefReason(product.checks[0])
                      : tags.length ? tags.join('·') + ' 기준에 해당하는 구성이에요.' : '상품별 표시 정보를 함께 확인해주세요.'
                  return <article key={product.id} className="cart-ai-product-reason">
                    <div className="cart-ai-product-top">
                      {source && <div className="cart-ai-product-image"><ProductImage src={source.image} alt="" /></div>}
                      <h5>{product.name}</h5>
                    </div>
                    <div className="cart-ai-product-tags">
                      {product.tags.map(tag => <span key={tag} className={`tag ${tag === '확인 필요' ? 'cart-ai-check-tag' : 'tag-soft'}`}>{tag}</span>)}
                      {source && <AllergenBadges product={source} allergies={allergies} />}
                    </div>
                    <p className="cart-ai-product-preview">{shortCopy(preview)}</p>
                    <details key={analysisKey} className="cart-ai-evidence">
                      <summary><span>자세히 보기</span><Icon name="chevron-down" size={15} /></summary>
                      <ul>{product.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
                    </details>
                  </article>
                })}
              </div>
            </section>
            <section className="cart-ai-cta">
              <div><h4><Icon name="sparkles" size={18} /> 이렇게 보완해보세요</h4><p>{shortCopy(actions[0], 1)}</p></div>
              {hasComplementFilter && <button type="button" className="cart-ai-products-link" onClick={openComplementProducts}>{insight.recommendation.label}<Icon name="chevron-right" size={15} /></button>}
            </section>
            <footer className="cart-ai-dashboard-foot">
              {!basis?.personalized && <p className="cart-ai-personalization-note">맞춤 기준이 없어 일반적인 구성을 분석했어요. <button type="button" onClick={openSettings}>추천 조건 설정</button></p>}
              <div><small>상품 종류 기준 참고 분석 · 실제 섭취량과는 달라요.</small>
                <button type="button" className={`cart-ai-reanalyze${visibleStatus === 'loading' ? ' cart-ai-trigger is-loading' : ''}`} disabled={unavailable || visibleStatus === 'loading'} onClick={analyze}>
                  {visibleStatus === 'loading' ? <Icon name="sparkles" size={14} /> : <span aria-hidden="true">↻</span>}
                  {visibleStatus === 'loading' ? '분석 중…' : visibleStatus === 'idle' ? '장바구니 영양 분석하기' : '다시 분석'}
                </button>
              </div>
              {visibleStatus === 'stale' && <small role="status">구성이 변경됐어요. 현재 기준의 기본 분석을 표시합니다.</small>}
              {insight.explanationNotice && <small className="cart-ai-fallback-note" role="status">{insight.explanationNotice}</small>}
            </footer>
          </div>
        )
      )}
    </div>
  )
}
```

## src/components/ProductComparisonModal.jsx

모달 생명주기·실제 수치표·AI 비교·실패 상태

원본 줄 1–123

```jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Icon from './Icon'
import { won } from '../lib/format'
import { requestProductComparison } from '../lib/ai-insights'

const number = (value, unit) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? `${parsed.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}${unit}` : '정보 없음'
}

const ROWS = [
  ['가격', (product) => won(product.price)],
  ['열량', (product) => number(product.nutrition?.calories, 'kcal')],
  ['단백질', (product) => number(product.nutrition?.protein, 'g')],
  ['탄수화물', (product) => number(product.nutrition?.carbs, 'g')],
  ['지방', (product) => number(product.nutrition?.fat, 'g')],
  ['당류', (product) => number(product.nutrition?.sugar, 'g')],
  ['나트륨', (product) => number(product.nutrition?.sodium, 'mg')],
  ['알레르기', (product) => product.allergens?.length ? product.allergens.join(' · ') : '표시 정보 없음'],
  ['카페인', (product) => product.caffeine ? '포함' : '미포함'],
]

export default function ProductComparisonModal({ products, goal, onClose }) {
  const [insight, setInsight] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const requestRef = useRef(null)
  const ids = useMemo(() => products.map((product) => product.id), [products])

  const load = useCallback(async () => {
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setLoading(true)
    setError(null)
    setInsight(null)
    try {
      const result = await requestProductComparison(ids, controller.signal)
      if (!controller.signal.aborted) setInsight(result)
    } catch (caught) {
      if (!controller.signal.aborted) setError(caught.message)
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [ids])

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    void load()
    return () => {
      requestRef.current?.abort()
      document.body.style.overflow = previous
    }
  }, [load])

  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const highlights = new Map((insight?.highlights || []).map((item) => [item.product_id, item.reason]))
  const recommendedProduct = products.find((product) => product.id === insight?.recommendation?.product_id)

  return (
    <div className="compare-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="compare-modal" role="dialog" aria-modal="true" aria-labelledby="compare-title">
        <header className="compare-head">
          <div>
            <span className="eyebrow"><Icon name="sparkles" size={13} /> Product comparison</span>
            <h2 id="compare-title" className="serif">상품 비교</h2>
            <p>실제 상품 정보 · 현재 구매목적 {goal}</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="비교 닫기"><Icon name="x" /></button>
        </header>

        <div className="compare-table-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th scope="col">비교 항목</th>
                {products.map((product) => <th scope="col" key={product.id}><small>{product.category}</small>{product.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([label, formatter]) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  {products.map((product) => <td key={product.id}>{formatter(product)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="compare-ai-summary">
          <div className="compare-ai-title"><Icon name="sparkles" size={15} /><h3>AI 비교</h3></div>
          {loading && <p className="ai-insight-status" role="status">선택한 상품의 차이를 살펴보고 있습니다.</p>}
          {error && (
            <div className="ai-insight-error" role="alert"><p>{error}</p><button className="btn btn-soft btn-sm" onClick={load}>다시 시도</button></div>
          )}
          {insight && (
            <div className="compare-ai-content">
              <p>{insight.summary}</p>
              <ul>
                {products.map((product) => <li key={product.id}><b>{product.name}</b><span>{highlights.get(product.id)}</span></li>)}
              </ul>
              <p className="compare-goal-fit"><b>구매목적 기준</b> {insight.goal_fit_summary}</p>
              {recommendedProduct && (
                <div className="compare-recommendation">
                  <span><Icon name="award" size={15} /> AI 추천 상품</span>
                  <b>{recommendedProduct.name}</b>
                  <p>{insight.recommendation.reason}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
```

## src/pages/Checkout.jsx

배송지·쿠폰·금액 변경 확인·결제 흐름; 서비스 호출은 인터페이스 참조

원본 줄 19–197

```jsx
export default function Checkout() {
  const { authUserId, isLoggedIn, profileLoading, profile, user } = useStore()
  if (isLoggedIn && profileLoading) {
    return (
      <div className="wrap page page-narrow">
        <div className="empty" role="status">
          <Icon name="user" size={42} />
          <h3>회원 배송정보를 불러오고 있습니다.</h3>
        </div>
      </div>
    )
  }
  const profileKey = [
    authUserId || 'guest',
    user?.name || '',
    profile?.phone || '',
    profile?.postalCode || '',
    profile?.address || '',
    profile?.addressDetail || '',
  ].join(':')
  return <CheckoutContent key={profileKey} />
}

function CheckoutContent() {
  const {
    cart,
    cartTotal,
    deliveryFee,
    cartLoading,
    cartPending,
    cartError,
    user,
    profile,
    isLoggedIn,
    authUserId,
    navigate,
    showToast,
    reloadCart,
  } = useStore()
  const memberShipping = useMemo(
    () => memberCheckoutShipping(user, profile),
    [user, profile],
  )
  const [sameAsMember, setSameAsMember] = useState(true)
  const [shipping, setShipping] = useState(memberShipping)
  const [buyerInfoOpen, setBuyerInfoOpen] = useState(() => !isCheckoutShippingComplete(memberShipping))
  const [widgets, setWidgets] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [serverTotal, setServerTotal] = useState(null)
  const [userCouponId, setUserCouponId] = useState('')
  const discountAmount = userCouponId ? Math.floor(cartTotal * 20 / 100) : 0
  const estimatedTotal = cartTotal + deliveryFee - discountAmount
  const [paymentError, setPaymentError] = useState('')
  const submittingRef = useRef(false)
  const onWidgetsReady = useCallback((next) => setWidgets(next), [])

  const applyShipping = (nextShipping) => {
    const wasComplete = isCheckoutShippingComplete(shipping)
    const complete = isCheckoutShippingComplete(nextShipping)
    setShipping(nextShipping)
    if (!complete) setBuyerInfoOpen(true)
    else if (!wasComplete) setBuyerInfoOpen(false)
  }
  const updateShipping = (name, value) => applyShipping({ ...shipping, [name]: value })
  const toggleSameAsMember = (checked) => {
    setSameAsMember(checked)
    applyShipping(shippingForMemberToggle(shipping, memberShipping, checked))
  }
  const findAddress = async () => {
    try {
      await openPostcode(({ zonecode, address }) => {
        applyShipping({ ...shipping, postalCode: zonecode, address })
      })
    } catch {
      showToast('주소 검색을 불러오지 못했습니다. 주소를 직접 입력해 주세요.')
    }
  }
  const submitCheckout = async () => {
    if (!isLoggedIn || !cart.length || cartLoading || cartPending || cartError || !widgets || submittingRef.current) return
    if (!isCheckoutShippingComplete(shipping)) {
      setBuyerInfoOpen(true)
      setPaymentError('주문자와 배송 정보를 모두 입력해 주세요.')
      return
    }
    submittingRef.current = true
    setSubmitting(true)
    setPaymentError('')

    try {
      const order = await createCheckoutOrder(supabase, shipping, userCouponId)
      setServerTotal(order.total_price)
      const displayedTotal = serverTotal ?? estimatedTotal
      if (order.total_price !== displayedTotal) {
        await widgets.setAmount({ currency: 'KRW', value: order.total_price })
        const message = '결제금액이 변경되었습니다. 변경된 금액을 확인한 뒤 다시 결제해 주세요.'
        setPaymentError(message)
        showToast(message)
        return
      }
      await widgets.setAmount({ currency: 'KRW', value: order.total_price })
      await widgets.requestPayment({
        orderId: order.toss_order_id,
        orderName: order.order_name,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
        customerEmail: user.email || undefined,
        customerName: shipping.name.trim() || user.name,
      })
    } catch (error) {
      console.error('Checkout payment request failed:', { code: error?.code || error?.name || 'PAYMENT_REQUEST_FAILED' })
      const message = checkoutRequestErrorMessage(error)
      setPaymentError(message)
      showToast(message)
      setServerTotal(null)
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  if (isLoggedIn && cart.length === 0 && (cartLoading || cartError)) {
    return (
      <div className="wrap page page-narrow">
        <div className="empty" role={cartError ? 'alert' : 'status'}>
          <Icon name={cartError ? 'alert-circle' : 'cart'} size={42} />
          <h3>{cartError ? '주문 상품을 확인할 수 없습니다.' : '주문 상품을 불러오고 있습니다.'}</h3>
          {cartError && <><p>{cartError}</p><button className="btn btn-primary" onClick={reloadCart}>다시 불러오기</button></>}
        </div>
      </div>
    )
  }

  if (!isLoggedIn || cart.length === 0) {
    return (
      <div className="wrap page page-narrow">
        <div className="empty">
          <Icon name="cart" size={42} />
          <h3>{isLoggedIn ? '결제할 상품이 없습니다.' : '로그인이 필요한 페이지입니다.'}</h3>
          <p>{isLoggedIn ? '상품을 장바구니에 담은 뒤 결제를 진행해 주세요.' : '로그인 후 장바구니에서 결제를 진행해 주세요.'}</p>
          <button className="btn btn-primary" onClick={() => navigate(isLoggedIn ? 'main' : 'login')}>{isLoggedIn ? '상품 둘러보기' : '로그인하기'}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="wrap page checkout-page">
      <nav className="checkout-progress" aria-label="결제 진행 단계">
        <button type="button" onClick={() => navigate('cart')}>장바구니</button><Icon name="chevron-right" size={13} />
        <strong aria-current="step">주문/결제</strong><Icon name="chevron-right" size={13} />
        <span>결제완료</span>
      </nav>
      <div className="page-head checkout-page-head">
        <div><h1 className="page-title">주문/결제</h1><p>주문 정보를 확인하고 결제를 진행해 주세요.</p></div>
      </div>
      {cartError && <div className="cart-status" role="alert">{cartError}</div>}
      {paymentError && <div className="cart-status" role="alert">{paymentError}</div>}
      <div className="checkout-layout">
        <div className="checkout-main">
          <CheckoutOrderItems cart={cart} />
          <CheckoutBuyerInfo
            user={user}
            values={shipping}
            onChange={updateShipping}
            sameAsMember={sameAsMember}
            onSameToggle={toggleSameAsMember}
            onAddressSearch={findAddress}
            expanded={buyerInfoOpen}
            complete={isCheckoutShippingComplete(shipping)}
            onExpandedToggle={() => setBuyerInfoOpen((current) => !current)}
          />
          <MyCoupons userId={authUserId} selected={userCouponId} disabled={submitting} onSelect={id => { setUserCouponId(id); setServerTotal(null) }} />
          <CheckoutPaymentMethods customerKey={authUserId} amount={serverTotal ?? estimatedTotal} onReady={onWidgetsReady} />
        </div>
        <CheckoutSummary cartTotal={cartTotal} deliveryFee={deliveryFee} discountAmount={discountAmount} cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)} totalOverride={serverTotal} disabled={cartLoading || cartPending > 0 || Boolean(cartError) || !widgets || submitting} submitting={submitting} onPay={submitCheckout} />
      </div>
    </div>
  )
}
```

## src/components/checkout/CheckoutOrderItems.jsx

주문 상품 읽기 전용 표시

원본 줄 1–34

```jsx
import ProductImage from '../ProductImage'
import { won } from '../../lib/format'

export default function CheckoutOrderItems({ cart }) {
  return (
    <section className="checkout-section checkout-order" aria-labelledby="checkout-order-title">
      <div className="checkout-section-head">
        <h2 id="checkout-order-title"><span>1</span>주문 상품</h2>
        <small>총 {cart.reduce((sum, item) => sum + item.quantity, 0)}개</small>
      </div>
      <div className="checkout-items">
        {cart.map(({ product, quantity }) => (
          <div className="checkout-item" key={product.id}>
            <div className="checkout-product-thumb">
              <ProductImage src={product.image} alt={product.name} className="checkout-product-image" />
            </div>
            <div className="checkout-item-info">
              <span className="checkout-item-brand">{product.brand}</span>
              <strong>{product.name}</strong>
              {product.nutrition?.servingSize &&
                product.nutrition.servingSize !== '1회 제공량 정보 없음' && (
                  <small>{product.nutrition.servingSize}</small>
                )}
            </div>
            <div className="checkout-item-price">
              <span>수량 {quantity}개</span>
              <strong>{won(product.price * quantity)}</strong>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
```

## src/components/checkout/CheckoutBuyerInfo.jsx

회원정보 동일 토글·배송지 접힘/편집

원본 줄 1–94

```jsx
import Icon from '../Icon'

export default function CheckoutBuyerInfo({
  user, values, onChange, sameAsMember, onSameToggle, onAddressSearch,
  expanded, complete, onExpandedToggle,
}) {
  const shippingField = (name, options = {}) => ({
    value: values[name] || '',
    onChange: (event) => onChange(name, event.target.value),
    readOnly: options.alwaysEditable ? false : sameAsMember,
  })

  return (
    <section className="checkout-section checkout-buyer" aria-labelledby="checkout-buyer-title">
      <div className="checkout-section-head">
        <h2 id="checkout-buyer-title"><span>2</span>주문자 · 배송 정보</h2>
        <div className="checkout-section-controls">
          {complete && <small className="checkout-section-complete"><Icon name="check" size={13} /> 입력 완료</small>}
          <button
            type="button"
            className={`checkout-section-toggle${expanded ? ' open' : ''}`}
            onClick={onExpandedToggle}
            aria-expanded={expanded}
            aria-controls="checkout-buyer-content"
            aria-label={expanded ? '주문자 배송 정보 접기' : '주문자 배송 정보 펼치기'}
          >
            <Icon name="chevron-down" size={18} />
          </button>
        </div>
      </div>

      {expanded ? (
        <div id="checkout-buyer-content">
          <div className="checkout-orderer-summary" aria-label="주문자 정보">
            <div><span>주문자</span><strong>{user?.name || 'CareMarket 회원'}</strong></div>
            <div><span>이메일</span><strong>{user?.email || '-'}</strong></div>
          </div>

          <div className="checkout-shipping-head">
            <h3>배송지</h3>
            <label className="checkout-same">
              <input
                type="checkbox"
                checked={sameAsMember}
                onChange={(event) => onSameToggle(event.target.checked)}
              />
              회원정보와 동일
            </label>
          </div>

          <div className="checkout-form-grid">
            <div className="field">
              <label htmlFor="checkout-name">받는 분</label>
              <input id="checkout-name" name="name" autoComplete="name" maxLength={100} required {...shippingField('name')} />
            </div>
            <div className="field">
              <label htmlFor="checkout-phone">연락처</label>
              <input id="checkout-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={30} placeholder="010-0000-0000" required {...shippingField('phone')} />
            </div>
            <div className="field checkout-postal-field">
              <label htmlFor="checkout-postal">우편번호</label>
              <div className="checkout-address-search">
                <input id="checkout-postal" name="postalCode" autoComplete="postal-code" maxLength={20} placeholder="우편번호" required {...shippingField('postalCode')} />
                <button type="button" className="btn btn-ghost btn-sm" onClick={onAddressSearch} disabled={sameAsMember}>주소 찾기</button>
              </div>
            </div>
            <div className="field checkout-address">
              <label htmlFor="checkout-address">주소</label>
              <input id="checkout-address" name="address" autoComplete="street-address" maxLength={300} placeholder="배송받을 주소를 입력해 주세요" required {...shippingField('address')} />
            </div>
            <div className="field checkout-address">
              <label htmlFor="checkout-address-detail">상세주소</label>
              <input id="checkout-address-detail" name="addressDetail" autoComplete="address-line2" maxLength={200} placeholder="상세주소를 입력해 주세요" {...shippingField('addressDetail')} />
            </div>
            <div className="field checkout-address">
              <label htmlFor="checkout-delivery-request">배송 요청사항 <small>선택</small></label>
              <input id="checkout-delivery-request" name="deliveryRequest" maxLength={200} placeholder="예: 문 앞에 놓아주세요" {...shippingField('deliveryRequest', { alwaysEditable: true })} />
            </div>
          </div>
          {sameAsMember ? (
            <p className="checkout-same-hint">저장된 회원 배송지를 사용합니다. 다른 곳으로 받으려면 체크를 해제해 주세요.</p>
          ) : (
            <p className="checkout-same-hint">입력한 배송지는 이번 주문에만 저장됩니다.</p>
          )}
        </div>
      ) : (
        <button type="button" className="checkout-buyer-summary" onClick={onExpandedToggle}>
          <strong>{values.name} · {values.phone}</strong>
          <span>{values.postalCode && `[${values.postalCode}] `}{values.address} {values.addressDetail}</span>
        </button>
      )}
    </section>
  )
}
```

## src/components/checkout/CheckoutSummary.jsx

금액 요약·결제 중 상태·하단 고정 CTA

원본 줄 1–40

```jsx
import Icon from '../Icon'
import { won } from '../../lib/format'

export default function CheckoutSummary({ cartTotal, deliveryFee, cartCount, discountAmount = 0, totalOverride = null, disabled, submitting, onPay }) {
  const total = totalOverride ?? cartTotal + deliveryFee - discountAmount
  return (
    <>
      <aside className="summary checkout-summary" aria-labelledby="checkout-summary-title" aria-live="polite">
        <div className="checkout-summary-head">
          <h2 id="checkout-summary-title">주문 요약</h2>
          <span>{cartCount}개 상품</span>
        </div>
        <div className="sum-row"><span>상품금액</span><b>{won(cartTotal)}</b></div>
        <div className="sum-row"><span>배송비</span><b>{deliveryFee === 0 ? '무료' : won(deliveryFee)}</b></div>
        {discountAmount > 0 && <div className="sum-row"><span>신규회원 20% 할인</span><b>−{won(discountAmount)}</b></div>}
        <div className={`checkout-delivery-note${deliveryFee === 0 ? ' complete' : ''}`}>
          <Icon name={deliveryFee === 0 ? 'check' : 'truck'} size={14} />
          {deliveryFee === 0 ? '무료배송이 적용됐어요' : '상품금액 40,000원 이상 무료배송'}
        </div>
        <div className="sum-total">
          <span className="lbl">최종 결제금액</span>
          <span className="val">{won(total)}</span>
        </div>
        <button type="button" className="btn btn-primary btn-lg btn-block checkout-pay-button" disabled={disabled} onClick={onPay}>
          <Icon name="credit-card" size={17} /> {submitting ? '결제 준비 중…' : `${won(total)} 결제하기`}
        </button>
        <div className="checkout-summary-notes">
          <p><Icon name="shield-check" size={14} /> 토스페이먼츠를 통해 안전하게 결제됩니다.</p>
          <p><Icon name="check-circle" size={14} /> 결제 완료 후 주문내역에서 확인할 수 있습니다.</p>
        </div>
      </aside>
      <div className="checkout-mobile-pay" aria-label="모바일 결제 요약">
        <div><span>최종 결제금액</span><strong>{won(total)}</strong></div>
        <button type="button" className="btn btn-primary" disabled={disabled} onClick={onPay}>
          {submitting ? '준비 중…' : '결제하기'}
        </button>
      </div>
    </>
  )
}
```

## src/components/checkout/CheckoutPaymentMethods.jsx

위젯 표시 상태. SDK 초기화와 환경 설정 제외

원본 줄 5–8

```jsx
export default function CheckoutPaymentMethods({ customerKey, amount, onReady }) {
  const [status, setStatus] = useState('loading')
  const widgetsRef = useRef(null)
  const amountRef = useRef(amount)
```

원본 줄 69–84

```jsx
  return (
    <section className="checkout-section checkout-payment" aria-labelledby="checkout-payment-title">
      <div className="checkout-section-head">
        <h2 id="checkout-payment-title"><span>3</span>결제수단</h2>
      </div>
      <div id="payment-methods" className="payment-methods-mount" data-provider="toss-payments-v2" />
      {status !== 'ready' && (
        <p className="checkout-trust" role={status === 'loading' ? 'status' : 'alert'}>
          {status === 'loading' ? '결제수단을 불러오고 있습니다.' : '결제수단을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'}
        </p>
      )}
      <div id="payment-agreement" />
      <p className="checkout-trust"><Icon name="shield-check" size={15} /> 토스페이먼츠를 통해 결제가 진행됩니다.</p>
    </section>
  )
}
```

## src/pages/PaymentSuccess.jsx

승인 확인 loading/success/pending/error 분기

원본 줄 8–68

```jsx
export default function PaymentSuccess() {
  const { authUserId, authLoading, navigate, reloadCart, reloadProducts } = useStore()
  const [result, setResult] = useState({ state: 'loading' })
  const [retry, setRetry] = useState(0)
  const requestRef = useRef(null)

  useEffect(() => {
    if (authLoading || !authUserId) return undefined
    let active = true
    const params = new URLSearchParams(window.location.search)
    const input = {
      paymentKey: params.get('paymentKey'),
      orderId: params.get('orderId'),
      amount: Number(params.get('amount')),
    }
    const requestId = `${authUserId}:${input.orderId}:${retry}`
    if (requestRef.current?.id !== requestId) {
      requestRef.current = { id: requestId, promise: confirmPayment(supabase, input) }
    }

    requestRef.current.promise.then((data) => {
      if (!active) return
      if (data?.code === 'PAYMENT_CONFIRMED') {
        setResult({ state: 'success', data })
        void reloadCart()
        reloadProducts()
      } else {
        setResult({ state: 'pending', data })
      }
    }).catch((error) => {
      if (active) setResult({ state: 'error', code: error.message })
    })
    return () => { active = false }
    // Store refresh callbacks do not change the payment being confirmed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId, authLoading, retry])

  const success = result.state === 'success'
  const needsLogin = !authLoading && !authUserId
  const loading = !needsLogin && result.state === 'loading'

  return (
    <div className="wrap page page-narrow">
      <div className="empty" role={result.state === 'error' ? 'alert' : 'status'}>
        <Icon name={success ? 'check-circle' : loading ? 'credit-card' : 'alert-circle'} size={42} />
        <h2>{success ? '결제가 완료되었어요' : needsLogin ? '로그인 상태를 확인해 주세요' : loading ? '결제를 확인하고 있습니다' : result.state === 'pending' ? '결제가 아직 완료되지 않았어요' : '결제 확인이 필요해요'}</h2>
        {success ? (
          <><p>{result.data.orderId}</p><p>총 결제금액 {won(result.data.totalPrice)}</p></>
        ) : (
          <p>{needsLogin ? '로그인 후 결제를 다시 확인해 주세요.' : loading ? '승인이 완료될 때까지 잠시 기다려 주세요.' : result.state === 'pending' ? '입금 대기 등 결제 완료 전 상태입니다. 주문은 아직 확정되지 않았습니다.' : paymentErrorMessage(result.code)}</p>
        )}
        {!loading && (
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 10 }}>
            <button className="btn btn-primary" onClick={() => navigate(needsLogin ? 'login' : success ? 'orders' : 'cart')}>{needsLogin ? '로그인하기' : success ? '주문내역 확인' : '장바구니로 돌아가기'}</button>
            {result.state === 'error' && <button className="btn btn-ghost" onClick={() => { setResult({ state: 'loading' }); setRetry((value) => value + 1) }}>다시 확인하기</button>}
          </div>
        )}
      </div>
    </div>
  )
}
```

## src/pages/PaymentFail.jsx

실패 복귀·재결제

원본 줄 1–19

```jsx
import { useStore } from '../store'
import Icon from '../components/Icon'

export default function PaymentFail() {
  const { navigate } = useStore()
  return (
    <div className="wrap page page-narrow">
      <div className="empty">
        <Icon name="alert-circle" size={42} />
        <h2>결제가 완료되지 않았어요</h2>
        <p>결제가 취소되었거나 진행 중 문제가 발생했습니다. 장바구니 상품은 그대로 유지됩니다.</p>
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 10 }}>
          <button className="btn btn-text" onClick={() => navigate('cart')}>← 장바구니로 돌아가기</button>
          <button className="btn btn-primary" onClick={() => navigate('checkout')}>다시 결제하기</button>
        </div>
      </div>
    </div>
  )
}
```

## src/pages/Orders.jsx

주문내역·조회 예외·배송 상세 펼침

원본 줄 9–99

```jsx
const STATUS_LABELS = {
  paid: '결제완료',
  preparing: '상품준비중',
  shipped: '배송중',
  delivered: '배송완료',
}

function dateText(value) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(value))
}

export default function Orders() {
  const { authUserId, authLoading, navigate } = useStore()
  const [state, setState] = useState({ ownerId: null, rows: [], loading: false, error: null })
  const [reloadKey, setReloadKey] = useState(0)
  const visible = state.ownerId === authUserId ? state : { rows: [], loading: Boolean(authUserId), error: null }

  useEffect(() => {
    let active = true
    if (!authUserId) return undefined

    const load = async () => {
      setState({ ownerId: authUserId, rows: [], loading: true, error: null })
      try {
        const rows = await fetchMyOrders(supabase, authUserId)
        if (active) setState({ ownerId: authUserId, rows, loading: false, error: null })
      } catch (error) {
        console.error('Supabase orders fetch failed:', { code: error?.code || 'ORDERS_FETCH_FAILED' })
        if (active) setState({ ownerId: authUserId, rows: [], loading: false, error: '주문내역을 불러오지 못했습니다.' })
      }
    }
    void load()
    return () => { active = false }
  }, [authUserId, reloadKey])

  if (authLoading || visible.loading) {
    return <div className="wrap page page-narrow"><div className="empty" role="status"><Icon name="package" size={42} /><h3>주문내역을 불러오고 있습니다.</h3></div></div>
  }

  if (!authUserId) {
    return <div className="wrap page page-narrow"><div className="empty"><Icon name="package" size={42} /><h3>로그인이 필요한 페이지입니다.</h3><button className="btn btn-primary" onClick={() => navigate('login')}>로그인하기</button></div></div>
  }

  return (
    <div className="wrap page">
      <div className="page-mid" style={{ margin: '0 auto' }}>
        <div className="page-head">
          <div><h1 className="page-title">주문 · 배송 내역</h1><p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>결제가 완료된 주문을 확인할 수 있습니다.</p></div>
          <button className="btn btn-text btn-sm" onClick={() => navigate('main')}>쇼핑 계속하기 →</button>
        </div>

        {visible.error ? (
          <div className="empty" role="alert"><Icon name="alert-circle" size={42} /><h3>주문 내역을 불러오지 못했어요.</h3><p>잠시 후 다시 시도해 주세요.</p><button type="button" className="btn btn-primary" onClick={() => setReloadKey((key) => key + 1)}>다시 시도</button></div>
        ) : visible.rows.length === 0 ? (
          <div className="empty"><Icon name="package" size={42} /><h3>아직 주문 내역이 없어요.</h3><p>CareMarket의 상품을 둘러보세요.</p><button className="btn btn-primary" onClick={() => navigate('products')}>상품 둘러보기</button></div>
        ) : visible.rows.map((order) => (
          <div key={order.order_id} className="order-card">
            <div className="order-top">
              <div className="order-id"><b>{order.toss_order_id || order.order_id}</b><span>· {dateText(order.created_at)}</span></div>
              <span className={`status ${order.status === 'delivered' ? 'status-done' : 'status-active'}`}>{STATUS_LABELS[order.status] || order.status}</span>
            </div>
            <div className="order-lines">
              {order.items.map((item) => (
                <div key={`${order.order_id}-${item.product_id}`} className="order-line">
                  <ProductImage src={item.product?.image_url || item.product?.image} alt="" />
                  <span className="nm">{item.product?.name || '판매 종료 상품'} <span>수량 {item.quantity}개</span></span>
                  <b>{won(item.price_at_order * item.quantity)}</b>
                </div>
              ))}
            </div>
            <div className="order-foot">
              <details className="order-detail">
                <summary>주문 상세 <Icon name="chevron-down" size={14} /></summary>
                <div className="order-detail-body">
                  <div><span>받는 분</span><strong>{order.recipient_name || '이전 주문 정보 없음'}</strong></div>
                  <div><span>연락처</span><strong>{order.recipient_phone || '-'}</strong></div>
                  <div className="order-detail-address"><span>배송지</span><strong>{order.address ? `${order.postal_code ? `(${order.postal_code}) ` : ''}${order.address}${order.address_detail ? ` ${order.address_detail}` : ''}` : '이전 주문 정보 없음'}</strong></div>
                  <div className="order-detail-address"><span>배송 요청사항</span><strong>{order.delivery_request || '없음'}</strong></div>
                </div>
              </details>
              <span className="order-total">결제금액 {won(order.total_price)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

## src/pages/Login.jsx

일반 로그인·간편 로그인·미지원 기능

원본 줄 1–128

```jsx
import { useEffect, useState } from 'react'
import { useStore } from '../store'

const SOCIAL_PROVIDERS = [
  { id: 'naver', label: '네이버' },
  { id: 'kakao', label: '카카오' },
  { id: 'google', label: '구글' },
  { id: 'apple', label: '애플' },
]

function SocialMark({ provider }) {
  if (provider === 'google') {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#4285F4" d="M43.61 24.46c0-1.36-.12-2.66-.35-3.92H24v7.42h11a9.4 9.4 0 0 1-4.08 6.18v5.14h6.61c3.87-3.56 6.08-8.81 6.08-14.82Z" />
        <path fill="#34A853" d="M24 44c5.51 0 10.13-1.83 13.51-4.96l-6.61-5.14c-1.83 1.23-4.17 1.97-6.9 1.97-5.32 0-9.84-3.59-11.45-8.43H5.72v5.3A20 20 0 0 0 24 44Z" />
        <path fill="#FBBC05" d="M12.55 27.44a12 12 0 0 1 0-6.88v-5.3H5.72a20 20 0 0 0 0 17.48l6.83-5.3Z" />
        <path fill="#EA4335" d="M24 12.13c3 0 5.68 1.03 7.81 3.05l5.86-5.86C34.12 6.02 29.51 4 24 4A20 20 0 0 0 5.72 15.26l6.83 5.3C14.16 15.72 18.68 12.13 24 12.13Z" />
      </svg>
    )
  }

  if (provider === 'kakao') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5.2c-4.5 0-8.1 2.8-8.1 6.2 0 2.2 1.5 4.1 3.8 5.2l-.8 3 3.5-2.1c.5.1 1 .1 1.6.1 4.5 0 8.1-2.8 8.1-6.2S16.5 5.2 12 5.2Z" />
      </svg>
    )
  }

  if (provider === 'apple') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M17.1 12.7c0-2.4 2-3.6 2.1-3.7a4.5 4.5 0 0 0-3.5-1.9c-1.5-.2-2.9.9-3.6.9-.8 0-1.9-.9-3.1-.9a4.7 4.7 0 0 0-4 2.4c-1.7 2.9-.4 7.3 1.2 9.7.8 1.2 1.8 2.5 3.1 2.4 1.2 0 1.7-.8 3.2-.8s1.9.8 3.2.8 2.2-1.2 3-2.4a10.6 10.6 0 0 0 1.4-2.9c-.1 0-3-.9-3-3.6ZM14.7 5.5a4.1 4.1 0 0 0 1-3 4.3 4.3 0 0 0-2.8 1.4 3.9 3.9 0 0 0-1 2.9 3.6 3.6 0 0 0 2.8-1.3Z" />
      </svg>
    )
  }

  return <span aria-hidden="true">{provider === 'naver' ? 'N' : 'G'}</span>
}

export default function Login() {
  const { login, loginWithOAuth, navigate, showToast } = useStore()
  const [oauthPending, setOauthPending] = useState(null)
  const handleOAuthLogin = async (provider) => {
    if (oauthPending || isSubmitting) return
    setOauthPending(provider)
    if (!await loginWithOAuth(provider)) setOauthPending(null)
  }
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!oauthPending) return undefined
    // Recover if external navigation is blocked, or the user returns using Back.
    const reset = () => setOauthPending(null)
    const timer = window.setTimeout(() => {
      reset()
      showToast('인증 페이지로 이동하지 못했습니다. 일반 브라우저에서 다시 시도해 주세요.', 'auth-error')
    }, 15000)
    window.addEventListener('pageshow', reset)
    return () => { window.clearTimeout(timer); window.removeEventListener('pageshow', reset) }
  }, [oauthPending, showToast])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    await login({ email, password })
    setIsSubmitting(false)
  }

  return (
    <div className="auth-page auth-login-page">
      <div className="auth-container auth-login-container">
        <div className="auth-head auth-head-lg">
          <span className="eyebrow">CareMarket</span>
          <h2>로그인</h2>
          <p>맞춤형 웰빙 커머스를 더 편리하게 이용해 보세요.</p>
        </div>
        <form className="auth-login-form" onSubmit={handleSubmit}>
          <div className="field">
            <label>이메일</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </div>
          <div className="field">
            <label>비밀번호</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </div>
          <button type="submit" className="btn btn-primary btn-lg auth-login-submit" disabled={isSubmitting || Boolean(oauthPending)}>
            {isSubmitting ? '로그인 중...' : '로그인하기'}
          </button>
        </form>
        <div className="auth-foot">
          <button onClick={() => navigate('register')}>회원가입</button>
          <span>·</span>
          <span style={{ cursor: 'default' }}>비밀번호 찾기</span>
        </div>

        <section className="social-login" aria-labelledby="social-login-title">
          <div className="social-login-title">
            <span id="social-login-title">간편 로그인</span>
          </div>
          <div className="social-login-options">
            {SOCIAL_PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                type="button"
                className={`social-login-button social-login-${provider.id}`}
                aria-label={['google', 'kakao'].includes(provider.id) ? `${provider.id === 'google' ? 'Google' : provider.label}로 계속하기` : `${provider.label}로 간편 로그인`}
                title={`${provider.label}로 계속하기`}
                disabled={isSubmitting || Boolean(oauthPending)}
                aria-busy={oauthPending === provider.id}
                onClick={() => ['google', 'kakao'].includes(provider.id) ? handleOAuthLogin(provider.id) : showToast(`${provider.label} 간편 로그인은 준비 중입니다.`)}
              >
                <SocialMark provider={provider.id} />
              </button>
            ))}
          </div>
          {oauthPending && <p className="auth-hint" role="status">{oauthPending === 'google' ? 'Google' : '카카오'}로 이동 중...</p>}
          <button type="button" className="social-login-privacy" onClick={() => navigate('privacy')}>
            개인정보처리방침
          </button>
        </section>
      </div>
    </div>
  )
}
```

## src/pages/Register.jsx

약관 2단계·입력 검증·OAuth 추가 가입

원본 줄 1–256

```jsx
import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import Icon from '../components/Icon'
import { openPostcode } from '../lib/postcode'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const AGREEMENTS = [
  {
    key: 'terms',
    label: '서비스 이용약관 동의',
    required: true,
    doc: 'CareMarket는 건강식품 큐레이션·주문 서비스를 제공합니다. 회원은 관련 법령과 본 약관을 준수하며, 서비스 운영 내용은 필요한 경우 사전 안내 후 변경될 수 있습니다.',
  },
  {
    key: 'privacy',
    label: '개인정보 수집·이용 동의',
    required: true,
    doc: '이름·이메일·연락처·주소를 회원 식별과 주문·배송 처리를 위해 수집·이용합니다. 회원 탈퇴 시 관계 법령에 따른 보관분을 제외하고 지체 없이 파기합니다.',
  },
  {
    key: 'marketing',
    label: '마케팅 정보 수신 동의 (선택)',
    required: false,
    doc: '신상품·혜택·이벤트 소식을 이메일 등으로 받아보실 수 있습니다. 동의하지 않아도 서비스 이용에 제한이 없으며, 언제든지 수신을 해지할 수 있습니다.',
  },
]

export default function Register() {
  const { navigate, register, checkEmailExists, user, profile, oauthRegistrationRequired, completeOAuthRegistration, logout } = useStore()
  const oauthSignup = Boolean(user?.oauth)
  const [step, setStep] = useState(1)

  // STEP 1 — 약관
  const [agree, setAgree] = useState({ terms: false, privacy: false, marketing: false })
  const [openDoc, setOpenDoc] = useState(null)

  // STEP 2 — 회원정보
  const [form, setForm] = useState({
    email: oauthSignup ? user.email : '', password: '', passwordConfirm: '',
    displayName: oauthSignup ? user.name : '', phone: oauthSignup ? profile.phone : '',
    postalCode: oauthSignup ? profile.postalCode : '', address: oauthSignup ? profile.address : '', addressDetail: oauthSignup ? profile.addressDetail : '',
  })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const emailDebounce = useRef(null)

  useEffect(() => {
    if (oauthSignup && oauthRegistrationRequired === false) navigate('main')
  }, [oauthSignup, oauthRegistrationRequired, navigate])

  // 이메일 입력이 멈추면(디바운스) 이미 가입된 이메일인지 실시간 확인
  useEffect(() => {
    if (oauthSignup) return undefined
    const value = form.email.trim()
    if (emailDebounce.current) window.clearTimeout(emailDebounce.current)
    if (!EMAIL_RE.test(value)) return undefined
    emailDebounce.current = window.setTimeout(async () => {
      const exists = await checkEmailExists(value)
      // 확인이 끝나는 사이 값이 바뀌지 않았을 때만 반영
      if (exists && value === form.email.trim()) setEmailError('이미 가입되어 있는 이메일입니다.')
    }, 450)
    return () => window.clearTimeout(emailDebounce.current)
  }, [form.email, checkEmailExists, oauthSignup])

  const pwFilled = form.passwordConfirm.length > 0
  const pwMatch = pwFilled && form.password === form.passwordConfirm
  const allChecked = agree.terms && agree.privacy && agree.marketing
  const requiredDone = agree.terms && agree.privacy
  const setField = (name, value) => {
    if (name === 'email') setEmailError('')
    setForm((c) => ({ ...c, [name]: value }))
  }

  const toggleAll = () => {
    const next = !allChecked
    setAgree({ terms: next, privacy: next, marketing: next })
  }
  const toggleOne = (key) => setAgree((c) => ({ ...c, [key]: !c[key] }))

  const findPostcode = () => {
    openPostcode(({ zonecode, address }) => {
      setForm((c) => ({ ...c, postalCode: zonecode, address }))
    }).catch(() => setError('우편번호 서비스를 불러오지 못했습니다. 직접 입력해 주세요.'))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (isSubmitting || (oauthSignup && oauthRegistrationRequired !== true)) return
    setError('')
    setEmailError('')
    if (!requiredDone) return setError('필수 약관에 동의해 주세요.')
    if (!oauthSignup && form.password.length < 6) return setError('비밀번호는 6자 이상 입력해 주세요.')
    if (!oauthSignup && form.password !== form.passwordConfirm) return setError('비밀번호가 일치하지 않습니다.')
    setIsSubmitting(true)
    const result = await (oauthSignup ? completeOAuthRegistration : register)({
      email: form.email,
      password: form.password,
      displayName: form.displayName,
      phone: form.phone,
      postalCode: form.postalCode,
      address: form.address,
      addressDetail: form.addressDetail,
      termsAgreed: agree.terms,
      privacyAgreed: agree.privacy,
      marketingAgreed: agree.marketing,
    })
    setIsSubmitting(false)
    if (!result.ok) {
      if (result.reason === 'duplicate-email') setEmailError('가입되어 있는 이메일입니다.')
      else if (oauthSignup) setError('추가정보를 저장하지 못했습니다. 입력한 정보를 확인하고 다시 시도해 주세요.')
      else setError('회원가입에 실패했습니다. 잠시 후 다시 시도해 주세요.')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-head auth-head-lg">
          <span className="eyebrow">Join CareMarket</span>
          <h2>회원가입</h2>
          <p>{oauthSignup ? '간편 로그인 인증이 완료되었습니다. 약관 동의와 배송 정보를 입력하면 가입이 완료됩니다.' : '약관에 동의하고 회원정보를 입력해 주세요.'}</p>
        </div>

        <div className="auth-steps">
                <span className={`auth-step${step === 1 ? ' on' : ''}`}><i>1</i> 약관 동의</span>
                <span className="auth-step-line" />
                <span className={`auth-step${step === 2 ? ' on' : ''}`}><i>2</i> 회원정보 입력</span>
        </div>

              {step === 1 ? (
                <div>
                  <button type="button" className={`agree-all${allChecked ? ' on' : ''}`} onClick={toggleAll}>
                    <span className="agree-box"><Icon name="check" size={13} strokeWidth={3} /></span>
                    전체 약관에 동의합니다
                  </button>

                  <ul className="agree-list">
                    {AGREEMENTS.map((a) => (
                      <li key={a.key} className="agree-item">
                        <div className="agree-row">
                          <button type="button" className={`agree-check${agree[a.key] ? ' on' : ''}`} onClick={() => toggleOne(a.key)}>
                            <span className="agree-box"><Icon name="check" size={12} strokeWidth={3} /></span>
                            <span className="agree-label">
                              {a.required && <em className="agree-req">필수</em>}
                              {a.label}
                            </span>
                          </button>
                          <button
                            type="button"
                            className="agree-doc-toggle"
                            onClick={() => setOpenDoc(openDoc === a.key ? null : a.key)}
                            aria-expanded={openDoc === a.key}
                          >
                            전문보기 <Icon name={openDoc === a.key ? 'chevron-up' : 'chevron-down'} size={13} />
                          </button>
                        </div>
                        {openDoc === a.key && <p className="agree-doc">{a.doc}</p>}
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    className="btn btn-accent btn-lg btn-block auth-form-button"
                    style={{ marginTop: 20 }}
                    disabled={!requiredDone}
                    onClick={() => setStep(2)}
                  >
                    다음
                  </button>
                  {!requiredDone && <p className="auth-hint">필수 약관에 동의해야 다음 단계로 진행할 수 있습니다.</p>}
                </div>
              ) : (
                <form onSubmit={submit}>
                  <div className="auth-fields">
                    <div className="field">
                      <label>이메일</label>
                      <input className={emailError ? 'input-warning' : ''} type="email" value={form.email} readOnly={oauthSignup} placeholder={oauthSignup && !form.email ? '제공되지 않음' : undefined} onChange={(e) => setField('email', e.target.value)} autoComplete="email" aria-describedby={emailError ? 'email-error' : undefined} required={!oauthSignup} />
                      {emailError && <p id="email-error" className="auth-field-error" role="alert">{emailError}</p>}
                    </div>
                    <div className="field">
                      <label>이름</label>
                      <input type="text" value={form.displayName} onChange={(e) => setField('displayName', e.target.value)} autoComplete="name" required />
                    </div>
                    {!oauthSignup && <><div className="field">
                      <label>비밀번호</label>
                      <div className="pw-field">
                        <input type={showPw ? 'text' : 'password'} value={form.password} onChange={(e) => setField('password', e.target.value)} autoComplete="new-password" minLength={6} aria-describedby="password-hint" required />
                        <button type="button" className="pw-toggle" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 보기'}>
                          <Icon name={showPw ? 'eye-off' : 'eye'} size={17} />
                        </button>
                      </div>
                      <p id="password-hint" className="auth-field-hint">비밀번호는 6자리 이상 입력해 주세요.</p>
                    </div>
                    <div className="field">
                      <label>비밀번호 확인</label>
                      <div className="pw-field">
                        <input
                          className={pwFilled ? (pwMatch ? 'input-ok' : 'input-warning') : ''}
                          type={showPw ? 'text' : 'password'}
                          value={form.passwordConfirm}
                          onChange={(e) => setField('passwordConfirm', e.target.value)}
                          autoComplete="new-password"
                          aria-describedby="password-confirm-msg"
                          required
                        />
                      </div>
                      {pwFilled && (
                        <p id="password-confirm-msg" className={pwMatch ? 'auth-field-ok' : 'auth-field-error'} role="status">
                          {pwMatch ? '비밀번호가 일치합니다.' : '비밀번호가 일치하지 않습니다.'}
                        </p>
                      )}
                    </div>
                    </>}
                    <div className="field">
                      <label>휴대전화번호</label>
                      <input type="tel" inputMode="tel" value={form.phone} onChange={(e) => setField('phone', e.target.value)} autoComplete="tel" placeholder="010-0000-0000" required />
                    </div>
                    <div className="field span-2">
                      <label>우편번호</label>
                      <div className="postcode-row">
                        <input type="text" value={form.postalCode} onChange={(e) => setField('postalCode', e.target.value)} placeholder="우편번호" readOnly />
                        <button type="button" className="btn btn-ghost btn-sm" onClick={findPostcode}>우편번호 찾기</button>
                      </div>
                    </div>
                    <div className="field span-2">
                      <label>기본주소</label>
                      <input type="text" value={form.address} onChange={(e) => setField('address', e.target.value)} autoComplete="street-address" placeholder="주소 찾기로 입력됩니다" required />
                    </div>
                    <div className="field span-2">
                      <label>상세주소</label>
                      <input type="text" value={form.addressDetail} onChange={(e) => setField('addressDetail', e.target.value)} autoComplete="address-line2" placeholder="상세주소를 입력해 주세요" />
                    </div>
                  </div>

                  {error && <p className="auth-error-msg" role="alert">{error}</p>}

                  <div className="auth-actions">
                    <button type="button" className="btn btn-accent btn-lg auth-form-button" onClick={() => setStep(1)}>이전</button>
                    <button type="submit" className="btn btn-accent btn-lg auth-form-button auth-submit" disabled={isSubmitting}>
                      {isSubmitting ? '가입 중...' : '가입 완료'}
                    </button>
                  </div>
                </form>
              )}
        <div className="auth-foot">
          {oauthSignup ? <button onClick={logout} disabled={isSubmitting}>나중에 완료하고 로그아웃</button> : <>이미 계정이 있으신가요?<button onClick={() => navigate('login')}>로그인</button></>}
        </div>
      </div>
    </div>
  )
}
```

## src/pages/MyPage.jsx

회원정보 편집·최근 주문·설정·쿠폰·탈퇴 안내

원본 줄 11–183

```jsx
const STATUS_LABELS = { paid: '결제완료', preparing: '상품준비중', shipped: '배송중', delivered: '배송완료' }
const orderDate = (value) => new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(value))

export default function MyPage() {
  const {
    user, profile, isLoggedIn, authUserId, goal, subFilters, allergies,
    profileLoading, profileError, reloadProfile,
    navigate, logout, updateProfile,
  } = useStore()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(null)
  const [orders, setOrders] = useState({ ownerId: null, rows: [], loading: false, error: null })
  const [ordersReloadKey, setOrdersReloadKey] = useState(0)
  const [withdrawalOpen, setWithdrawalOpen] = useState(false)
  const [withdrawalAgreed, setWithdrawalAgreed] = useState(false)

  useEffect(() => {
    if (isLoggedIn && window.location.hash === '#my-coupons') {
      document.getElementById('my-coupons')?.scrollIntoView({ block: 'start' })
    }
  }, [isLoggedIn])

  useEffect(() => {
    if (!withdrawalOpen) return undefined
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setWithdrawalOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [withdrawalOpen])

  useEffect(() => {
    let active = true
    if (!authUserId) return () => { active = false }
    fetchMyOrders(supabase, authUserId)
      .then((rows) => {
        if (active) setOrders({ ownerId: authUserId, rows: rows.slice(0, 2), loading: false, error: null })
      })
      .catch((error) => {
        console.error('Supabase recent orders fetch failed:', { code: error?.code || 'RECENT_ORDERS_FETCH_FAILED' })
        if (active) setOrders({ ownerId: authUserId, rows: [], loading: false, error: '최근 주문을 불러오지 못했어요.' })
      })
    return () => { active = false }
  }, [authUserId, ordersReloadKey])

  const retryOrders = () => {
    setOrders({ ownerId: authUserId, rows: [], loading: true, error: null })
    setOrdersReloadKey((key) => key + 1)
  }

  if (!isLoggedIn || !user) {
    return (
      <div className="wrap page">
        <div className="page-slim mypage-login"><div className="panel">
          <div className="auth-head"><h2>로그인이 필요합니다</h2><p>로그인하면 주문내역, 찜한 상품과 배송지를 한곳에서 확인할 수 있습니다.</p></div>
          <div className="mypage-login-actions"><button className="btn btn-primary" onClick={() => navigate('login')}>로그인</button><button className="btn btn-ghost" onClick={() => navigate('register')}>회원가입</button></div>
        </div></div>
      </div>
    )
  }

  const recentOrdersState = orders.ownerId === authUserId ? orders : { rows: [], loading: true, error: null }
  const recentOrders = recentOrdersState.rows
  const startEdit = () => {
    setForm({ displayName: user.name || '', phone: profile?.phone || '', postalCode: profile?.postalCode || '', address: profile?.address || '', addressDetail: profile?.addressDetail || '' })
    setEditing(true)
  }
  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }))
  const findPostcode = () => openPostcode(({ zonecode, address }) => setForm((current) => ({ ...current, postalCode: zonecode, address }))).catch(() => {})
  const save = async () => {
    if (saving) return
    setSaving(true)
    const ok = await updateProfile(form)
    setSaving(false)
    if (ok) setEditing(false)
  }

  return (
    <div className="wrap page mypage">
      <WishlistQuickPanel />
      <div className="mypage-head">
        <div className="profile-id"><div className="avatar">{user.name.slice(0, 1)}</div><div><span className="eyebrow">마이 쇼핑</span><h1>{user.name}님, 안녕하세요</h1><div className="em">{user.email || '제공되지 않음'}</div></div></div>
        <button className="btn btn-ghost btn-sm" onClick={logout}>로그아웃</button>
      </div>

      <section className="mypage-section" aria-labelledby="mypage-orders-title">
        <div className="mypage-section-head"><div><span className="section-number">1</span><h2 id="mypage-orders-title">최근 주문</h2></div><button className="more-link" onClick={() => navigate('orders')}>전체 주문내역 →</button></div>
        {recentOrdersState.loading ? (
          <div className="mypage-empty-row" role="status"><div><Icon name="package" size={22} /><span><strong>최근 주문을 불러오고 있습니다.</strong></span></div></div>
        ) : recentOrdersState.error ? (
          <div className="mypage-empty-row" role="alert"><div><Icon name="alert-circle" size={22} /><span><strong>최근 주문을 불러오지 못했어요.</strong><small>잠시 후 다시 시도해 주세요.</small></span></div><button type="button" className="btn btn-primary btn-sm" onClick={retryOrders}>다시 시도</button></div>
        ) : recentOrders.length ? (
          <div className="mypage-recent-orders">{recentOrders.map((order) => (
            <button key={order.order_id} type="button" onClick={() => navigate('orders')}>
              <span><small>{orderDate(order.created_at)} · 주문번호</small><strong>{order.toss_order_id || order.order_id}</strong></span>
              <span className="mypage-order-summary"><b>{order.items[0]?.product?.name || '주문 상품'}{order.items.length > 1 ? ` 외 ${order.items.length - 1}건` : ''}</b><small>{won(order.total_price)}</small></span>
              <span className={`status ${order.status === 'delivered' ? 'status-done' : 'status-active'}`}>{STATUS_LABELS[order.status] || order.status}</span><Icon name="chevron-right" size={17} />
            </button>
          ))}</div>
        ) : (
          <div className="mypage-empty-row"><div><Icon name="package" size={22} /><span><strong>아직 완료된 주문이 없습니다.</strong><small>원하는 상품을 찾아 첫 주문을 시작해 보세요.</small></span></div><button className="btn btn-primary btn-sm" onClick={() => navigate('products')}>상품 둘러보기</button></div>
        )}
      </section>

      <section className="mypage-section" aria-labelledby="mypage-profile-title">
        <div className="mypage-section-head"><div><span className="section-number">2</span><h2 id="mypage-profile-title">배송지 · 회원정보</h2></div>{!editing && !profileLoading && !profileError && <button className="more-link" onClick={startEdit}>수정하기</button>}</div>
        {profileLoading ? (
          <div className="mypage-empty-row" role="status"><div><Icon name="package" size={22} /><span><strong>회원정보를 불러오고 있습니다.</strong></span></div></div>
        ) : profileError ? (
          <div className="mypage-empty-row" role="alert"><div><Icon name="alert-circle" size={22} /><span><strong>회원정보를 불러오지 못했어요.</strong><small>잠시 후 다시 시도해 주세요.</small></span></div><button type="button" className="btn btn-primary btn-sm" onClick={reloadProfile}>다시 시도</button></div>
        ) : !editing ? (
          <div className="mypage-profile-grid">
            <div><span>기본 배송지</span><strong>{profile?.address ? `${profile.address}${profile.addressDetail ? ` ${profile.addressDetail}` : ''}` : '등록된 배송지가 없습니다.'}</strong><small>{profile?.postalCode ? `(${profile.postalCode})` : '주문 전 배송지를 등록해 주세요.'}</small></div>
            <div><span>연락처</span><strong>{profile?.phone || '미등록'}</strong></div><div><span>이름</span><strong>{user.name}</strong></div><div><span>이메일</span><strong>{user.email || '제공되지 않음'}</strong></div>
          </div>
        ) : (
          <div className="mypage-edit-form">
            <div className="field"><label>이름</label><input type="text" value={form.displayName} onChange={(event) => setField('displayName', event.target.value)} /></div>
            <div className="field"><label>이메일 (변경 불가)</label><input type="email" value={user.email} placeholder="제공되지 않음" readOnly aria-readonly="true" /></div>
            <div className="field"><label>휴대전화번호</label><input type="tel" inputMode="tel" value={form.phone} onChange={(event) => setField('phone', event.target.value)} placeholder="010-0000-0000" /></div>
            <div className="field"><label>우편번호</label><div className="postcode-row"><input type="text" value={form.postalCode} placeholder="우편번호" readOnly /><button type="button" className="btn btn-ghost btn-sm" onClick={findPostcode}>주소 찾기</button></div></div>
            <div className="field mypage-edit-wide"><label>기본주소</label><input type="text" value={form.address} onChange={(event) => setField('address', event.target.value)} placeholder="배송받을 주소를 입력해 주세요" /></div>
            <div className="field mypage-edit-wide"><label>상세주소</label><input type="text" value={form.addressDetail} onChange={(event) => setField('addressDetail', event.target.value)} placeholder="상세주소를 입력해 주세요" /></div>
            <div className="mypage-edit-actions"><button type="button" className="btn btn-ghost" onClick={() => setEditing(false)} disabled={saving}>취소</button><button type="button" className="btn btn-primary" onClick={save} disabled={saving}>{saving ? '저장 중…' : '저장하기'}</button></div>
          </div>
        )}
      </section>

      <section className="mypage-section" aria-labelledby="mypage-goal-title">
        <div className="mypage-section-head"><div><span className="section-number">3</span><h2 id="mypage-goal-title">나의 맞춤 쇼핑 기준</h2></div><button className="more-link" onClick={() => navigate('goalSetup')}>재설정하기 →</button></div>
        <div className="mypage-goal-row"><div><span>구매 목적</span><strong>{goal || '미설정'}</strong></div><div><span>선택 조건</span><strong>{subFilters.join(' · ') || '없음'}</strong></div><div><span>알레르기 제외</span><strong>{allergies.join(' · ') || '제외 없음'}</strong></div></div>
      </section>

      <section className="mypage-section" aria-labelledby="mypage-inquiries-title">
        <div className="mypage-section-head"><div><span className="section-number">4</span><h2 id="mypage-inquiries-title">고객지원</h2></div></div>
        <div className="mypage-empty-row"><div><Icon name="message-circle" size={22} /><span><strong>1:1 문의 내역</strong><small>접수한 문의와 답변을 확인할 수 있어요.</small></span></div><button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('supportInquiries')}>확인하기</button></div>
      </section>

      <div id="my-coupons"><MyCoupons key={authUserId} userId={authUserId} /></div>
      <div className="mypage-account-actions">
        <button type="button" className="mypage-withdrawal-link" onClick={() => { setWithdrawalAgreed(false); setWithdrawalOpen(true) }}>회원탈퇴</button>
      </div>

      {withdrawalOpen && (
        <div className="withdrawal-overlay" onMouseDown={(event) => event.target === event.currentTarget && setWithdrawalOpen(false)}>
          <section className="withdrawal-modal" role="dialog" aria-modal="true" aria-labelledby="withdrawal-title" aria-describedby="withdrawal-description">
            <div className="withdrawal-modal-head">
              <div><span className="eyebrow">CareMarket account</span><h2 id="withdrawal-title">회원탈퇴 안내</h2></div>
              <button type="button" className="withdrawal-close" onClick={() => setWithdrawalOpen(false)} aria-label="회원탈퇴 안내 닫기">×</button>
            </div>
            <p id="withdrawal-description" className="withdrawal-lead">탈퇴하기 전에 아래 내용을 꼭 확인해 주세요.</p>
            <div className="withdrawal-notices">
              <div><strong>탈퇴 시 이용 정보가 삭제됩니다.</strong><p>회원정보, 찜 목록, 맞춤 쇼핑 기준은 탈퇴 후 복구할 수 없습니다.</p></div>
              <div><strong>주문·문의 기록은 관련 법령에 따라 보관될 수 있습니다.</strong><p>결제와 배송이 완료되지 않은 주문이 있다면 처리가 끝난 후 탈퇴해 주세요.</p></div>
              <div><strong>탈퇴 후 같은 이메일로 바로 재가입할 수 없습니다.</strong><p>보관 기간이 끝난 뒤 재가입할 수 있습니다.</p></div>
            </div>
            <label className="withdrawal-agree">
              <input type="checkbox" checked={withdrawalAgreed} onChange={(event) => setWithdrawalAgreed(event.target.checked)} />
              <span>위 내용을 확인했으며 회원탈퇴를 진행하겠습니다.</span>
            </label>
            <div className="withdrawal-modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setWithdrawalOpen(false)}>취소</button>
              <button type="button" className="btn btn-primary" disabled={!withdrawalAgreed} onClick={() => setWithdrawalOpen(false)}>탈퇴 진행</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
```

## src/pages/Wishlist.jsx

찜 목록과 비회원·오류·빈 상태

원본 줄 1–58

```jsx
import { useStore } from '../store'
import Icon from '../components/Icon'
import ProductCard from '../components/ProductCard'

export default function Wishlist() {
  const { user, isLoggedIn, wishlist, wishlistLoading, wishlistError, reloadWishlist, products, productsLoading, productsError, reloadProducts, navigate } = useStore()
  const wishedProducts = wishlist
    .map((id) => products.find((product) => product.id === id))
    .filter(Boolean)

  if (!isLoggedIn || !user) {
    return (
      <div className="wrap page">
        <div className="page-slim mypage-login"><div className="panel">
          <div className="auth-head"><h2>로그인이 필요합니다</h2><p>로그인하면 관심 상품을 찜하고 한곳에서 모아볼 수 있습니다.</p></div>
          <div className="mypage-login-actions"><button className="btn btn-primary" onClick={() => navigate('login')}>로그인</button><button className="btn btn-ghost" onClick={() => navigate('register')}>회원가입</button></div>
        </div></div>
      </div>
    )
  }

  return (
    <div className="wrap page">
      <div className="page-mid wishlist-page">
        <div className="page-head wishlist-page-head">
          <div>
            <span className="eyebrow">My Wishlist</span>
            <h1 className="page-title">찜한 상품</h1>
            <p>다시 보고 싶은 상품을 모아두었어요.</p>
          </div>
          <span className="wishlist-page-count"><Icon name="heart" size={15} fill="currentColor" /> {wishlist.length}개</span>
        </div>

        {wishlistLoading || (productsLoading && wishlist.length > 0) ? (
          <div className="empty" aria-live="polite">
            <Icon name="heart" size={42} />
            <h3>찜한 상품을 불러오고 있습니다.</h3>
          </div>
        ) : wishlistError ? (
          <div className="empty wishlist-page-empty" role="alert"><Icon name="alert-circle" size={44} /><h3>찜 목록을 불러오지 못했어요.</h3><p>잠시 후 다시 시도해 주세요.</p><button type="button" className="btn btn-primary" onClick={reloadWishlist}>다시 시도</button></div>
        ) : productsError && wishlist.length > 0 ? (
          <div className="empty wishlist-page-empty" role="alert"><Icon name="alert-circle" size={44} /><h3>찜한 상품 정보를 불러오지 못했어요.</h3><p>잠시 후 다시 시도해 주세요.</p><button type="button" className="btn btn-primary" onClick={reloadProducts}>다시 시도</button></div>
        ) : wishedProducts.length ? (
          <div className="product-grid wishlist-page-grid">
            {wishedProducts.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        ) : (
          <div className="empty wishlist-page-empty">
            <Icon name="heart" size={44} />
            <h3>아직 찜한 상품이 없습니다.</h3>
            <p>관심 있는 상품의 하트를 눌러 여기에 모아보세요.</p>
            <button className="btn btn-primary" onClick={() => navigate('products')}>상품 둘러보기</button>
          </div>
        )}
      </div>
    </div>
  )
}
```

## src/components/WishlistQuickPanel.jsx

고정 찜 패널·담기·전체보기

원본 줄 1–56

```jsx
import { useStore } from '../store'
import Icon from './Icon'
import ProductImage from './ProductImage'
import { won } from '../lib/format'

const MAX_PREVIEW_ITEMS = 3

export default function WishlistQuickPanel() {
  const { wishlist, products, navigate, openProduct, toggleWish, addToCart } = useStore()
  const wishedProducts = wishlist
    .map((id) => products.find((product) => product.id === id))
    .filter(Boolean)

  if (!wishlist.length || !wishedProducts.length) return null

  const previewProducts = wishedProducts.slice(0, MAX_PREVIEW_ITEMS)
  const hiddenCount = Math.max(0, wishlist.length - previewProducts.length)

  return (
    <aside className="wishlist-quick" aria-label={`찜한 상품 요약 ${wishlist.length}개`}>
      <div className="wishlist-quick-head">
        <div>
          <span className="wishlist-quick-icon"><Icon name="heart" size={15} fill="currentColor" /></span>
          <strong>찜한 상품</strong>
          <small>{wishlist.length}</small>
        </div>
      </div>

      <div className="wishlist-quick-list">
        {previewProducts.map((product) => (
          <article key={product.id} className="wishlist-quick-item">
            <button type="button" className="wishlist-quick-media" onClick={() => openProduct(product)} aria-label={`${product.name} 상세보기`}>
              <ProductImage src={product.image} alt="" />
            </button>
            <div className="wishlist-quick-info">
              <span>{product.brand}</span>
              <button type="button" className="wishlist-quick-name" onClick={() => openProduct(product)}>{product.name}</button>
              <strong>{won(product.price)}</strong>
              <button type="button" className="wishlist-quick-remove" onClick={() => toggleWish(product.id)} aria-label={`${product.name} 찜 해제`}>
                <Icon name="heart" size={13} fill="currentColor" /> 찜 해제
              </button>
            </div>
            <button type="button" className="wishlist-quick-cart" onClick={() => addToCart(product, 1)} aria-label={`${product.name} 장바구니 담기`}>
              <Icon name="cart" size={16} />
            </button>
          </article>
        ))}
      </div>

      <button type="button" className="wishlist-quick-more" onClick={() => navigate('wishlist')}>
        {hiddenCount ? `${hiddenCount}개 상품 더보기` : '찜한 상품 전체보기'}
        <Icon name="chevron-right" size={14} />
      </button>
    </aside>
  )
}
```

## src/components/MyCoupons.jsx

쿠폰 선택 초안과 실제 적용·사용완료. 데이터 조회 제외

원본 줄 4–15

```jsx
const couponDate = value => new Date(value).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })

export default function MyCoupons({ userId, selected = '', onSelect, disabled = false }) {
  const titleId = useId()
  const [state, setState] = useState({ rows: [], error: false, key: '' })
  const [revision, setRevision] = useState(0)
  const [choice, setChoice] = useState(selected)
  const key = `${userId}:${revision}`
  const loading = state.key !== key
  const rows = loading ? [] : state.rows
  const available = rows.filter(coupon => !coupon.used_at)
  const applied = available.find(coupon => coupon.id === selected)
```

원본 줄 25–50

```jsx
  return <section className={onSelect ? 'checkout-section checkout-coupons' : 'mypage-section'} aria-labelledby={titleId}>
    <div className={onSelect ? 'checkout-section-head' : 'mypage-section-head'}>
      <h2 id={titleId}>{onSelect ? '쿠폰 적용' : '나의 쿠폰'}</h2>
      {!loading && !state.error && <small>사용 가능 {available.length}장</small>}
    </div>
    {loading ? <p role="status">쿠폰을 불러오고 있습니다.</p> : state.error ? <p role="alert">쿠폰을 불러오지 못했어요. <button type="button" className="btn btn-text" onClick={() => setRevision(n => n + 1)}>다시 시도</button></p>
      : onSelect ? <>
        {!available.length && <p>사용 가능한 쿠폰이 없습니다.</p>}
          <div className="coupon-controls">
            <label className="field coupon-field">쿠폰 선택<select value={choice} disabled={disabled || !available.length} onChange={event => setChoice(event.target.value)}>
              <option value="">{available.length ? '쿠폰을 선택해 주세요' : '선택 가능한 쿠폰 없음'}</option>
              {available.map(coupon => <option key={coupon.id} value={coupon.id}>{coupon.coupons.name} · 상품금액 {coupon.coupons.percent}% 할인</option>)}
            </select></label>
            <button type="button" className="btn btn-soft btn-sm" disabled={disabled || !choice || choice === selected || !available.some(c => c.id === choice)} onClick={() => onSelect(choice)}>쿠폰 적용</button>
          </div>
          {applied && <div className="coupon-applied" role="status"><span><strong>{applied.coupons.name}</strong> 쿠폰이 적용되었습니다.</span><button type="button" className="btn btn-text" disabled={disabled} onClick={() => { setChoice(''); onSelect('') }}>적용 취소</button></div>}
          {available.length > 0 && <p className="cart-summary-note">상품금액에만 할인 적용 · 배송비 제외 · 주문당 쿠폰 1장</p>}
      </> : !rows.length ? <p>보유한 쿠폰이 없습니다.</p> : <>
        <div className="coupon-list">{rows.map(coupon => <article className="coupon-row" key={coupon.id}>
          <div><strong>{coupon.coupons.name}</strong><p>상품금액 {coupon.coupons.percent}% 할인 · 배송비 제외</p><small>발급일 {couponDate(coupon.issued_at)}{coupon.used_at ? ` · 사용일 ${couponDate(coupon.used_at)}` : ''}</small></div>
          <span className={`status ${coupon.used_at ? 'status-done' : 'status-active'}`}>{coupon.used_at ? '사용 완료' : '사용 가능'}</span>
        </article>)}</div>
        {available.length > 0 && <p className="cart-summary-note">사용 가능한 쿠폰은 주문/결제에서 선택해 적용할 수 있습니다.</p>}
      </>}
  </section>
}
```

## src/components/EventPopup.jsx

세션 내 환영 팝업·native dialog

원본 줄 1–51

```jsx
import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'

const KEY = 'cm_welcome_dismissed'

export default function EventPopup() {
  const { isLoggedIn, authLoading, view, navigate } = useStore()
  const [open, setOpen] = useState(() => {
    try { return sessionStorage.getItem(KEY) !== '1' } catch { return true }
  })
  const dialog = useRef(null)
  const close = () => {
    try { sessionStorage.setItem(KEY, '1') } catch { /* Storage may be unavailable. */ }
    setOpen(false)
  }
  const visible = !authLoading && !isLoggedIn && view === 'main' && open
  useEffect(() => {
    if (!visible) return
    const previous = document.activeElement
    const modal = dialog.current
    modal?.showModal()
    return () => { modal?.close(); previous?.focus?.() }
  }, [visible])

  if (!visible) return null

  return (
      <dialog ref={dialog} className="ev-modal" aria-labelledby="welcome-title" onCancel={close} onClick={e => { if (e.target === e.currentTarget && (e.clientX < e.currentTarget.getBoundingClientRect().left || e.clientX > e.currentTarget.getBoundingClientRect().right)) close() }}>
        <button className="ev-close" onClick={close} aria-label="닫기">×</button>
        <p className="ev-kicker">CAREMARKET WELCOME</p>
        <h2 className="ev-title" id="welcome-title">반가워요.</h2>
        <p className="ev-sub">신규회원 20% 쿠폰으로<br />건강한 첫 선택을 시작하세요.</p>

        <div className="ev-coupon">
          <div className="ev-coupon-main">
            <div className="cap">WELCOME COUPON</div>
            <div className="off">20%<small>OFF</small></div>
            <div className="use">가입 시 자동 발급 · 상품금액 20% 할인<br />배송비 제외 · 회원당 1회</div>
          </div>
          <div className="ev-coupon-side">
            COUPON
          </div>
        </div>

        <div className="ev-foot">
          <button className="ev-skip" onClick={close}>다음에 볼게요</button>
          <button className="btn btn-primary btn-sm" onClick={() => { close(); navigate('register') }}>혜택 확인하기</button>
        </div>
      </dialog>
  )
}
```

## src/components/CartLoginPrompt.jsx

비회원 담기 dialog

원본 줄 1–27

```jsx
import { useEffect, useRef } from 'react'
import { useStore } from '../store'
import Icon from './Icon'

export default function CartLoginPrompt() {
  const { setLoginPromptOpen, navigate } = useStore()
  const dialog = useRef(null)
  useEffect(() => {
    const element = dialog.current
    element.showModal()
    return () => element.close()
  }, [])
  const close = () => setLoginPromptOpen(false)
  return (
    <dialog ref={dialog} className="cart-login-prompt" aria-labelledby="cart-login-title"
      aria-describedby="cart-login-description" onCancel={close}>
      <button className="icon-btn cart-login-close" aria-label="닫기" onClick={close}><Icon name="x" /></button>
      <div className="cart-login-context"><Icon name="leaf" size={20} /><span>MEMBER SHOPPING</span></div>
      <h2 id="cart-login-title">로그인 후 이용할 수 있어요</h2>
      <p id="cart-login-description">장바구니에 상품을 담으려면 로그인해 주세요.</p>
      <button className="btn btn-primary btn-block cart-login-submit" onClick={() => { close(); navigate('login') }}>
        <Icon name="user" size={16} /> 로그인하기
      </button>
      <button className="cart-login-browse-text" onClick={close}>더 둘러볼게요</button>
    </dialog>
  )
}
```

## src/components/Toast.jsx

토스트 메시지/액션 렌더링

원본 줄 1–20

```jsx
import { useStore } from '../store'
import Icon from './Icon'

export default function Toast() {
  const { toast } = useStore()
  if (!toast) return null
  // 하위호환: 문자열이면 일반 토스트로 처리
  const { msg, kind, action } = typeof toast === 'string' ? { msg: toast, kind: 'default' } : toast
  const isAuth = kind === 'auth' || kind === 'auth-error'
  const isError = kind === 'auth-error'
  return (
    <div className={`toast${isAuth ? ' toast-auth' : ''}${isError ? ' toast-error' : ''}`} role={isError ? 'alert' : 'status'}>
      <Icon name={isError ? 'alert-circle' : 'check-circle'} size={18} />
      <span>{msg}</span>
      {action?.label && typeof action.onClick === 'function' && (
        <button type="button" className="toast-action" onClick={action.onClick}>{action.label}</button>
      )}
    </div>
  )
}
```

## src/components/ProductImage.jsx

상품 이미지 오류 fallback

원본 줄 1–28

```jsx
import { useState } from 'react'
import Icon from './Icon'

// 네트워크 이미지가 실패해도 발표 화면이 깨지지 않도록 세이지 톤 폴백 처리
export default function ProductImage({ src, alt, className }) {
  const [failedSrc, setFailedSrc] = useState(null)
  if (!src || failedSrc === src) {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--brand-tint)',
          color: 'var(--brand-500)',
          width: '100%',
          height: '100%',
        }}
      >
        <Icon name="leaf" size={40} strokeWidth={1.4} />
      </div>
    )
  }
  return (
    <img src={src} alt={alt} className={className} loading="lazy" onError={() => setFailedSrc(src)} />
  )
}
```

## src/components/Icon.jsx

공통 SVG 아이콘

원본 줄 1–61

```jsx
// 의존성 없이 필요한 아이콘만 담은 인라인 SVG 세트 (stroke = currentColor)
const P = {
  leaf: <><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" /><path d="M2 21c0-3 1.85-5.36 5.08-6" /></>,
  sprout: <><path d="M7 20h10" /><path d="M12 20v-7" /><path d="M12 13c-3.8 0-6-2.2-6-5.8 3.8 0 6 2.2 6 5.8Z" /><path d="M12 13c0-4.4 2.6-7 6.8-7-0.1 4.2-2.6 7-6.8 7Z" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>,
  x: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
  heart: <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 0 0-16 0" /></>,
  cart: <><circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" /></>,
  sparkles: <><path d="M12 3 13.9 8.6 19.5 10.5 13.9 12.4 12 18 10.1 12.4 4.5 10.5 10.1 8.6z" /><path d="M5 3v4M3 5h4M19 17v4M17 19h4" /></>,
  'shield-check': <><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" /></>,
  'shield-alert': <><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="M12 8v4M12 16h.01" /></>,
  dumbbell: <><path d="m6.5 6.5 11 11M21 21l-1-1M3 3l1 1M18 22l4-4M2 6l4-4M3 10l7-7M14 21l7-7" /></>,
  flame: <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />,
  apple: <><path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z" /><path d="M10 2c1 .5 2 2 2 5" /></>,
  pill: <><path d="m10.5 20.5-8-8a4.95 4.95 0 0 1 7-7l8 8a4.95 4.95 0 0 1-7 7Z" /><path d="m8.5 8.5 7 7" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4" /></>,
  droplets: <><path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 4.7 7 3c-.29 1.7-1.15 3.13-2.29 4.06S3 11.09 3 12.25c0 2.22 1.8 4.05 4 4.05z" /><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  award: <><path d="m15.5 12.8 1.9 6.2-5.4-3.3-5.4 3.3 1.9-6.2" /><circle cx="12" cy="8" r="6" /></>,
  check: <path d="M20 6 9 17l-5-5" />,
  'check-circle': <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m22 4-10 10.01-3-3" /></>,
  'chevron-right': <path d="m9 18 6-6-6-6" />,
  'chevron-left': <path d="m15 18-6-6 6-6" />,
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  'chevron-up': <path d="m18 15-6-6-6 6" />,
  eye: <><path d="M2.06 12.35a1 1 0 0 1 0-.7 10.94 10.94 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.94 10.94 0 0 1-19.88 0Z" /><circle cx="12" cy="12" r="3" /></>,
  'eye-off': <><path d="M10.73 5.08A10.79 10.79 0 0 1 12 5c6 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s4 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><path d="m9.9 9.9a3 3 0 0 0 4.2 4.2M2 2l20 20" /></>,
  'arrow-up-right': <><path d="M7 7h10v10" /><path d="M7 17 17 7" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  trash: <><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M10 11v6M14 11v6" /></>,
  truck: <><path d="M14 18V6a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h1" /><path d="M14 9h4l3 3v5a1 1 0 0 1-1 1h-1" /><circle cx="7.5" cy="18.5" r="1.5" /><circle cx="17.5" cy="18.5" r="1.5" /></>,
  'credit-card': <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>,
  star: <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 18.4 6.1 21l1.2-6.5L2.5 9.9l6.6-.9z" />,
  sliders: <><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" /></>,
  'alert-circle': <><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></>,
  package: <><path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" /><path d="m3.3 7 8.7 5 8.7-5M12 22V12" /></>,
  'message-circle': <><path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 9.6 9.6 0 0 1-4-.9L3 21l1.7-4.5A8.5 8.5 0 1 1 21 11.5Z" /></>,
}

export default function Icon({ name, size = 18, className = '', fill = 'none', strokeWidth = 1.8, style }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden="true"
    >
      {P[name] || null}
    </svg>
  )
}
```

## src/components/Stars.jsx

별점·샘플 표시

원본 줄 1–20

```jsx
import Icon from './Icon'
import { getSampleReviewSummary } from '../data/mock'

export function SampleRating({ productId, showSampleLabel = true }) {
  const { averageRating, reviewCount } = getSampleReviewSummary(productId)
  return <span className="sample-rating" aria-label={`샘플 별점 ${averageRating.toFixed(1)}점, 후기 ${reviewCount}개`}>
    <Stars rating={averageRating.toFixed(1)} count={reviewCount} />
    {showSampleLabel && <small>샘플</small>}
  </span>
}

export default function Stars({ rating, count }) {
  return (
    <span className="stars">
      <Icon name="star" size={13} fill="currentColor" strokeWidth={0} />
      {rating}
      {count != null && <span className="rc">({count.toLocaleString('ko-KR')})</span>}
    </span>
  )
}
```

## src/components/ProductReviews.jsx

샘플 후기 펼침/접힘

원본 줄 1–30

```jsx
import { useState } from 'react'
import { getSampleReviews, getSampleReviewSummary } from '../data/mock'
import Stars from './Stars'

export default function ProductReviews({ product }) {
  const [expanded, setExpanded] = useState(false)
  const { averageRating, reviewCount } = getSampleReviewSummary(product.id)
  const reviews = getSampleReviews(product)

  return <section className="product-reviews" aria-labelledby="reviews-title">
    <div className="page-head"><h2 id="reviews-title">구매 후기</h2></div>
    <div className="sample-review-summary">
      <Stars rating={averageRating.toFixed(1)} />
      <span aria-hidden="true">|</span>
      <span>{reviewCount}개의 후기</span>
      <small>샘플</small>
    </div>
    <div id="sample-review-list">
      {(expanded ? reviews : reviews.slice(0, 3)).map(review => <article className="review-row" key={review.id}>
        <div><b>{review.author}</b><span className="sample-review-stars" aria-label={`5점 만점에 ${review.rating}점`}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span></div>
        <p>{review.content}</p>
        <small><time dateTime={review.date}>{review.date.replaceAll('-', '.')}</time></small>
      </article>)}
    </div>
    <button type="button" className="btn btn-text sample-review-more" aria-expanded={expanded} aria-controls="sample-review-list" onClick={() => setExpanded(value => !value)}>
      {expanded ? '후기 접기' : '후기 더보기'}
    </button>
    <p className="sample-review-note">포트폴리오 시연을 위한 샘플 리뷰입니다.</p>
  </section>
}
```

## src/components/WellnessTable.jsx

쇼퍼블 이미지·좌표 분기·팝오버·일괄 담기

원본 줄 1–208

```jsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store'
import Icon from './Icon'
import ProductImage from './ProductImage'
import { won } from '../lib/format'
import {
  WELLNESS_TABLE_THEMES,
  getTodayWellnessConfig,
} from '../lib/wellness-table'

const number = (value) => Number(value) || 0

function useMobileWellnessTable() {
  const query = '(max-width: 760px)'
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    const update = () => setIsMobile(mediaQuery.matches)
    update()
    mediaQuery.addEventListener('change', update)
    return () => mediaQuery.removeEventListener('change', update)
  }, [])

  return isMobile
}

function productText(product) {
  // category는 slot의 허용 카테고리로 별도 비교한다. 여기에는 실제 상품명/설명만 넣어
  // "프로틴음료" 같은 카테고리명이 모든 키워드를 통과시키지 않게 한다.
  return [product.name, product.summary, ...(product.mainIngredients || [])]
    .join(' ')
    .toLocaleLowerCase()
}

function candidatesForSlot(products, slot) {
  return products
    .filter((product) => {
      const includesKeyword = slot.keywords.some((keyword) => productText(product).includes(keyword.toLocaleLowerCase()))
      return slot.categories.includes(product.category)
        && includesKeyword
        && (slot.minProtein == null || number(product.nutrition?.protein) >= slot.minProtein)
        && (slot.maxSugar == null || number(product.nutrition?.sugar) <= slot.maxSugar)
    })
    .sort((a, b) => a.id - b.id)
}

function productForSlot(products, slot, rotation, slotIndex) {
  const candidates = candidatesForSlot(products, slot)
  if (!candidates.length) return null
  return candidates[(rotation + slotIndex) % candidates.length]
}

export default function WellnessTable() {
  const { products, openProduct, addToCart, requireCartLogin } = useStore()
  const isMobile = useMobileWellnessTable()
  const todayConfigs = useMemo(() => getTodayWellnessConfig(), [])
  const [activeThemeId, setActiveThemeId] = useState(todayConfigs[0]?.themeId || 'protein')
  const [activeSpot, setActiveSpot] = useState(null)
  const pinnedSpotRef = useRef(null)
  const timerRef = useRef(null)

  const activeConfig = todayConfigs.find((config) => config.themeId === activeThemeId) || todayConfigs[0]
  const theme = WELLNESS_TABLE_THEMES.find((item) => item.id === activeConfig?.themeId) || WELLNESS_TABLE_THEMES[0]
  const spots = useMemo(() => theme.visual.slots
    .map((slot, index) => {
      const product = productForSlot(products, slot, activeConfig?.rotation || 0, index)
      return product ? { key: `${slot.id}-${product.id}`, product, slot, number: index + 1 } : null
    })
    .filter(Boolean), [products, theme, activeConfig?.rotation])
  const selectedSpot = spots.find((spot) => spot.key === activeSpot)

  const reveal = (key) => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = null
    setActiveSpot(key)
  }
  const hideLater = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setActiveSpot(pinnedSpotRef.current), 140)
  }
  const selectTheme = (id) => {
    pinnedSpotRef.current = null
    setActiveSpot(null)
    setActiveThemeId(id)
  }
  const toggleSpot = (key) => {
    if (pinnedSpotRef.current === key) {
      pinnedSpotRef.current = null
      setActiveSpot(null)
      return
    }
    pinnedSpotRef.current = key
    reveal(key)
  }
  const addTodaysTable = async () => {
    if (!spots.length || !requireCartLogin()) return
    for (const spot of spots) {
      if (!await addToCart(spot.product, 1)) break
    }
  }

  return (
    <section className="section wellness-table-section" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <div className="wtable-heading">
          <div>
            <span className="eyebrow">Today&apos;s Wellness Table</span>
            <h2 className="serif" style={{ fontSize: 26, fontWeight: 400, letterSpacing: '-0.015em' }}>오늘의 웰빙 테이블</h2>
            <p>식탁 위 <b style={{ color: 'var(--brand-600)' }}>+</b>{isMobile ? '를 눌러 상품을 확인하세요.' : '에 마우스를 올려보세요.'}</p>
          </div>
          <div className="wtable-tabs" role="tablist" aria-label="웰빙 테이블 테마">
            {WELLNESS_TABLE_THEMES.map((item) => (
              <button
                key={item.id}
                role="tab"
                aria-selected={theme.id === item.id}
                className={theme.id === item.id ? 'active' : ''}
                onClick={() => selectTheme(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="wtable-stage" style={{ '--wtable-image-ratio': theme.visual.aspectRatio }}>
          <div
            className="wtable-media"
            style={{ backgroundImage: `url(${theme.visual.image})`, backgroundPosition: theme.visual.objectPosition }}
            role="img"
            aria-label={theme.visual.alt}
          >
          </div>
          <div className="wtable-layer">
            {spots.map((spot) => {
              const coordinates = spot.slot.coordinates[isMobile ? 'mobile' : 'desktop']
              return (
              <button
                key={spot.key}
                className={`hotspot${activeSpot === spot.key ? ' on' : ''}`}
                style={{ left: `${coordinates.x}%`, top: `${coordinates.y}%` }}
                onMouseEnter={() => reveal(spot.key)}
                onMouseLeave={hideLater}
                onFocus={() => reveal(spot.key)}
                onClick={() => toggleSpot(spot.key)}
                aria-label={`${spot.product.name} 보기`}
              >
                <Icon name="plus" size={16} strokeWidth={2.5} className="hotspot-ico" />
              </button>
              )
            })}
            {selectedSpot && (
              (() => {
                const coordinates = selectedSpot.slot.coordinates[isMobile ? 'mobile' : 'desktop']
                return (
              <button
                className={`wpop${coordinates.y < 45 ? ' below' : ''}`}
                style={{ left: `${Math.min(Math.max(coordinates.x, 25), 75)}%`, top: `${coordinates.y}%` }}
                onMouseEnter={() => reveal(selectedSpot.key)}
                onMouseLeave={hideLater}
                onClick={() => openProduct(selectedSpot.product)}
              >
                <span className="wpop-media"><ProductImage src={selectedSpot.product.image} alt="" /></span>
                <span className="wpop-copy">
                  <span className="wpop-name">{selectedSpot.product.name}</span>
                  <span className="wpop-price">{won(selectedSpot.product.price)}</span>
                </span>
                <Icon name="chevron-right" size={16} />
              </button>
                )
              })()
            )}
          </div>
        </div>

        {spots.length > 0 && (
          <div className="wstrip" aria-label={`${theme.label} 상품 목록`}>
            {spots.map((spot) => (
              <button
                key={spot.key}
                className={`wstrip-card${activeSpot === spot.key ? ' active' : ''}`}
                onMouseEnter={() => reveal(spot.key)}
                onMouseLeave={hideLater}
                onFocus={() => reveal(spot.key)}
                onClick={() => openProduct(spot.product)}
              >
                <span className="wstrip-index">{String(spot.number).padStart(2, '0')}</span>
                <span className="wstrip-thumb"><ProductImage src={spot.product.image} alt={spot.product.name} /></span>
                <span className="wstrip-info">
                  <span className="wstrip-name">{spot.product.name}</span>
                  <span className="wstrip-price">{won(spot.product.price)}</span>
                </span>
              </button>
            ))}
          </div>
        )}
        {spots.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18 }}>
            <button className="btn btn-primary" onClick={addTodaysTable}>
              <Icon name="cart" size={16} /> 오늘의 식단 한 번에 담기
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
```

## src/components/DailyRoutine.jsx

시간대 탭·자동 시각 갱신

원본 줄 1–62

```jsx
import { useEffect, useState } from 'react'
import { useStore } from '../store'
import Icon from './Icon'
import ProductImage from './ProductImage'
import { won } from '../lib/format'
import { getDailyRoutine, getRoutineClock } from '../lib/daily-routine'

export default function DailyRoutine() {
  const { products, allergies, productsLoading, productsError, reloadProducts, openProduct } = useStore()
  const [clock, setClock] = useState(getRoutineClock)
  const [selection, setSelection] = useState(null)
  useEffect(() => {
    const refresh = () => setClock(getRoutineClock())
    const timer = window.setInterval(refresh, 30000)
    document.addEventListener('visibilitychange', refresh)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh) }
  }, [])
  const routines = getDailyRoutine(products, clock.day, allergies)
  const selectedId = selection?.dateKey === clock.dateKey && selection?.period === clock.slotId ? selection.id : clock.slotId
  const active = routines.find(slot => slot.id === selectedId)
  const choose = (id) => setSelection({ id, dateKey: clock.dateKey, period: clock.slotId })
  const onTabKeyDown = (event, index) => {
    const next = { ArrowRight: (index + 1) % 4, ArrowDown: (index + 1) % 4, ArrowLeft: (index + 3) % 4, ArrowUp: (index + 3) % 4, Home: 0, End: 3 }[event.key]
    if (next == null) return
    event.preventDefault()
    choose(routines[next].id)
    document.getElementById(`routine-tab-${routines[next].id}`)?.focus()
  }
  return (
    <section className="section daily-routine" aria-labelledby="daily-routine-heading">
      <div className="wrap">
        <div className="routine-heading">
          <div><span className="eyebrow">Well-being daily routine</span><h2 className="serif" id="daily-routine-heading">하루를 채우는 시간대별 웰빙 식단</h2></div>
          <p><time dateTime={clock.dateKey}>{clock.label}</time><span>매일 새롭게 만나는 식단</span></p>
        </div>
        <div className="routine-layout">
          <div className="routine-tabs" role="tablist" aria-label="식단 시간대">
            {routines.map((slot, index) => (
              <button key={slot.id} type="button" role="tab" id={`routine-tab-${slot.id}`} aria-controls="routine-panel" aria-selected={active.id === slot.id} tabIndex={active.id === slot.id ? 0 : -1} onKeyDown={event => onTabKeyDown(event, index)} onClick={() => choose(slot.id)}>
                <span className="routine-time">{slot.time}</span>
                <span className="routine-tab-copy"><strong>{slot.label}</strong><span>{slot.note}</span></span>
                {clock.slotId === slot.id && <span className="routine-now">지금</span>}
              </button>
            ))}
          </div>
          <div className="routine-panel" role="tabpanel" id="routine-panel" aria-labelledby={`routine-tab-${active.id}`} tabIndex={0}>
            <span className="routine-kicker">{active.time} &nbsp; / &nbsp; {active.note}</span>
            <h3 className="serif">{active.title}</h3>
            <p className="routine-description">{active.description}</p>
            {productsLoading ? <p className="routine-status" role="status">오늘의 추천 상품을 고르고 있어요.</p>
              : productsError ? <div className="routine-status" role="status">추천 상품을 불러오지 못했어요. <button type="button" className="more-link" onClick={reloadProducts}>다시 시도</button></div>
                : active.product ? <button type="button" className="routine-product" onClick={() => openProduct(active.product)}>
                  <span className="routine-product-image"><ProductImage src={active.product.image} alt="" /></span>
                  <span className="routine-product-copy"><span>함께 즐기기 좋은 상품</span><strong>{active.product.name}</strong><span className="routine-price">{won(active.product.price)}</span></span>
                  <span className="routine-product-link">자세히 보기 <Icon name="arrow-up-right" size={16} /></span>
                </button> : <p className="routine-status">현재 추천할 수 있는 상품을 준비 중이에요.</p>}
          </div>
        </div>
      </div>
    </section>
  )
}
```

## src/pages/Deals.jsx

특가 route shell

원본 줄 1–9

```jsx
import TodayDealsSection from '../components/TodayDealsSection'

export default function Deals() {
  return (
    <div className="deals-page">
      <TodayDealsSection />
    </div>
  )
}
```

## src/components/TodayDealsSection.jsx

일별 특가·카운트다운·로딩

원본 줄 1–57

```jsx
import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store'
import { getCountdown, getLocalDateKey, selectDailyDeals } from '../lib/deals'
import DealProductCard from './DealProductCard'

export default function TodayDealsSection() {
  const { products, productsLoading, productsError, reloadProducts } = useStore()
  const [clock, setClock] = useState(() => ({
    dateKey: getLocalDateKey(),
    countdown: getCountdown(),
  }))

  const dailyDeals = useMemo(
    () => selectDailyDeals(products, clock.dateKey),
    [products, clock.dateKey],
  )

  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      setClock({ dateKey: getLocalDateKey(now), countdown: getCountdown(now) })
    }
    const interval = window.setInterval(updateClock, 1000)
    return () => window.clearInterval(interval)
  }, [])

  return (
    <section className="today-deals" aria-labelledby="today-deals-title">
      <div className="wrap">
        <div className="today-deals-head">
          <div>
            <span className="eyebrow">TODAY&apos;S DEAL</span>
            <h2 id="today-deals-title" className="serif">오늘의 특가</h2>
            <div className="deal-countdown" aria-live="off">
              <span>오늘 특가 남은 시간</span>
              <time>{clock.countdown}</time>
            </div>
          </div>
        </div>
        {productsLoading ? (
          <p className="today-deals-status" aria-live="polite">특가 상품을 불러오고 있습니다.</p>
        ) : productsError ? (
          <div className="home-product-error" role="alert">
            <p><strong>상품을 불러오지 못했어요.</strong><span>잠시 후 다시 시도해 주세요.</span></p>
            <button type="button" className="btn btn-soft btn-sm" onClick={reloadProducts}>다시 시도</button>
          </div>
        ) : dailyDeals.length ? (
          <div className="today-deals-grid">
            {dailyDeals.map((product) => <DealProductCard key={product.id} product={product} />)}
          </div>
        ) : (
          <p className="today-deals-status">현재 판매 중인 할인 상품이 없습니다.</p>
        )}
      </div>
    </section>
  )
}
```

## src/components/DealProductCard.jsx

특가 카드 상세 진입

원본 줄 1–33

```jsx
import { useStore } from '../store'
import { discountRate, won } from '../lib/format'
import ProductImage from './ProductImage'
import { SampleRating } from './Stars'

export default function DealProductCard({ product }) {
  const { openProduct } = useStore()
  const rate = discountRate(product.originalPrice, product.price)

  return (
    <article className="deal-product" onClick={() => openProduct(product)}>
      <div className="deal-product-media">
        <span className="deal-badge">오늘 특가</span>
        <ProductImage src={product.image} alt={product.name} />
      </div>
      <div className="deal-product-info">
        {product.brand && <span className="deal-product-brand">{product.brand}</span>}
        <h3>{product.name}</h3>
        <SampleRating productId={product.id} showSampleLabel={false} />
        <div className="deal-product-price">
          <div className="deal-original">
            <span>기존가</span>
            <del>{won(product.originalPrice)}</del>
          </div>
          <div className="deal-price-now">
            <span className="deal-discount">{rate}%</span>
            <strong>{won(product.price)}</strong>
          </div>
        </div>
      </div>
    </article>
  )
}
```

## src/pages/ServiceInfo.jsx

안내 route별 콘텐츠와 다음 CTA

원본 줄 1–173

```jsx
import { useStore } from '../store'
import Icon from '../components/Icon'

const PAGES = {
  about: {
    visual: 'selection',
    eyebrow: 'ABOUT CAREMARKET',
    title: '잘 먹고 싶은 마음이,\n좋은 선택으로 이어지도록.',
    intro: [
      '나의 일상에 어울리는 식품을 발견하는 곳, 케어마켓입니다. 상품의 정보를 일상의 맥락과 연결해 좋은 선택을 돕습니다.',
      '바쁜 아침부터 운동을 마친 저녁까지. 지금 나에게 필요한 식품을 이해하고, 자신의 기준으로 골라보세요.',
    ],
    sections: [
      ['01 / INFORMATION', '상품이 가진 사실부터 봅니다', '좋은 선택을 위해 가장 먼저 봐야 하는 것은 상품이 스스로 말해 주는 정보입니다. 원재료, 영양성분, 알레르기 정보처럼 확인 가능한 사실을 선택의 출발점으로 삼습니다.'],
      ['02 / CONTEXT', '정보를 일상의 맥락과 연결합니다', '같은 식품도 아침을 간단히 챙기려는 날, 운동 뒤 간식이 필요한 순간, 카페인을 피하고 싶은 저녁에 의미가 달라집니다. 정보가 실제 생활의 어떤 순간과 연결되는지 함께 보여주고자 합니다.'],
      ['03 / CHOICE', '선택의 주도권을 남겨둡니다', '추천은 답을 대신 정하는 일이 아니라 비교할 기준을 선명하게 만드는 일이라고 믿습니다. 이유를 이해하고 자신의 기준으로 마지막 선택을 내릴 수 있는 경험을 만듭니다.'],
    ],
    sectionIcons: ['package', 'calendar', 'check-circle'],
    cta: { label: '케어마켓 가치관', view: 'principles' },
  },
  principles: {
    visual: 'principles',
    eyebrow: 'OUR PRINCIPLES',
    title: '더 많이 보여주기보다,\n더 잘 고를 수 있도록.',
    intro: [
      '검색부터 추천의 이유, 상품 정보를 전하는 방식까지. 케어마켓은 네 가지 원칙으로 더 나은 선택을 돕습니다.',
    ],
    sections: [
      ['원칙 1', '필요한 제품을 먼저', '많은 상품을 보여주는 것보다 사용자의 생활과 목적에 필요한 상품을 찾을 수 있도록 돕는다.', null, '무엇이 인기 있는가보다 지금 무엇이 필요한가를 먼저 묻는다.'],
      ['원칙 2', '이해할 수 있는 정보', '복잡한 원재료와 영양정보를 사용자가 이해하기 쉬운 방식으로 전달한다.', null, '정보의 의미는 바꾸지 않되 비교할 수 있는 순서와 언어로 정리한다.'],
      ['원칙 3', '추천의 이유를 보여준다', 'AI가 추천했다는 사실보다 왜 해당 상품이 조건과 연결되었는지 이해할 수 있는 경험을 지향한다.', null, '조건과 상품 정보 사이의 연결을 설명해 추천을 직접 검토할 수 있게 한다.'],
      ['원칙 4', '건강을 과장하지 않는다', '식품을 질병의 진단이나 치료를 대신하는 수단으로 표현하지 않으며, 검증되지 않은 효능을 사실처럼 전달하지 않는다.', null, '식품이 할 수 있는 역할과 한계를 분명한 언어로 다룬다.'],
    ],
    sectionIcons: ['search', 'eye', 'sparkles', 'shield-check'],
    closing: '좋은 선택의 기준을, 함께 이어갈 브랜드를 기다립니다.',
    cta: { label: '입점 · 제휴 알아보기', view: 'partners' },
  },
  partners: {
    visual: 'partners',
    eyebrow: 'PARTNER WITH CAREMARKET',
    title: '좋은 제품의 진심이,\n일상에 닿도록.',
    intro: [
      '정성껏 만든 제품과 더 잘 먹고 싶은 마음이 만나는 곳. 케어마켓과 함께 건강한 일상의 선택을 넓혀갈 브랜드를 기다립니다.',
    ],
    sections: [
      ['01 / PRODUCT', '좋은 제품을 함께 소개해요', '원재료와 영양정보를 바탕으로 제품의 가치를 전하고, 필요한 고객이 발견할 수 있도록 돕습니다.'],
      ['02 / CONTENT', '브랜드의 이야기를 전해요', '제품을 만든 마음부터 일상 속 즐기는 방법까지. 고객이 공감할 수 있는 콘텐츠를 함께 만듭니다.'],
      ['03 / PROMOTION', '새로운 만남을 기획해요', '계절과 생활에 어울리는 기획전으로 브랜드와 고객이 자연스럽게 만나는 기회를 만듭니다.'],
    ],
    sectionIcons: ['package', 'leaf', 'sparkles'],
    steps: ['제안 접수', '브랜드 / 상품 검토', '협업 조건 협의', '상품 또는 콘텐츠 반영'],
  },
  terms: {
    eyebrow: 'CareMarket', title: '이용약관',
    intro: ['CareMarket 서비스 이용에 필요한 기본 사항을 안내합니다.'],
    sections: [['서비스 이용', '회원은 관련 법령과 본 안내를 준수하며 서비스를 이용합니다. 서비스 운영 내용은 필요에 따라 사전 안내 후 변경될 수 있습니다.'], ['주문과 결제', '주문 및 결제는 화면에 표시된 절차에 따라 진행됩니다. 주문 완료 후에는 주문내역에서 처리 상태를 확인할 수 있습니다.']],
  },
  privacy: {
    eyebrow: 'CareMarket', title: '개인정보처리방침',
    intro: ['CareMarket은 서비스 이용과 주문 처리에 필요한 정보만을 다룹니다.'],
    sections: [['수집하는 정보', '회원가입과 주문 과정에서 이름, 이메일, 연락처, 배송지 정보를 입력받을 수 있습니다.'], ['이용 목적', '회원 식별, 주문 및 배송 처리, 고객 문의 응대를 위해 사용합니다.'], ['보관과 삭제', '관련 법령에 따라 보관이 필요한 정보를 제외하고, 이용 목적이 끝난 정보는 지체 없이 삭제합니다.']],
  },
  cleanLabel: {
    eyebrow: 'CareMarket', title: '클린라벨 정보 기준',
    intro: ['클린라벨은 일률적인 인증 문구가 아니라 상품 페이지의 등록 정보로 확인합니다.'],
    sections: [['표기 기준', '원재료, 알레르기, 영양성분 및 카페인 정보는 판매자가 등록한 내용과 상품 표시 정보를 기준으로 안내합니다.'], ['확인 방법', '구매 전 상품 상세의 원재료 및 영양성분 정보를 확인해 주세요. 개인의 알레르기 또는 건강 상태는 전문가와 상담이 필요할 수 있습니다.']],
  },
}

function BrandStoryVisual({ type }) {
  if (type === 'partners') return <div className="brand-story-visual partner-visual" role="img" aria-label="브랜드의 정성과 고객의 일상이 만나 함께 자라는 새싹">
    <span className="partner-visual-kicker">GROW TOGETHER</span>
    <svg viewBox="0 0 500 430" className="partner-sprout" aria-hidden="true">
      <circle cx="250" cy="210" r="145" fill="#edf4d9" />
      <path d="M250 327V194" fill="none" stroke="#547943" strokeWidth="4" />
      <path d="M250 247C167 248 133 204 139 151C209 146 252 181 250 247Z" fill="#a4c781" />
      <path d="M250 204C249 130 296 98 356 102C360 165 314 207 250 204Z" fill="#759d59" />
      <path d="M250 247L168 180M250 204L325 130" fill="none" stroke="#547943" strokeWidth="2" />
      <ellipse cx="250" cy="328" rx="76" ry="8" fill="#cadbb4" />
    </svg>
    <span className="partner-seed seed-brand">브랜드의 정성</span><span className="partner-seed seed-life">고객의 일상</span>
    <span className="partner-visual-caption">좋은 만남이 자라는 곳, CareMarket</span>
  </div>
  if (type === 'selection') {
    return <div className="brand-story-visual selection-visual" role="img" aria-label="상품의 정보와 일상의 맥락이 이해할 수 있는 선택으로 이어지는 과정">
      <svg className="brand-story-botanical" viewBox="0 0 560 430" aria-hidden="true">
        <path d="M34 381C154 338 190 224 206 62" />
        <path d="M190 142c-51-6-77-29-88-67 42-3 72 20 88 67Z" />
        <path d="M174 207c42-21 79-16 110 16-36 25-75 20-110-16Z" />
        <path d="M118 302c-43-1-72-20-88-55 39-9 72 10 88 55Z" />
        <circle cx="456" cy="74" r="112" />
        <circle cx="456" cy="74" r="78" />
      </svg>
      <div className="brand-story-seal">
        <span className="brand-story-mark"><Icon name="leaf" size={24} /></span>
        <small>CAREMARKET METHOD</small>
        <strong>정보에서<br />좋은 선택까지</strong>
        <em>PURE &amp; CLEAN</em>
      </div>
      <div className="brand-story-chip chip-information"><span>01</span><b>상품의 정보</b><small>원재료 · 영양정보</small></div>
      <div className="brand-story-chip chip-context"><span>02</span><b>나의 일상</b><small>목적 · 상황 · 조건</small></div>
      <div className="brand-story-chip chip-choice"><Icon name="check-circle" size={16} /><b>이해한 선택</b></div>
    </div>
  }

  return <div className="brand-story-visual principles-visual" role="img" aria-label="필요, 이해, 이유, 정직이라는 네 가지 CareMarket 원칙">
    <svg className="principles-orbit" viewBox="0 0 560 430" aria-hidden="true">
      <circle cx="280" cy="215" r="150" />
      <circle cx="280" cy="215" r="104" />
      <path d="M280 65v300M130 215h300" />
    </svg>
    <div className="principles-center">
      <Icon name="sprout" size={34} />
      <small>ONE STANDARD</small>
    </div>
    <span className="principle-word word-need"><i>01</i>필요</span>
    <span className="principle-word word-understand"><i>02</i>이해</span>
    <span className="principle-word word-reason"><i>03</i>이유</span>
    <span className="principle-word word-honest"><i>04</i>정직</span>
    <span className="principles-caption">OUR PRINCIPLES · CAREMARKET</span>
  </div>
}

export default function ServiceInfo() {
  const { view, navigate } = useStore()
  const page = PAGES[view] || PAGES.about
  return <div className={`wrap page service-page${page.visual ? ` story-page ${view}-page` : ''}`}>
    <button className="service-back" onClick={() => navigate('main')}>← CareMarket으로 돌아가기</button>
    <header className={`service-head${page.visual ? ' service-story-head' : ''}`}>
      <div className="service-head-copy">
        <span className="eyebrow">{page.eyebrow}</span>
        <h1>{page.title}</h1>
        {page.intro?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        {view === 'partners' && <a className="btn btn-primary partner-primary" href="/partners/proposal" onClick={(event) => { event.preventDefault(); navigate('partnerProposal') }}>입점 · 제휴 제안하기 <Icon name="arrow-up-right" size={17} /></a>}
      </div>
      {page.visual && <BrandStoryVisual type={page.visual} />}
    </header>
    {page.sections && <div className="service-body">
      {page.sections.map((entry, index) => {
        const [label, title, content, items, note] = entry.length === 2
          ? ['', entry[0], entry[1], null, null]
          : entry
        return <section key={label || title}>
          {(label || page.sectionIcons?.[index]) && <div className="service-section-meta">
            {page.visual === 'principles' && <span className="service-principle-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>}
            {label && <span className="service-section-label">{label}</span>}
            {page.sectionIcons?.[index] && <span className="service-section-icon"><Icon name={page.sectionIcons[index]} size={17} /></span>}
          </div>}
          {(title || content || note) && <div className="service-section-copy">
            {title && <h2>{title}</h2>}
            {content && <p>{content}</p>}
            {note && <p className="service-section-note">{note}</p>}
          </div>}
          {items && <ul className="service-list">{items.map((item) => <li key={item}>{item}</li>)}</ul>}
        </section>
      })}
    </div>}
    {page.steps && <><section className="partner-standard"><span className="service-section-icon"><Icon name="shield-check" size={22} /></span><div><span className="service-section-label">OUR SHARED STANDARD</span><h2>과장 없이 전하는 가치, 함께 지키는 기준.</h2><p>확인 가능한 상품 정보와 일상 속 사용 맥락을 소중히 여깁니다.<br />고객이 이해하고 선택할 수 있도록, 브랜드의 진심을 함께 전합니다.</p></div><button className="service-back" onClick={() => navigate('principles')}>우리의 원칙 보기 →</button></section><section className="service-process">
      <h2>입점 과정</h2>
      <ol>{page.steps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, '0')}</span>{step}{index < page.steps.length - 1 && <Icon name="chevron-right" size={16} className="service-process-arrow" />}</li>)}</ol>
    </section></>}
    {(page.closing || page.cta) && <section className="service-closing">
      {page.closing && <h2>{page.closing}</h2>}
      {page.cta && (view === 'about' || view === 'principles'
        ? <a className="service-next-link" href={view === 'about' ? '/principles' : '/partners'} onClick={(event) => { if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); navigate(page.cta.view) }}><span>{page.cta.label}</span><Icon name="chevron-right" size={15} /></a>
        : <button type="button" className={page.visual ? 'btn btn-primary' : 'service-cta'} onClick={() => navigate(page.cta.view)}>{page.cta.label}{view === 'partners' && <Icon name="arrow-up-right" size={17} />}</button>)}
    </section>}
    {page.unavailableCta && <section className="service-closing service-unavailable">
      <span className="service-cta is-disabled" aria-disabled="true">입점 · 제휴 제안하기</span>
      <p>입점 · 제휴 제안 접수를 준비하고 있습니다.</p>
    </section>}
  </div>
}
```

## src/pages/Support.jsx

로컬 FAQ 검색·카테고리·단일 답변 펼침

원본 줄 1–125

```jsx
import { useMemo, useState } from 'react'
import Icon from '../components/Icon'
import { SUPPORT_CATEGORIES, SUPPORT_FAQS, searchSupportFaqs } from '../lib/support'
import { useStore } from '../store'

const FREQUENT = '자주 찾는 질문'

export default function Support() {
  const { navigate } = useStore()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(FREQUENT)
  const [openId, setOpenId] = useState(null)
  const trimmedQuery = query.trim()

  const visibleFaqs = useMemo(() => {
    if (trimmedQuery) return searchSupportFaqs(trimmedQuery)
    if (category === FREQUENT) return SUPPORT_FAQS.filter((faq) => faq.featured).slice(0, 6)
    return SUPPORT_FAQS.filter((faq) => faq.category === category)
  }, [category, trimmedQuery])

  const selectCategory = (nextCategory) => {
    setCategory(nextCategory)
    setQuery('')
    setOpenId(null)
  }

  const updateQuery = (event) => {
    setQuery(event.target.value)
    setOpenId(null)
  }

  return (
    <div className="support-page">
      <header className="support-hero">
        <div className="wrap support-hero-inner">
          <span className="eyebrow">CUSTOMER CARE</span>
          <h1>무엇을 도와드릴까요?</h1>
          <p>CareMarket 이용 중 궁금한 내용을 빠르게 확인해보세요.</p>
          <div className="support-search" role="search">
            <Icon name="search" size={21} />
            <input
              id="support-search-input"
              type="search"
              aria-label="FAQ 검색"
              value={query}
              onChange={updateQuery}
              placeholder="궁금한 내용을 검색해보세요."
              autoComplete="off"
            />
            {query && <button type="button" onClick={() => { setQuery(''); setOpenId(null) }} aria-label="검색어 지우기"><Icon name="x" size={17} /></button>}
          </div>
        </div>
      </header>

      <div className="wrap support-content">
        <nav className="support-categories" aria-label="FAQ 카테고리">
          {[FREQUENT, ...SUPPORT_CATEGORIES].map((item) => (
            <button
              key={item}
              type="button"
              className={category === item && !trimmedQuery ? 'active' : ''}
              onClick={() => selectCategory(item)}
            >
              {item}
            </button>
          ))}
        </nav>

        <section className="support-faq" aria-labelledby="support-faq-title">
          <div className="support-section-head">
            <div>
              <span className="eyebrow">FAQ</span>
              <h2 id="support-faq-title">{trimmedQuery ? `'${trimmedQuery}' 검색 결과` : category}</h2>
            </div>
            <span>{visibleFaqs.length}개</span>
          </div>

          {visibleFaqs.length > 0 ? (
            <div className="support-accordion">
              {visibleFaqs.map((faq) => {
                const expanded = openId === faq.id
                return (
                  <article key={faq.id} className={expanded ? 'open' : ''}>
                    <h3>
                      <button
                        type="button"
                        aria-expanded={expanded}
                        aria-controls={`faq-answer-${faq.id}`}
                        onClick={() => setOpenId(expanded ? null : faq.id)}
                      >
                        <span className="support-faq-category">{faq.category}</span>
                        <span className="support-faq-question"><b>Q.</b> {faq.question}</span>
                        <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={18} />
                      </button>
                    </h3>
                    {expanded && <div id={`faq-answer-${faq.id}`} className="support-faq-answer"><span>A.</span><p>{faq.answer}</p></div>}
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="support-empty">
              <span className="support-empty-mark"><Icon name="search" size={25} /></span>
              <h3>검색 결과가 없어요.</h3>
              <p>다른 검색어를 입력하거나<br />1:1 문의를 이용해주세요.</p>
              <button type="button" className="btn btn-primary" onClick={() => navigate('supportInquiry')}>1:1 문의하기</button>
            </div>
          )}
        </section>

        <section className="support-inquiry-cta">
          <div>
            <span className="eyebrow">ONE-TO-ONE INQUIRY</span>
            <h2>찾는 답변이 없으신가요?</h2>
            <p>1:1 문의를 남겨주세요. 문의 내용을 확인할 수 있도록 안전하게 접수합니다.</p>
          </div>
          <div className="support-inquiry-actions">
            <button type="button" className="service-cta" onClick={() => navigate('supportInquiry')}>1:1 문의하기 <Icon name="chevron-right" size={17} /></button>
            <button type="button" className="btn btn-text" onClick={() => navigate('supportInquiries')}>내 문의 내역 →</button>
          </div>
        </section>
      </div>
    </div>
  )
}
```

## src/pages/SupportInquiry.jsx

문의 폼·검증·접수 결과·작성/내역 탭

원본 줄 16–193

```jsx
function FieldError({ id, message }) {
  if (!message) return null
  return <span id={id} className="support-field-error" role="alert">{message}</span>
}

function orderLabel(order) {
  const date = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(order.created_at))
  return `${date} · ${order.toss_order_id || order.order_id.slice(0, 8)} · ${won(order.total_price)}`
}

function InquiryExperience({ authUserId, user, navigate }) {
  const [values, setValues] = useState(() => ({ ...EMPTY_INQUIRY_FORM, contactEmail: user?.email || '' }))
  const [errors, setErrors] = useState({})
  const [orders, setOrders] = useState([])
  const [ordersState, setOrdersState] = useState('loading')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [result, setResult] = useState(null)
  const submissionLock = useRef(false)

  useEffect(() => {
    let active = true
    fetchInquiryOrders(supabase, authUserId)
      .then((rows) => {
        if (!active) return
        setOrders(rows)
        setOrdersState('ready')
      })
      .catch((error) => {
        console.error('Support inquiry order fetch failed:', { code: error?.code || 'INQUIRY_ORDERS_FAILED' })
        if (active) setOrdersState('error')
      })
    return () => { active = false }
  }, [authUserId])

  const setField = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => current[field] ? { ...current, [field]: undefined } : current)
    setSubmitError('')
  }

  const submit = async (event) => {
    event.preventDefault()
    if (submissionLock.current || submitting || !authUserId) return
    const nextErrors = validateCustomerInquiry(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      document.getElementById(`inquiry-${Object.keys(nextErrors)[0]}`)?.focus()
      return
    }

    submissionLock.current = true
    setSubmitting(true)
    setSubmitError('')
    try {
      setResult(await submitCustomerInquiry(supabase, values, authUserId))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      console.error('Customer inquiry submission failed:', { code: error?.code || 'CUSTOMER_INQUIRY_SUBMIT_FAILED' })
      setSubmitError('문의를 접수하지 못했어요. 입력한 내용을 확인한 뒤 다시 시도해주세요.')
    } finally {
      submissionLock.current = false
      setSubmitting(false)
    }
  }

  const describedBy = (field) => errors[field] ? `inquiry-${field}-error` : undefined

  if (result) {
    const receiptNumber = result.id.split('-')[0].toUpperCase()
    return <section id="inquiry-compose-panel" className="support-inquiry-success" role="tabpanel" aria-label="1:1 문의 작성">
        <span className="support-success-icon"><Icon name="check" size={30} /></span>
        <span className="eyebrow">INQUIRY RECEIVED</span>
        <h1>문의가 접수되었습니다.</h1>
        <p>문의 내용을 확인한 후 답변드리겠습니다.</p>
        <span className="support-receipt">접수번호 <b>{receiptNumber}</b></span>
        <div className="support-success-actions">
          <button type="button" className="btn btn-primary" onClick={() => navigate('supportInquiries')}>내 문의 확인하기</button>
          <button type="button" className="btn btn-text" onClick={() => navigate('support')}>← 고객지원으로 돌아가기</button>
        </div>
    </section>
  }

  return <section id="inquiry-compose-panel" role="tabpanel" aria-label="1:1 문의 작성">
    <header className="support-inquiry-heading">
      <span className="eyebrow">ONE-TO-ONE INQUIRY</span>
      <h1>1:1 문의</h1>
      <p>주문과 서비스 이용 중 확인이 필요한 내용을 남겨주세요.</p>
    </header>

    <form className="support-inquiry-form" onSubmit={submit} noValidate>
      <div className="support-form-note"><span>* 필수 항목</span><p>문의 답변 및 처리를 위해 입력한 정보를 사용합니다.</p></div>
      <div className="support-form-grid">
        <label htmlFor="inquiry-category">문의 유형 <span>*</span>
          <select id="inquiry-category" value={values.category} onChange={(event) => setField('category', event.target.value)} aria-invalid={Boolean(errors.category)} aria-describedby={describedBy('category')}>
            <option value="">선택해 주세요</option>
            {INQUIRY_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
          </select>
          <FieldError id="inquiry-category-error" message={errors.category} />
        </label>

        <label htmlFor="inquiry-orderId">주문번호 <em>선택</em>
          <select id="inquiry-orderId" value={values.orderId} onChange={(event) => setField('orderId', event.target.value)} disabled={ordersState === 'loading' || ordersState === 'error'}>
            <option value="">{ordersState === 'loading' ? '주문내역을 불러오는 중...' : orders.length ? '관련 주문을 선택해 주세요' : '선택할 주문이 없습니다'}</option>
            {orders.map((order) => <option key={order.order_id} value={order.order_id}>{orderLabel(order)}</option>)}
          </select>
          {ordersState === 'error' && <span className="support-field-help">주문내역을 불러오지 못했어요. 문의 내용에 주문번호를 적어주세요.</span>}
        </label>

        <label className="support-field-wide" htmlFor="inquiry-title">제목 <span>*</span>
          <input id="inquiry-title" value={values.title} onChange={(event) => setField('title', event.target.value)} maxLength={160} placeholder="문의 제목을 입력해 주세요." aria-invalid={Boolean(errors.title)} aria-describedby={describedBy('title')} />
          <FieldError id="inquiry-title-error" message={errors.title} />
        </label>

        <label className="support-field-wide" htmlFor="inquiry-content">문의 내용 <span>*</span>
          <textarea id="inquiry-content" value={values.content} onChange={(event) => setField('content', event.target.value)} maxLength={4000} rows={9} placeholder="확인이 필요한 내용을 자세히 적어주세요." aria-invalid={Boolean(errors.content)} aria-describedby={describedBy('content')} />
          <span className="support-character-count">{values.content.length.toLocaleString()} / 4,000</span>
          <FieldError id="inquiry-content-error" message={errors.content} />
        </label>

        <label className="support-field-wide" htmlFor="inquiry-contactEmail">답변 받을 이메일 <span>*</span>
          <input id="inquiry-contactEmail" type="email" value={values.contactEmail} onChange={(event) => setField('contactEmail', event.target.value)} maxLength={254} autoComplete="email" placeholder="email@example.com" aria-invalid={Boolean(errors.contactEmail)} aria-describedby={describedBy('contactEmail')} />
          <FieldError id="inquiry-contactEmail-error" message={errors.contactEmail} />
        </label>
      </div>

      <div className={`support-consent${errors.privacyAgreed ? ' has-error' : ''}`}>
        <label htmlFor="inquiry-privacyAgreed"><input id="inquiry-privacyAgreed" type="checkbox" checked={values.privacyAgreed} onChange={(event) => setField('privacyAgreed', event.target.checked)} aria-invalid={Boolean(errors.privacyAgreed)} aria-describedby={describedBy('privacyAgreed')} /><span>문의 답변 및 처리를 위한 개인정보 수집·이용에 동의합니다. <b>*</b></span></label>
        <a href="/privacy" onClick={(event) => { event.preventDefault(); navigate('privacy') }}>개인정보처리방침 보기</a>
        <FieldError id="inquiry-privacyAgreed-error" message={errors.privacyAgreed} />
      </div>

      {submitError && <div className="support-submit-error" role="alert"><p>{submitError}</p><button type="submit" disabled={submitting}>다시 시도</button></div>}
      <div className="support-form-actions">
        <p>접수된 문의는 CareMarket 운영 확인을 위해 저장됩니다.</p>
        <button className="service-cta" type="submit" disabled={submitting}>{submitting ? '문의 접수 중...' : '문의 접수하기'}{!submitting && <Icon name="chevron-right" size={17} />}</button>
      </div>
    </form>
  </section>
}

function InquiryWorkspace({ authUserId, user, navigate }) {
  const [mode, setMode] = useState('compose')
  const [historyRevision, setHistoryRevision] = useState(0)

  const switchMode = (nextMode) => {
    setMode(nextMode)
    if (nextMode === 'history') setHistoryRevision((current) => current + 1)
  }

  return <>
    <button className="service-back" type="button" onClick={() => navigate('support')}>← 고객지원으로 돌아가기</button>
    <InquiryModeTabs mode={mode} onChange={switchMode} />
    {mode === 'compose' ? <InquiryExperience authUserId={authUserId} user={user} navigate={navigate} /> : <div id="inquiry-history-panel" role="tabpanel" aria-label="1:1 문의 작성내역"><InquiryHistory key={`${authUserId}-${historyRevision}`} authUserId={authUserId} navigate={navigate} showBack={false} showDetailBack={false} /></div>}
  </>
}

export default function SupportInquiry() {
  const { authUserId, authLoading, isLoggedIn, user, navigate } = useStore()

  if (authLoading) {
    return <div className="wrap page page-narrow"><div className="empty" role="status"><Icon name="shield-check" size={42} /><h3>로그인 정보를 확인하고 있습니다.</h3></div></div>
  }

  if (!isLoggedIn || !authUserId) {
    return <div className="wrap page support-login-required">
      <button className="service-back" type="button" onClick={() => navigate('support')}>← 고객지원으로 돌아가기</button>
      <div className="empty">
        <span className="support-login-mark"><Icon name="user" size={28} /></span>
        <h1>1:1 문의는 로그인 후 이용할 수 있어요.</h1>
        <p>회원 정보와 주문 내역을 안전하게 연결해 문의를 접수합니다.</p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('login')}>로그인</button>
      </div>
    </div>
  }

  return <div className="wrap page support-inquiry-page"><InquiryWorkspace key={authUserId} authUserId={authUserId} user={user} navigate={navigate} /></div>
}
```

## src/pages/SupportInquiries.jsx

문의 내역·로컬 상세·답변 상태

원본 줄 7–132

```jsx
const formatDate = (value, withTime = false) => new Intl.DateTimeFormat('ko-KR', withTime
  ? { dateStyle: 'long', timeStyle: 'short' }
  : { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value))

function InquiryStatusBadge({ status }) {
  return <span className={`support-inquiry-status ${isAnsweredInquiry(status) ? 'answered' : 'waiting'}`}>{inquiryStatusLabel(status)}</span>
}

function LinkedOrder({ inquiry }) {
  const displayId = inquiry.orders?.toss_order_id || inquiry.order_id
  return displayId ? <span className="support-inquiry-order-id">{displayId}</span> : '연결된 주문 없음'
}

function InquiryDetail({ inquiry, onBack, showBack = true }) {
  const answered = isAnsweredInquiry(inquiry)
  return <div className="support-inquiry-detail">
    {showBack && <button className="service-back" type="button" onClick={onBack}>← 1:1 문의 내역</button>}
    <header className="support-inquiry-heading">
      <span className="eyebrow">INQUIRY DETAIL</span>
      <div className="support-inquiry-detail-title"><h1>{inquiry.title}</h1><InquiryStatusBadge status={inquiry.status} /></div>
    </header>

    <section className="support-inquiry-detail-card">
      <dl className="support-inquiry-detail-meta">
        <div><dt>문의 유형</dt><dd>{inquiry.category}</dd></div>
        <div><dt>접수일</dt><dd>{formatDate(inquiry.created_at, true)}</dd></div>
        {inquiry.order_id && <div className="wide"><dt>주문번호</dt><dd><LinkedOrder inquiry={inquiry} /></dd></div>}
        <div><dt>현재 상태</dt><dd><InquiryStatusBadge status={inquiry.status} /></dd></div>
      </dl>
      <div className="support-inquiry-question"><h2>문의 내용</h2><p>{inquiry.content}</p></div>
    </section>

    {answered ? <section className="support-inquiry-answer">
      <span className="eyebrow">CAREMARKET ANSWER</span>
      <h2>CareMarket 답변</h2>
      <p>{inquiry.admin_answer}</p>
      <dl><dt>답변일</dt><dd>{formatDate(inquiry.answered_at, true)}</dd></dl>
    </section> : <section className="support-inquiry-waiting">
      <span className="support-waiting-icon"><Icon name="clock" size={24} /></span>
      <div><h2>답변을 준비하고 있어요.</h2><p>문의 내용을 확인한 후<br />답변이 등록되면 이 화면에서 확인할 수 있습니다.</p></div>
    </section>}
  </div>
}

export function InquiryHistory({ authUserId, navigate, showBack = true, showDetailBack = showBack }) {
  const [inquiries, setInquiries] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(false)
    try {
      setInquiries(await fetchCustomerInquiries(supabase, authUserId))
    } catch (caught) {
      console.error('Customer inquiries fetch failed:', { code: caught?.code || 'CUSTOMER_INQUIRIES_FETCH_FAILED' })
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    fetchCustomerInquiries(supabase, authUserId)
      .then((rows) => { if (active) setInquiries(rows) })
      .catch((caught) => {
        if (!active) return
        console.error('Customer inquiries fetch failed:', { code: caught?.code || 'CUSTOMER_INQUIRIES_FETCH_FAILED' })
        setError(true)
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [authUserId])

  const summary = useMemo(() => inquiries.reduce((counts, inquiry) => {
    counts.total += 1
    counts[isAnsweredInquiry(inquiry) ? 'answered' : 'waiting'] += 1
    return counts
  }, { total: 0, waiting: 0, answered: 0 }), [inquiries])
  const selected = inquiries.find((inquiry) => inquiry.id === selectedId)

  if (selected) return <InquiryDetail inquiry={selected} onBack={() => setSelectedId(null)} showBack={showDetailBack} />

  return <>
    {showBack && <button className="service-back" type="button" onClick={() => navigate('support')}>← 고객지원으로 돌아가기</button>}
    <header className="support-inquiry-heading">
      <span className="eyebrow">MY INQUIRIES</span>
      <h1>1:1 문의 내역</h1>
      <p>접수한 문의의 처리 상태와 CareMarket 답변을 확인하세요.</p>
    </header>

    {loading ? <div className="empty" role="status"><p>문의 내역을 불러오는 중입니다.</p></div> : error ? <div className="empty" role="alert"><h3>문의 내역을 불러오지 못했어요.</h3><button className="btn btn-primary btn-sm" onClick={() => void load()}>다시 시도</button></div> : inquiries.length === 0 ? <div className="empty support-inquiries-empty"><h3>아직 접수한 문의가 없어요.</h3><button className="btn btn-primary" onClick={() => navigate('supportInquiry')}>1:1 문의하기</button></div> : <>
      <dl className="support-inquiry-summary" aria-label="1:1 문의 상태 요약">
        <div><dt>전체</dt><dd>{summary.total}</dd></div>
        <div><dt>답변 대기</dt><dd>{summary.waiting}</dd></div>
        <div><dt>답변 완료</dt><dd>{summary.answered}</dd></div>
      </dl>
      <div className="table-wrap support-inquiry-table-wrap">
        <table className="support-inquiry-table">
          <thead><tr><th>문의 유형</th><th>제목</th><th>접수일</th><th>상태</th></tr></thead>
          <tbody>{inquiries.map((inquiry) => <tr key={inquiry.id} onClick={() => setSelectedId(inquiry.id)}>
            <td><span className="td-cat">{inquiry.category}</span></td>
            <td><button type="button" onClick={() => setSelectedId(inquiry.id)}>{inquiry.title}</button></td>
            <td>{formatDate(inquiry.created_at)}</td>
            <td><InquiryStatusBadge status={inquiry.status} /></td>
          </tr>)}</tbody>
        </table>
      </div>
    </>}
  </>
}

export default function SupportInquiries() {
  const { authUserId, authLoading, isLoggedIn, navigate } = useStore()

  if (authLoading) return <div className="wrap page page-narrow"><div className="empty" role="status"><Icon name="shield-check" size={42} /><h3>로그인 정보를 확인하고 있습니다.</h3></div></div>

  if (!isLoggedIn || !authUserId) return <div className="wrap page support-login-required">
    <button className="service-back" type="button" onClick={() => navigate('support')}>← 고객지원으로 돌아가기</button>
    <div className="empty"><span className="support-login-mark"><Icon name="user" size={28} /></span><h1>내 문의 내역은 로그인 후 확인할 수 있어요.</h1><button type="button" className="btn btn-primary" onClick={() => navigate('login')}>로그인</button></div>
  </div>

  return <div className="wrap page support-inquiry-page"><InquiryHistory key={authUserId} authUserId={authUserId} navigate={navigate} /></div>
}
```

## src/components/InquiryModeTabs.jsx

작성/작성내역 탭

원본 줄 1–24

```jsx
export default function InquiryModeTabs({ mode, onChange }) {
  return <div className="inquiry-mode-tabs" role="tablist" aria-label="1:1 문의 메뉴">
    <button
      type="button"
      role="tab"
      aria-selected={mode === 'compose'}
      aria-controls="inquiry-compose-panel"
      className={mode === 'compose' ? 'active' : ''}
      onClick={() => onChange('compose')}
    >
      1:1 문의 작성
    </button>
    <button
      type="button"
      role="tab"
      aria-selected={mode === 'history'}
      aria-controls="inquiry-history-panel"
      className={mode === 'history' ? 'active' : ''}
      onClick={() => onChange('history')}
    >
      작성내역 확인
    </button>
  </div>
}
```

## src/pages/PartnerProposal.jsx

제휴 작성·검증·접수 완료

원본 줄 12–110

```jsx
function FieldError({ id, message }) {
  if (!message) return null
  return <span id={id} className="proposal-error" role="alert">{message}</span>
}

export default function PartnerProposal() {
  const { navigate } = useStore()
  const [values, setValues] = useState(EMPTY_PARTNERSHIP_FORM)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [result, setResult] = useState(null)

  const setField = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => current[field] ? { ...current, [field]: undefined } : current)
    setSubmitError('')
  }

  const submit = async (event) => {
    event.preventDefault()
    if (submitting) return
    const nextErrors = validatePartnershipForm(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      document.getElementById(`proposal-${Object.keys(nextErrors)[0]}`)?.focus()
      return
    }

    setSubmitting(true)
    setSubmitError('')
    try {
      setResult(await submitPartnershipInquiry(supabase, values))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (caught) {
      console.error('Partnership inquiry submission failed:', { code: caught?.code || 'PARTNERSHIP_SUBMIT_FAILED' })
      setSubmitError('제안을 접수하지 못했습니다. 입력하신 내용은 그대로 유지되어 있으니 잠시 후 다시 시도해 주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  const describedBy = (field) => errors[field] ? `proposal-${field}-error` : undefined

  return <div className="wrap page service-page proposal-page">
    <button className="service-back" onClick={() => navigate('partners')}>← 제휴 안내로 돌아가기</button>
    <header className="proposal-heading">
      <span className="eyebrow">PARTNER APPLICATION</span>
      <h1>좋은 제품의 진심을<br />들려주세요.</h1>
      <p>케어마켓은 브랜드의 규모보다<br />제품을 만드는 기준과 이유를 먼저 살펴봅니다.</p>
    </header>

    <div className="proposal-layout">
      <aside className="proposal-aside">
        <span className="service-section-icon"><Icon name="leaf" size={24} /></span>
        <h2>좋은 제안은,<br />작은 이야기에서부터.</h2>
        <p>브랜드 소개와 대표 제품,<br />함께하고 싶은 협업을 적어주세요.</p>
        <ol><li className={!result ? 'active' : ''}>01 <span>제안 작성</span></li><li className={result ? 'active' : ''}>02 <span>접수 완료</span></li></ol>
        <div className="proposal-notice"><b>제안 검토 안내</b><p>접수된 내용은 CareMarket 담당자가 확인한 뒤 등록하신 연락처로 안내드립니다.</p></div>
      </aside>

      {result ? <section className="proposal-form proposal-success" role="status">
        <span className="proposal-success-icon"><Icon name="check" size={28} /></span>
        <h2>제안이 접수되었습니다.</h2>
        <p>소중한 제안을 보내주셔서 감사합니다.<br />내용을 확인한 후 등록하신 연락처로 안내드리겠습니다.</p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('main')}>케어마켓으로 돌아가기</button>
      </section> : <form className="proposal-form" onSubmit={submit} noValidate>
        <section className="proposal-form-section" aria-labelledby="proposal-brand-heading">
          <div className="proposal-section-heading"><h2 id="proposal-brand-heading">브랜드 정보</h2><span>* 필수 항목</span></div>
          <div className="proposal-fields">
            <label htmlFor="proposal-brandName">브랜드명 <span>*</span><input id="proposal-brandName" value={values.brandName} onChange={(event) => setField('brandName', event.target.value)} maxLength={120} autoComplete="organization" aria-invalid={Boolean(errors.brandName)} aria-describedby={describedBy('brandName')} /><FieldError id="proposal-brandName-error" message={errors.brandName} /></label>
            <label htmlFor="proposal-contactName">담당자명 <span>*</span><input id="proposal-contactName" value={values.contactName} onChange={(event) => setField('contactName', event.target.value)} maxLength={80} autoComplete="name" aria-invalid={Boolean(errors.contactName)} aria-describedby={describedBy('contactName')} /><FieldError id="proposal-contactName-error" message={errors.contactName} /></label>
            <label htmlFor="proposal-email">이메일 <span>*</span><input id="proposal-email" type="email" value={values.email} onChange={(event) => setField('email', event.target.value)} maxLength={254} autoComplete="email" placeholder="hello@brand.com" aria-invalid={Boolean(errors.email)} aria-describedby={describedBy('email')} /><FieldError id="proposal-email-error" message={errors.email} /></label>
            <label htmlFor="proposal-phone">연락처<input id="proposal-phone" type="tel" value={values.phone} onChange={(event) => setField('phone', event.target.value)} maxLength={40} autoComplete="tel" placeholder="010-0000-0000" /></label>
            <label className="proposal-field-wide" htmlFor="proposal-website">브랜드 홈페이지 또는 SNS<input id="proposal-website" type="url" value={values.website} onChange={(event) => setField('website', event.target.value)} maxLength={500} autoComplete="url" placeholder="https://" aria-invalid={Boolean(errors.website)} aria-describedby={describedBy('website')} /><FieldError id="proposal-website-error" message={errors.website} /></label>
          </div>
        </section>

        <section className="proposal-form-section" aria-labelledby="proposal-partnership-heading">
          <div className="proposal-section-heading"><h2 id="proposal-partnership-heading">제휴 정보</h2></div>
          <div className="proposal-fields">
            <label htmlFor="proposal-proposalType">제안 유형 <span>*</span><select id="proposal-proposalType" value={values.proposalType} onChange={(event) => setField('proposalType', event.target.value)} aria-invalid={Boolean(errors.proposalType)} aria-describedby={describedBy('proposalType')}><option value="">선택해 주세요</option>{PARTNERSHIP_PROPOSAL_TYPES.map((type) => <option key={type}>{type}</option>)}</select><FieldError id="proposal-proposalType-error" message={errors.proposalType} /></label>
            <label htmlFor="proposal-productCategory">상품 카테고리 <span>*</span><input id="proposal-productCategory" value={values.productCategory} onChange={(event) => setField('productCategory', event.target.value)} maxLength={100} placeholder="예: 건강 간편식" aria-invalid={Boolean(errors.productCategory)} aria-describedby={describedBy('productCategory')} /><FieldError id="proposal-productCategory-error" message={errors.productCategory} /></label>
            <label className="proposal-field-wide" htmlFor="proposal-productName">대표 제품명<input id="proposal-productName" value={values.productName} onChange={(event) => setField('productName', event.target.value)} maxLength={160} /></label>
          </div>
          <label className="proposal-message" htmlFor="proposal-brandDescription">브랜드와 제품을 소개해주세요 <span>*</span><textarea id="proposal-brandDescription" value={values.brandDescription} onChange={(event) => setField('brandDescription', event.target.value)} maxLength={4000} rows={7} placeholder="제품을 만드는 기준과 브랜드가 중요하게 생각하는 가치를 들려주세요." aria-invalid={Boolean(errors.brandDescription)} aria-describedby={describedBy('brandDescription')} /><FieldError id="proposal-brandDescription-error" message={errors.brandDescription} /></label>
          <p className="proposal-count">{values.brandDescription.length.toLocaleString()} / 4,000</p>
          <label className="proposal-message" htmlFor="proposal-partnershipReason">케어마켓과 함께하고 싶은 이유<textarea id="proposal-partnershipReason" value={values.partnershipReason} onChange={(event) => setField('partnershipReason', event.target.value)} maxLength={3000} rows={5} /></label>
          <p className="proposal-count">{values.partnershipReason.length.toLocaleString()} / 3,000</p>
          <label className={`proposal-privacy${errors.privacyAgreed ? ' has-error' : ''}`} htmlFor="proposal-privacyAgreed"><input id="proposal-privacyAgreed" type="checkbox" checked={values.privacyAgreed} onChange={(event) => setField('privacyAgreed', event.target.checked)} aria-invalid={Boolean(errors.privacyAgreed)} aria-describedby={describedBy('privacyAgreed')} /><span>제안 검토와 회신을 위한 개인정보 수집 및 이용에 동의합니다. <b>*</b></span></label>
          <FieldError id="proposal-privacyAgreed-error" message={errors.privacyAgreed} />
        </section>

        {submitError && <p className="proposal-submit-error" role="alert">{submitError}</p>}
        <div className="proposal-actions"><span>작성하신 내용은 제휴 검토 목적으로만 사용됩니다.</span><button className="service-cta partner-primary" type="submit" disabled={submitting}>{submitting ? '제안 보내는 중...' : '입점·제휴 제안 보내기'}{!submitting && <Icon name="arrow-up-right" size={17} />}</button></div>
      </form>}
    </div>
  </div>
}
```

## src/pages/NotFound.jsx

404 복귀 동선

원본 줄 1–21

```jsx
import { useStore } from '../store'
import Icon from '../components/Icon'

export default function NotFound() {
  const { navigate } = useStore()

  return (
    <div className="wrap page page-narrow exception-page">
      <div className="empty" role="status">
        <span className="exception-code">404</span>
        <Icon name="alert-circle" size={42} />
        <h1>페이지를 찾을 수 없습니다.</h1>
        <p>요청하신 페이지가 삭제되었거나 주소가 변경되었을 수 있어요.</p>
        <div className="exception-actions">
          <button type="button" className="btn btn-primary" onClick={() => navigate('main')}>홈으로 돌아가기</button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('products')}>전체 상품 보기</button>
        </div>
      </div>
    </div>
  )
}
```

## src/components/AdminGate.jsx

관리자 인증·권한 UI

원본 줄 1–34

```jsx
import Icon from './Icon'
import { useStore } from '../store'

export default function AdminGate({ children }) {
  const { authLoading, profileLoading, isLoggedIn, isAdmin, navigate } = useStore()

  if (authLoading || (isLoggedIn && profileLoading)) {
    return <div className="wrap page"><div className="empty"><p>관리자 권한을 확인하고 있습니다.</p></div></div>
  }

  if (!isLoggedIn) {
    return (
      <div className="wrap page"><div className="empty">
        <Icon name="shield-alert" size={34} />
        <h3>로그인이 필요한 페이지입니다.</h3>
        <p>관리자 운영 페이지는 로그인 후 이용할 수 있습니다.</p>
        <button className="btn btn-primary" onClick={() => navigate('login')}>로그인하기</button>
      </div></div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="wrap page"><div className="empty">
        <Icon name="shield-alert" size={34} />
        <h3>관리자 권한이 필요한 페이지입니다.</h3>
        <p>현재 계정으로는 관리자 데이터에 접근할 수 없습니다.</p>
        <button className="btn btn-primary" onClick={() => navigate('main')}>상품 둘러보기</button>
      </div></div>
    )
  }

  return children
}
```

## src/components/AdminTopbar.jsx

관리자 내비게이션

원본 줄 1–23

```jsx
import { useStore } from '../store'

export default function AdminTopbar() {
  const { view, navigate, logout } = useStore()
  return (
    <header className="admin-topbar">
      <div className="admin-topbar-inner">
        <button className="admin-wordmark" onClick={() => navigate('adminDashboard')}>CareMarket <b>Admin</b></button>
        <nav className="admin-topnav" aria-label="관리자 메뉴">
          <button className={['adminDashboard', 'adminHistory'].includes(view) ? 'on' : ''} onClick={() => navigate('adminDashboard')}>대시보드</button>
          <button className={view === 'adminProducts' ? 'on' : ''} onClick={() => navigate('adminProducts')}>상품 관리</button>
          <button className={view === 'adminOrders' ? 'on' : ''} onClick={() => navigate('adminOrders')}>주문 · 출고 관리</button>
          <button className={view === 'adminPartnerships' ? 'on' : ''} onClick={() => navigate('adminPartnerships')}>협업 제안</button>
          <button className={view === 'adminInquiries' ? 'on' : ''} onClick={() => navigate('adminInquiries')}>1:1 문의 관리</button>
        </nav>
        <div className="admin-top-actions">
          <button onClick={() => navigate('main')}>스토어 보기</button>
          <button className="admin-logout" onClick={logout}>로그아웃</button>
        </div>
      </div>
    </header>
  )
}
```

## src/pages/AdminDashboard.jsx

관리 지표·기간 선택·운영 화면 이동. 데이터 로더는 제외

원본 줄 31–97

```jsx
function MetricValue({ value, loading, error, unit = '' }) {
  if (loading) return <span className="admin-dashboard-metric-loading">불러오는 중</span>
  if (error) return <span className="admin-dashboard-metric-error">불러오지 못함</span>
  return <>{value.toLocaleString('ko-KR')}<small>{unit}</small></>
}

function DashboardMetric({ icon, label, value, unit, loading, error, tone = '', comparison }) {
  return <article className={`admin-dashboard-metric ${tone}`}>
    <div className="admin-dashboard-metric-icon"><Icon name={icon} size={18} /></div>
    <div className="admin-dashboard-metric-copy">
      <span>{label}</span>
      <strong><MetricValue value={value} loading={loading} error={error} unit={unit} /></strong>
      {!loading && !error && comparison && <small>{comparison}</small>}
    </div>
  </article>
}

function PaymentChart({ data }) {
  const max = Math.max(1, ...data.map((item) => item.value))
  const chartWidth = 620
  const chartHeight = 178
  const baseline = 143
  const plotHeight = 108
  const startX = 28
  const plotWidth = 566
  const labelStep = Math.max(1, Math.ceil((data.length - 1) / 6))
  const points = data.map((item, index) => {
    const x = data.length === 1 ? chartWidth / 2 : startX + (plotWidth / (data.length - 1)) * index
    const y = baseline - (item.value / max) * plotHeight
    return { ...item, x, y }
  })
  return <div className="admin-dashboard-chart-visual">
    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label={`${data[0]?.date || ''}부터 ${data.at(-1)?.date || ''}까지 일자별 결제금액 추이`}>
      {[0, 1, 2, 3].map((line) => {
        const y = baseline - (plotHeight / 3) * line
        return <line key={line} x1="22" x2="600" y1={y} y2={y} className="admin-dashboard-chart-grid" />
      })}
      <polyline className="admin-dashboard-payment-line" points={points.map((point) => `${point.x},${point.y}`).join(' ')} />
      {points.map((point, index) => <g key={point.date}>
        <circle className="admin-dashboard-payment-point" cx={point.x} cy={point.y} r={data.length > 30 ? 2 : 3.5}><title>{`${point.date} ${point.value.toLocaleString('ko-KR')}원`}</title></circle>
        {(index % labelStep === 0 || index === points.length - 1) && <text className="admin-dashboard-chart-label" x={point.x} y="166" textAnchor="middle">{point.label}</text>}
      </g>)}
    </svg>
  </div>
}

function CategoryChart({ data }) {
  const max = Math.max(1, ...data.map((item) => item.value))
  if (!data.length) return <div className="admin-dashboard-empty">선택한 기간의 판매 데이터가 없습니다.</div>
  return <div className="admin-dashboard-category-chart" role="img" aria-label="카테고리별 판매 수량">
    {data.map((item) => <div className="admin-dashboard-category-row" key={item.label}>
      <span>{item.label}</span>
      <div className="admin-dashboard-category-track"><i style={{ width: `${(item.value / max) * 100}%` }} /></div>
      <b>{item.value.toLocaleString('ko-KR')}</b>
    </div>)}
  </div>
}

function DashboardCard({ title, kicker, action, onAction, children, className = '' }) {
  return <section className={`admin-dashboard-card ${className}`}>
    <div className="admin-dashboard-card-head">
      <div><span>{kicker}</span><h2>{title}</h2></div>
      {action && <button type="button" className="admin-dashboard-card-action" onClick={onAction}>{action}<Icon name="chevron-right" size={14} /></button>}
    </div>
    {children}
  </section>
}
```

원본 줄 117–231

```jsx
function SalesCharts({ sales, history = false, navigate }) {
  if (sales.loading) return <div className="admin-dashboard-empty" role="status">판매 현황을 불러오는 중입니다.</div>
  if (sales.error || !sales.data) return <div className="admin-dashboard-refresh" role="alert">판매 현황을 불러오지 못했습니다.<button className="btn btn-ghost btn-sm" onClick={sales.retry}>다시 시도</button></div>
  return <>
    <div className="admin-dashboard-grid admin-dashboard-chart-grid">
      <DashboardCard title={history ? '일자별 결제금액 추이' : '최근 7일 결제금액 추이'} kicker="PAYMENT OVERVIEW" className="admin-dashboard-chart-card" action={!history ? '지난 현황 보기' : undefined} onAction={() => navigate('adminHistory')}>
        <PaymentChart data={sales.data.daily} />
        <p className="admin-dashboard-demo-note">결제 완료 주문 · 쿠폰 할인 후 배송비 포함 · 한국 시간 기준</p>
      </DashboardCard>
      <DashboardCard title="카테고리별 판매량" kicker="CATEGORY MIX" className="admin-dashboard-chart-card">
        <CategoryChart data={sales.data.categories} />
        <p className="admin-dashboard-demo-note">{history ? '선택 기간' : '최근 7일'} 결제 완료 주문의 상품 수량</p>
      </DashboardCard>
    </div>
    {sales.data.order_count === 0 && <p className="admin-dashboard-empty" role="status">선택한 기간의 판매 데이터가 없습니다.</p>}
    {sales.data.legacy_order_count > 0 && <p className="admin-dashboard-demo-note">결제 시각 기록 도입 전 주문 {sales.data.legacy_order_count}건은 주문 생성일로 집계됩니다.</p>}
  </>
}

function AdminHistoryContent() {
  const { navigate } = useStore()
  const [range, setRange] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    const saved = { start: params.get('start') || '', end: params.get('end') || '' }
    return validSalesRange(saved) ? saved : salesDateRange(30)
  })
  const [draft, setDraft] = useState(range)
  const [rangeError, setRangeError] = useState('')
  const sales = useSalesSummary(range)
  const selectRange = next => {
    if (!validSalesRange(next)) {
      setRangeError('시작일과 종료일을 확인해 주세요. 한 번에 최대 3,660일까지 조회할 수 있습니다.')
      return
    }
    setRangeError('')
    setRange(next)
    setDraft(next)
    window.history.replaceState(window.history.state, '', `/admin/history?${new URLSearchParams(next)}`)
  }
  const summary = sales.data
  const metrics = [
    { key: 'total_payment', label: '총 결제금액', unit: '원', icon: 'credit-card' },
    { key: 'order_count', label: '결제 완료 주문', unit: '건', icon: 'package' },
    { key: 'quantity', label: '판매 상품 총수량', unit: '개', icon: 'cart' },
    { key: 'average_payment', label: '주문당 평균 결제금액', unit: '원', icon: 'credit-card' },
  ]
  return <div className="wrap page admin-dashboard-page">
    <div className="admin-head admin-dashboard-head"><h1>지난 현황 보기</h1><p>기간별 판매 현황</p></div>
    <button className="btn btn-ghost btn-sm" onClick={() => navigate('adminDashboard')}>대시보드로 돌아가기</button>
    <section className="admin-dashboard-card admin-sales-filters" aria-label="판매 현황 조회 기간">
      <div className="admin-sales-presets">{[7, 30, 90].map(days => {
        const preset = salesDateRange(days)
        const selected = preset.start === range.start && preset.end === range.end
        return <button key={days} className={`btn btn-sm ${selected ? 'btn-primary' : 'btn-soft'}`} aria-pressed={selected} onClick={() => selectRange(preset)}>최근 {days}일</button>
      })}</div>
      <form className="admin-sales-dates" onSubmit={event => {
        event.preventDefault()
        const values = new FormData(event.currentTarget)
        selectRange({ start: String(values.get('start')), end: String(values.get('end')) })
      }}>
        <label>시작일<input name="start" type="date" required value={draft.start} onChange={event => setDraft({ ...draft, start: event.target.value })} /></label>
        <span aria-hidden="true">~</span>
        <label>종료일<input name="end" type="date" required value={draft.end} onChange={event => setDraft({ ...draft, end: event.target.value })} /></label>
        <button className="btn btn-soft btn-sm" type="submit">기간 조회</button>
      </form>
      {rangeError && <p role="alert">{rangeError}</p>}
      <p className="admin-dashboard-demo-note">조회 기간: {range.start} ~ {range.end} · 직전 동일 길이의 기간과 비교합니다.</p>
    </section>
    <section className="admin-dashboard-metrics admin-sales-metrics" aria-label="기간별 운영 지표">
      {metrics.map(metric => <DashboardMetric key={metric.key} {...metric} value={summary?.[metric.key] || 0} loading={sales.loading} error={sales.error}
        comparison={summary && metric.key !== 'average_payment' ? salesChange(summary[metric.key], summary.previous[metric.key]) : undefined} />)}
    </section>
    <SalesCharts sales={sales} history navigate={navigate} />
    {summary && <DashboardCard title="기간 내 베스트 상품" kicker="BEST PRODUCTS">
      {!summary.best.length ? <div className="admin-dashboard-empty">선택한 기간의 판매 데이터가 없습니다.</div> : <div className="admin-sales-table-wrap"><table className="admin-sales-table">
        <thead><tr><th scope="col">순위</th><th scope="col">상품명</th><th scope="col">판매수량</th><th scope="col">상품금액</th></tr></thead>
        <tbody>{summary.best.map((product, index) => <tr key={product.product_id}><td>{index + 1}</td><td>{product.name}</td><td>{product.quantity.toLocaleString('ko-KR')}개</td><td>{won(product.revenue)}</td></tr>)}</tbody>
      </table></div>}
      <p className="admin-dashboard-demo-note">판매수량 기준 상위 100개 · 상품금액은 주문 당시 단가 × 수량이며 주문 쿠폰 할인과 배송비 배분 전입니다.</p>
    </DashboardCard>}
  </div>
}

function NeedsAttention({ metrics, loading, errors, navigate }) {
  const items = [
    { key: 'lowStockProducts', label: '재고 부족 상품', unit: '개', view: 'products', icon: 'package', tone: metrics.lowStockProducts > 0 ? 'warning' : '' },
    { key: 'waitingInquiries', label: '답변 대기 문의', unit: '건', view: 'inquiries', icon: 'message-circle', tone: metrics.waitingInquiries > 0 ? 'warning' : '' },
    { key: 'newPartnerships', label: '신규 협업 제안', unit: '건', view: 'partnerships', icon: 'leaf', tone: metrics.newPartnerships > 0 ? 'warning' : '' },
    { key: 'preparingOrders', label: '상품 준비중 주문', unit: '건', view: 'orders', icon: 'clock', tone: metrics.preparingOrders > 0 ? 'warning' : '' },
    { key: 'pendingOrders', label: '결제 미완료 주문', unit: '건', view: 'orders', options: { status: 'pending' }, icon: 'credit-card', tone: metrics.pendingOrders > 0 ? 'warning' : '' },
  ]
  return <div className="admin-dashboard-attention-list">
    {items.map((item) => <button type="button" className={`admin-dashboard-attention-item ${item.tone}`} key={item.key} onClick={() => navigate(DASHBOARD_VIEWS[item.view], item.options)}>
      <span className="admin-dashboard-attention-icon"><Icon name={item.icon} size={16} /></span>
      <span className="admin-dashboard-attention-label">{item.label}</span>
      <strong><MetricValue value={metrics[item.key]} loading={loading} error={errors[item.key]} unit={item.unit} /></strong>
      <Icon name="chevron-right" size={15} />
    </button>)}
  </div>
}

function RecentOrders({ orders, loading, error, navigate }) {
  const recentOrders = useMemo(() => orders.filter(isFulfillmentOrder).slice(0, 5), [orders])
  if (loading) return <div className="admin-dashboard-empty" role="status">주문 데이터를 불러오는 중입니다.</div>
  if (error) return <div className="admin-dashboard-empty" role="alert">최근 주문을 불러오지 못했습니다.</div>
  if (recentOrders.length === 0) return <div className="admin-dashboard-empty">최근 주문이 없습니다.</div>
  return <div className="admin-dashboard-orders-list">
    {recentOrders.map((order) => <button type="button" className="admin-dashboard-order-row" key={order.order_id} onClick={() => navigate('adminOrders')}>
      <span className="admin-dashboard-order-main"><b>{order.toss_order_id || order.order_id}</b><small>{maskDashboardName(order.buyerName)}</small></span>
      <strong>{won(order.total_price)}</strong>
      <span className={`status ${order.status === 'delivered' ? 'status-done' : 'status-active'}`}>{ORDER_STATUS_LABELS[order.status] || order.status}</span>
      <Icon name="chevron-right" size={15} />
    </button>)}
  </div>
}
```

원본 줄 262–312

```jsx
  const products = resources.products.data
  const orders = resources.orders.data
  const partnerships = resources.partnerships.data
  const inquiries = resources.inquiries.data
  const metrics = useMemo(() => getDashboardMetrics({ products, orders, partnerships, inquiries }), [inquiries, orders, partnerships, products])
  const metricErrors = {
    todayOrders: sales.error,
    todayPayment: sales.error,
    preparingOrders: resources.orders.error,
    waitingInquiries: resources.inquiries.error,
    newPartnerships: resources.partnerships.error,
    lowStockProducts: resources.products.error,
    pendingOrders: resources.orders.error,
  }
  const hasError = Object.values(resources).some((resource) => resource.error)

  return <div className="wrap page admin-dashboard-page">
    <div className="admin-head admin-dashboard-head">
      <h1>관리자 대시보드</h1>
      <p>오늘의 운영 현황</p>
    </div>

    {loading ? <div className="empty" role="status"><p>대시보드 운영 데이터를 불러오는 중입니다.</p></div> : <>
      <section className="admin-dashboard-metrics" aria-label="주요 운영 현황">
        <DashboardMetric icon="package" label="오늘 주문" value={sales.data?.daily.at(-1)?.orders || 0} unit="건" loading={sales.loading} error={metricErrors.todayOrders} />
        <DashboardMetric icon="credit-card" label="오늘 결제금액" value={sales.data?.daily.at(-1)?.value || 0} unit="원" loading={sales.loading} error={metricErrors.todayPayment} />
        <DashboardMetric icon="clock" label="상품 준비중" value={metrics.preparingOrders} unit="건" loading={false} error={metricErrors.preparingOrders} tone={metrics.preparingOrders > 0 ? 'accent' : ''} />
        <DashboardMetric icon="message-circle" label="답변 대기 문의" value={metrics.waitingInquiries} unit="건" loading={false} error={metricErrors.waitingInquiries} tone={metrics.waitingInquiries > 0 ? 'warning' : ''} />
        <DashboardMetric icon="leaf" label="신규 협업 제안" value={metrics.newPartnerships} unit="건" loading={false} error={metricErrors.newPartnerships} tone={metrics.newPartnerships > 0 ? 'warning' : ''} />
        <DashboardMetric icon="alert-circle" label="재고 부족 상품" value={metrics.lowStockProducts} unit="개" loading={false} error={metricErrors.lowStockProducts} tone={metrics.lowStockProducts > 0 ? 'warning' : ''} />
      </section>

      <SalesCharts sales={sales} navigate={navigate} />

      <div className="admin-dashboard-grid admin-dashboard-operation-grid">
        <DashboardCard title="확인이 필요한 항목" kicker="NEEDS ATTENTION">
          <NeedsAttention metrics={metrics} loading={false} errors={metricErrors} navigate={navigate} />
        </DashboardCard>
        <DashboardCard title="최근 주문" kicker="LATEST ORDERS" action="전체 보기" onAction={() => navigate('adminOrders')}>
          <RecentOrders orders={orders} loading={false} error={resources.orders.error} navigate={navigate} />
        </DashboardCard>
      </div>
      {hasError && <div className="admin-dashboard-refresh" role="status"><span>일부 운영 데이터를 불러오지 못했습니다.</span><button type="button" className="btn btn-ghost btn-sm" onClick={() => void load()}>다시 시도</button></div>}
    </>}
  </div>
}

export default function AdminDashboard() {
  const { view } = useStore()
  return <AdminGate>{view === 'adminHistory' ? <AdminHistoryContent /> : <AdminDashboardContent />}</AdminGate>
}
```

## src/pages/AdminProducts.jsx

상품 편집·미저장 확인·검색·판매 상태. 서비스 구현은 제외

원본 줄 10–332

```jsx
const FILTERS = ['전체', '판매중', '비활성', '품절']
const EDITOR_TABS = [
  { id: 'basic', label: '기본 정보' },
  { id: 'sales', label: '판매 · 재고' },
  { id: 'nutrition', label: '영양 정보' },
  { id: 'ingredients', label: '알레르기 · 성분' },
]
const NUTRITION_FIELDS = [
  { field: 'calories', label: '칼로리', unit: 'kcal' },
  { field: 'protein', label: '단백질', unit: 'g' },
  { field: 'carbs', label: '탄수화물', unit: 'g' },
  { field: 'fat', label: '지방', unit: 'g' },
  { field: 'sugar', label: '당류', unit: 'g' },
  { field: 'sodium', label: '나트륨', unit: 'mg' },
]

const snapshotForm = (form) => JSON.stringify(form)

function AdminProductPreview({ form, isNew }) {
  const price = Number(form.price)
  const originalPrice = Number(form.original_price)
  const hasPrice = form.price !== '' && Number.isFinite(price)
  const hasOriginalPrice = form.original_price !== '' && Number.isFinite(originalPrice) && originalPrice > 0
  const discount = hasPrice && hasOriginalPrice && originalPrice > price
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : null
  const status = !form.is_active ? '비활성' : form.stock !== '' && Number(form.stock) === 0 ? '품절' : '판매중'

  return (
    <aside className="admin-editor-preview" aria-label="상품 미리보기">
      <div className="admin-preview-heading">
        <span>LIVE PREVIEW</span>
        <b>상품 미리보기</b>
      </div>
      <div className="admin-preview-card">
        <div className="admin-preview-media">
          {form.image_url
            ? <ProductImage src={resolveProductImage(form.product_id, form.image_url)} alt="" />
            : <div className="admin-preview-placeholder"><Icon name="package" size={44} /><span>기본 이미지</span></div>}
          {!isNew && <span className={`admin-preview-status${form.is_active ? '' : ' inactive'}`}>{status}</span>}
        </div>
        <div className="admin-preview-copy">
          <span className="admin-preview-brand">{form.brand.trim() || '브랜드명'}</span>
          <h3>{form.name.trim() || '상품명을 입력해 주세요'}</h3>
          <p>{form.summary.trim() || '입력한 상품 설명이 이곳에 표시됩니다.'}</p>
          <div className="admin-preview-price">
            {hasOriginalPrice && <del>{won(originalPrice)}</del>}
            <div>{discount !== null && <em>{discount}%</em>}<strong>{hasPrice ? won(price) : '판매가 미입력'}</strong></div>
          </div>
          <dl className="admin-preview-meta">
            <div><dt>카테고리</dt><dd>{form.category}</dd></div>
            <div><dt>재고</dt><dd>{form.stock === '' ? '미입력' : `${form.stock}개`}</dd></div>
          </dl>
        </div>
      </div>
      <p className="admin-preview-note">관리자 확인용 미리보기이며 실제 스토어 카드에는 기존 표시 규칙이 적용됩니다.</p>
    </aside>
  )
}

function AdminProductEditor({ product, onCancel, onSaved }) {
  const initialForm = useMemo(() => toAdminProductForm(product), [product])
  const [form, setForm] = useState(initialForm)
  const [activeTab, setActiveTab] = useState('basic')
  const [saving, setSaving] = useState(false)
  const [closing, setClosing] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const closeTimer = useRef(null)
  const modalRef = useRef(null)
  const contentRef = useRef(null)
  const nameInputRef = useRef(null)
  const discardButtonRef = useRef(null)
  const closeIntentFocusRef = useRef(null)
  const [initialSnapshot, setInitialSnapshot] = useState(() => snapshotForm(initialForm))
  const { showToast } = useStore()
  const dirty = snapshotForm(form) !== initialSnapshot

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusFrame = window.requestAnimationFrame(() => nameInputRef.current?.focus())
    return () => {
      document.body.style.overflow = previousOverflow
      window.cancelAnimationFrame(focusFrame)
      window.clearTimeout(closeTimer.current)
    }
  }, [])

  useEffect(() => {
    if (confirmClose) discardButtonRef.current?.focus()
    else if (closeIntentFocusRef.current) {
      const focusTarget = closeIntentFocusRef.current
      closeIntentFocusRef.current = null
      window.requestAnimationFrame(() => (focusTarget.isConnected ? focusTarget : nameInputRef.current)?.focus())
    }
  }, [confirmClose])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (confirmClose) setConfirmClose(false)
        else if (!saving && !closing) {
          if (dirty) {
            closeIntentFocusRef.current = document.activeElement
            setConfirmClose(true)
          }
          else {
            setClosing(true)
            closeTimer.current = window.setTimeout(onCancel, 180)
          }
        }
        return
      }
      if (event.key !== 'Tab') return
      const focusRoot = confirmClose
        ? modalRef.current?.querySelector('.admin-unsaved-dialog')
        : modalRef.current
      const focusable = [...(focusRoot?.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])') || [])]
        .filter((element) => element.offsetParent !== null)
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [closing, confirmClose, dirty, onCancel, saving])

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }))
  const closeEditor = () => {
    if (closing || saving) return
    setClosing(true)
    closeTimer.current = window.setTimeout(onCancel, 180)
  }
  const requestClose = () => {
    if (closing || saving) return
    if (dirty) {
      closeIntentFocusRef.current = document.activeElement
      setConfirmClose(true)
      return
    }
    closeEditor()
  }
  const selectTab = (tabId) => {
    setActiveTab(tabId)
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const toggleAllergen = (allergen) => setForm((current) => ({
    ...current,
    allergens: current.allergens.includes(allergen)
      ? current.allergens.filter((item) => item !== allergen)
      : [...current.allergens, allergen],
  }))
  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const saved = await saveAdminProduct(form, product?.product_id)
      showToast(product ? '상품 정보가 저장되었습니다.' : '새 상품이 등록되었습니다.')
      await onSaved(saved)
      setInitialSnapshot(snapshotForm(form))
      setClosing(true)
      closeTimer.current = window.setTimeout(onCancel, 180)
    } catch (error) {
      console.error('Admin product save failed:', error)
      showToast(error.message || '상품을 저장하지 못했습니다.')
    } finally { setSaving(false) }
  }

  const editorTitle = product ? `상품 수정 #${product.product_id}` : '신규 상품 등록'
  const price = Number(form.price)
  const originalPrice = Number(form.original_price)
  const discount = form.price !== '' && form.original_price !== '' && Number.isFinite(price) && Number.isFinite(originalPrice) && originalPrice > price && originalPrice > 0
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : null

  return <>
    <button type="button" className={`admin-product-editor-backdrop${closing ? ' closing' : ''}`} onClick={requestClose} aria-label="상품 편집 닫기" />
    <section ref={modalRef} className={`admin-product-editor-shell${closing ? ' closing' : ''}`} role="dialog" aria-modal="true" aria-labelledby="admin-product-editor-title">
      <div className="admin-product-editor-head">
        <div>
          <span>{product ? 'PRODUCT EDIT' : 'NEW PRODUCT'}</span>
          <h2 id="admin-product-editor-title"><Icon name={product ? 'sliders' : 'plus'} size={19} />{editorTitle}</h2>
        </div>
        <button type="button" className="icon-btn" onClick={requestClose} aria-label="닫기"><Icon name="x" size={20} /></button>
      </div>

      <nav className="admin-editor-tabs" aria-label="상품 편집 항목" role="tablist">
        {EDITOR_TABS.map((tab) => <button type="button" role="tab" aria-selected={activeTab === tab.id} aria-controls={`admin-editor-panel-${tab.id}`} className={activeTab === tab.id ? 'active' : ''} key={tab.id} onClick={() => selectTab(tab.id)}>{tab.label}</button>)}
      </nav>

      <form className="admin-product-editor-form" onSubmit={submit} noValidate>
        <div ref={contentRef} className="admin-product-editor-body">
          <div className="admin-editor-layout">
            <div className="admin-editor-fields">
              {activeTab === 'basic' && <section id="admin-editor-panel-basic" className="admin-tab-panel" role="tabpanel">
                <div className="admin-tab-intro"><h3>기본 정보</h3><p>고객에게 가장 먼저 보이는 상품 정보를 입력합니다.</p></div>
                <div className="admin-editor-grid">
                  <label className="admin-field admin-field-wide"><span>상품명</span><input ref={nameInputRef} value={form.name} onChange={(event) => setField('name', event.target.value)} placeholder="상품명을 입력하세요" /></label>
                  <label className="admin-field"><span>브랜드</span><input value={form.brand} onChange={(event) => setField('brand', event.target.value)} placeholder="브랜드명" /></label>
                  <label className="admin-field"><span>카테고리</span><select value={form.category} onChange={(event) => setField('category', event.target.value)}>{PRODUCT_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
                  <label className="admin-field admin-field-wide"><span>이미지 URL</span><input type="url" value={form.image_url} onChange={(event) => setField('image_url', event.target.value)} placeholder="https://example.com/product.jpg" /></label>
                  <label className="admin-field admin-field-wide"><span>상품 설명</span><textarea rows="6" value={form.summary} onChange={(event) => setField('summary', event.target.value)} placeholder="상품의 특징과 고객에게 필요한 정보를 입력하세요" /></label>
                </div>
              </section>}

              {activeTab === 'sales' && <section id="admin-editor-panel-sales" className="admin-tab-panel" role="tabpanel">
                <div className="admin-tab-intro"><h3>판매 · 재고</h3><p>가격과 재고, 스토어 노출 상태를 관리합니다.</p></div>
                <div className="admin-editor-grid admin-sales-grid">
                  <label className="admin-field"><span>판매가</span><div className="admin-input-unit"><input type="number" min="0" value={form.price} onChange={(event) => setField('price', event.target.value)} inputMode="numeric" /><i>원</i></div></label>
                  <label className="admin-field"><span>정상가</span><div className="admin-input-unit"><input type="number" min="0" value={form.original_price} onChange={(event) => setField('original_price', event.target.value)} inputMode="numeric" /><i>원</i></div></label>
                  {discount !== null && <div className="admin-discount-callout"><span>현재 할인율</span><strong>{discount}%</strong><small>정상가와 판매가 기준</small></div>}
                  <label className="admin-field"><span>재고</span><div className="admin-input-unit"><input type="number" min="0" value={form.stock} onChange={(event) => setField('stock', event.target.value)} inputMode="numeric" /><i>개</i></div></label>
                  <label className="admin-toggle"><input type="checkbox" checked={form.is_active} onChange={(event) => setField('is_active', event.target.checked)} /><span>판매 상태</span><b>{form.is_active ? '판매중' : '비활성'}</b></label>
                </div>
              </section>}

              {activeTab === 'nutrition' && <section id="admin-editor-panel-nutrition" className="admin-tab-panel" role="tabpanel">
                <div className="admin-tab-intro"><h3>영양 정보</h3><p>1회 제공량을 기준으로 각 영양성분을 입력합니다.</p></div>
                <div className="admin-editor-grid admin-nutrition-grid">
                  <label className="admin-field admin-field-wide"><span>1회 제공량</span><input value={form.serving_size} onChange={(event) => setField('serving_size', event.target.value)} placeholder="예: 1팩 (200g)" /></label>
                  {NUTRITION_FIELDS.map(({ field, label, unit }) => <label className="admin-field" key={field}><span>{label}</span><div className="admin-input-unit"><input type="number" min="0" step="any" inputMode="decimal" value={form[field]} onChange={(event) => setField(field, event.target.value)} /><i>{unit}</i></div></label>)}
                </div>
              </section>}

              {activeTab === 'ingredients' && <section id="admin-editor-panel-ingredients" className="admin-tab-panel" role="tabpanel">
                <div className="admin-tab-intro"><h3>알레르기 · 성분</h3><p>원재료와 알레르기 유발 성분을 기존 데이터 기준으로 관리합니다.</p></div>
                <div className="admin-editor-grid">
                  <label className="admin-field admin-field-wide"><span>주요 원재료 (쉼표로 구분)</span><textarea rows="4" value={form.main_ingredients} onChange={(event) => setField('main_ingredients', event.target.value)} placeholder="예: 닭가슴살, 현미, 귀리" /></label>
                  <label className="admin-check admin-caffeine-check"><input type="checkbox" checked={form.contains_caffeine} onChange={(event) => setField('contains_caffeine', event.target.checked)} /><span>카페인 포함</span></label>
                  <div className="admin-field admin-field-wide admin-allergen-field">
                    <span>알레르기 유발 성분</span>
                    <div className="admin-check-list">{ALLERGEN_OPTIONS.map((allergen) => <label className={`admin-allergen-chip${form.allergens.includes(allergen) ? ' selected' : ''}`} key={allergen}><input type="checkbox" checked={form.allergens.includes(allergen)} onChange={() => toggleAllergen(allergen)} /><span>{allergen}</span></label>)}</div>
                  </div>
                </div>
              </section>}
            </div>
            <AdminProductPreview form={form} isNew={!product} />
          </div>
        </div>

        <div className="admin-actions">
          <span className={`admin-save-state${dirty ? ' changed' : ''}`}>{dirty ? '저장하지 않은 변경사항이 있습니다.' : '현재 저장된 상태입니다.'}</span>
          <button type="button" className="btn btn-ghost" onClick={requestClose} disabled={saving}>취소</button>
          <button className="btn btn-primary" disabled={saving}>{saving ? '저장 중...' : '변경사항 저장'}</button>
        </div>
      </form>

      {confirmClose && <div className="admin-unsaved-layer">
        <div className="admin-unsaved-dialog" role="alertdialog" aria-modal="true" aria-labelledby="admin-unsaved-title" aria-describedby="admin-unsaved-description">
          <span className="admin-unsaved-icon"><Icon name="alert-circle" size={22} /></span>
          <h3 id="admin-unsaved-title">저장하지 않은 변경사항이 있습니다.</h3>
          <p id="admin-unsaved-description">편집을 종료하면 입력한 내용이 사라집니다.</p>
          <div>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmClose(false)}>계속 편집</button>
            <button ref={discardButtonRef} type="button" className="btn admin-discard-button" onClick={closeEditor}>변경사항 버리기</button>
          </div>
        </div>
      </div>}
    </section>
  </>
}

function AdminProductsContent() {
  const { showToast, reloadProducts } = useStore()
  const [products, setProducts] = useState([])
  const [filter, setFilter] = useState('전체')
  const [query, setQuery] = useState('')
  const [editorProduct, setEditorProduct] = useState(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const load = async () => { setLoading(true); setError(null); try { setProducts(await fetchAdminProducts()) } catch (caught) { console.error('Admin products fetch failed:', caught); setError(caught.message || '상품 목록을 불러오지 못했습니다.') } finally { setLoading(false) } }
  useEffect(() => { void load() }, [])
  const visibleProducts = useMemo(() => products.filter((product) => {
    const matchesFilter = filter === '전체' || (filter === '판매중' && product.is_active && product.stock > 0) || (filter === '비활성' && !product.is_active) || (filter === '품절' && product.is_active && product.stock === 0)
    const needle = query.trim().toLowerCase()
    return matchesFilter && (!needle || `${product.name} ${product.brand}`.toLowerCase().includes(needle))
  }), [products, filter, query])
  const saveDone = async () => { await load(); reloadProducts() }
  const toggleActive = async (product) => {
    try { await saveAdminProduct({ ...toAdminProductForm(product), is_active: !product.is_active }, product.product_id); showToast(product.is_active ? '상품을 판매중지했습니다.' : '상품 판매를 재개했습니다.'); await load(); reloadProducts() } catch (caught) { console.error('Admin product activation update failed:', caught); showToast(caught.message || '판매 상태를 변경하지 못했습니다.') }
  }

  return <>
    <div className="wrap page admin-products-page">
      <div className="page-head admin-products-page-head">
        <div className="admin-head"><h1>상품 관리</h1><p>상품 정보 · 가격 · 재고</p></div>
        <button className="btn btn-primary admin-new-product" onClick={() => setEditorProduct(null)}><Icon name="plus" size={17} />신규 상품 등록</button>
      </div>
      <div className="admin-toolbar admin-products-toolbar">
        <div className="admin-filters">{FILTERS.map((item) => <button className={filter === item ? 'on' : ''} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div>
        <input className="admin-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="상품명 또는 브랜드 검색" aria-label="상품명 또는 브랜드 검색" />
      </div>
      {loading ? <div className="empty"><p>상품 데이터를 불러오는 중입니다.</p></div> : error ? <div className="empty"><h3>상품을 불러오지 못했습니다.</h3><p>{error}</p><button className="btn btn-primary btn-sm" onClick={() => void load()}>다시 시도</button></div> : visibleProducts.length === 0 ? <div className="empty"><h3>조건에 맞는 상품이 없습니다.</h3></div> : <div className="table-wrap admin-products-table-wrap">
        <table role="table" className="admin-mobile-cards admin-products-table">
          <thead><tr><th>ID</th><th>상품</th><th>카테고리</th><th>판매가</th><th>재고</th><th>상태</th><th>관리</th></tr></thead>
          <tbody>{visibleProducts.map((product) => {
            const status = !product.is_active ? 'inactive' : product.stock === 0 ? 'soldout' : 'active'
            return <tr key={product.product_id}>
              <td data-label="ID" className="td-mono">#{product.product_id}</td>
              <td data-label="상품"><div className="admin-table-product"><ProductImage className="admin-product-thumb" src={resolveProductImage(product.product_id, product.image_url)} alt="" /><div className="admin-product-identity"><div className="td-name">{product.name}</div><div className="admin-product-brand">{product.brand}</div></div></div></td>
              <td data-label="카테고리"><span className="admin-product-category">{product.category}</span></td>
              <td data-label="판매가" className="admin-number">{won(product.price)}</td>
              <td data-label="재고" className="admin-number">{product.stock}</td>
              <td data-label="상태"><span className={`admin-product-status ${status}`}>{status === 'active' ? '판매중' : status === 'soldout' ? '품절' : '비활성'}</span></td>
              <td data-label="관리"><div className="admin-row-actions"><button className="admin-product-action edit" onClick={() => setEditorProduct(product)}>수정</button><button className={`admin-product-action ${product.is_active ? 'danger' : 'resume'}`} onClick={() => void toggleActive(product)}>{product.is_active ? '판매중지' : '판매재개'}</button></div></td>
            </tr>
          })}</tbody>
        </table>
      </div>}
    </div>
    {editorProduct !== undefined && <AdminProductEditor product={editorProduct} onCancel={() => setEditorProduct(undefined)} onSaved={saveDone} />}
  </>
}

export default function AdminProducts() { return <AdminGate><AdminProductsContent /></AdminGate> }
```

## src/pages/AdminOrders.jsx

주문 상세·상태 전환·선택 출고 확인

원본 줄 17–293

```jsx
const FILTERS = [
  { value: 'fulfillment', label: '출고 전체' },
  { value: 'paid', label: ORDER_STATUS_LABELS.paid },
  { value: 'preparing', label: ORDER_STATUS_LABELS.preparing },
  { value: 'shipped', label: ORDER_STATUS_LABELS.shipped },
  { value: 'delivered', label: ORDER_STATUS_LABELS.delivered },
  { value: 'pending', label: ORDER_STATUS_LABELS.pending },
]
const formatDate = (value) => new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
const SHIPPING_SNAPSHOT_FIELDS = ['recipient_name', 'recipient_phone', 'postal_code', 'address', 'address_detail', 'delivery_request']
const displayValue = (value) => String(value ?? '').trim() || '—'
const initialOrderFilter = () => new URLSearchParams(window.location.search).get('status') === 'pending' ? 'pending' : 'fulfillment'

function hasShippingSnapshot(order) {
  return SHIPPING_SNAPSHOT_FIELDS.some((field) => String(order[field] ?? '').trim())
}

function DetailItem({ label, children, wide = false }) {
  return <div className={wide ? 'wide' : ''}><dt>{label}</dt><dd>{children}</dd></div>
}

function OrderDetail({ order, updating, busy, onAdvance, onClose }) {
  const closeButtonRef = useRef(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [busy, onClose])

  const items = order.order_items || []
  const itemSubtotal = items.reduce((sum, item) => sum + (Number(item.price_at_order) * Number(item.quantity)), 0)
  const deliveryFee = Math.max(Number(order.total_price) - itemSubtotal, 0)
  const nextStatus = NEXT_ORDER_STATUS[order.status]
  const shippingAvailable = hasShippingSnapshot(order)

  return <>
    <button type="button" className="admin-product-editor-backdrop" onClick={() => !busy && onClose()} aria-label="주문 상세 닫기" />
    <section className="admin-product-editor-shell admin-order-detail" role="dialog" aria-modal="true" aria-labelledby="admin-order-detail-title">
      <div className="admin-product-editor-head">
        <div><span>ORDER DETAIL</span><h2 id="admin-order-detail-title"><Icon name="package" size={19} />주문 상세</h2></div>
        <button ref={closeButtonRef} type="button" className="icon-btn" onClick={onClose} disabled={busy} aria-label="닫기"><Icon name="x" size={20} /></button>
      </div>
      <div className="admin-product-editor-form">
        <div className="admin-product-editor-body">
          <div className="admin-order-detail-grid">
            <div className="admin-order-detail-copy">
              <section>
                <h3>주문 정보</h3>
                <dl className="admin-order-detail-list">
                  <DetailItem label="주문번호"><span className="td-mono">{order.toss_order_id || order.order_id}</span></DetailItem>
                  <DetailItem label="주문일시">{formatDate(order.created_at)}</DetailItem>
                  <DetailItem label="주문자">{order.buyerName}</DetailItem>
                  <DetailItem label="주문 상태"><span className={`status ${order.status === 'delivered' ? 'status-done' : 'status-active'}`}>{ORDER_STATUS_LABELS[order.status] || order.status}</span></DetailItem>
                </dl>
              </section>

              <section>
                <h3>배송 정보</h3>
                {shippingAvailable ? <dl className="admin-order-detail-list admin-shipping-detail">
                  <DetailItem label="수취인">{displayValue(order.recipient_name)}</DetailItem>
                  <DetailItem label="연락처">{displayValue(order.recipient_phone)}</DetailItem>
                  <DetailItem label="우편번호">{displayValue(order.postal_code)}</DetailItem>
                  <DetailItem label="기본 주소" wide>{displayValue(order.address)}</DetailItem>
                  <DetailItem label="상세 주소" wide>{displayValue(order.address_detail)}</DetailItem>
                  <DetailItem label="배송 요청사항" wide>{displayValue(order.delivery_request)}</DetailItem>
                </dl> : <p className="admin-order-shipping-empty">저장된 배송 정보가 없습니다.</p>}
              </section>

              <section>
                <h3>주문 상품</h3>
                <div className="admin-order-detail-items">
                  {items.map((item) => <div className="admin-order-detail-item" key={item.product_id}>
                    <div><strong>{item.products?.name || `상품 #${item.product_id}`}</strong><span>{item.products?.brand || '브랜드 정보 없음'}</span></div>
                    <span>수량 {item.quantity}개</span>
                    <div><small>주문 당시 단가 {won(item.price_at_order)}</small><b>{won(item.price_at_order * item.quantity)}</b></div>
                  </div>)}
                  {items.length === 0 && <p className="admin-order-items-empty">저장된 주문 상품 정보가 없습니다.</p>}
                </div>
              </section>
            </div>

            <aside className="admin-order-detail-aside">
              <section>
                <h3>결제 정보</h3>
                <dl className="admin-order-payment-list">
                  <div><dt>상품 금액</dt><dd>{won(itemSubtotal)}</dd></div>
                  <div><dt>배송비</dt><dd>{won(deliveryFee)}</dd></div>
                  <div className="total"><dt>총 결제금액</dt><dd>{won(order.total_price)}</dd></div>
                </dl>
              </section>
              <section>
                <h3>주문 처리</h3>
                <p>현재 상태 <b>{ORDER_STATUS_LABELS[order.status] || order.status}</b></p>
                <p>{nextStatus ? `다음 단계는 '${ORDER_STATUS_LABELS[nextStatus]}'입니다.` : order.status === 'pending' ? '결제 완료 전 주문입니다.' : '모든 배송 처리가 완료되었습니다.'}</p>
              </section>
            </aside>
          </div>
        </div>
        <div className="admin-actions">
          <span className="admin-save-state">상태 변경은 기존 순서대로만 처리됩니다.</span>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>닫기</button>
          {nextStatus && <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void onAdvance(order)}>{updating ? '처리 중...' : `${ORDER_STATUS_LABELS[nextStatus]} 처리`}</button>}
        </div>
      </div>
    </section>
  </>
}

function BulkShipConfirmModal({ count, processing, onCancel, onConfirm }) {
  const confirmButtonRef = useRef(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    confirmButtonRef.current?.focus()
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !processing) onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onCancel, processing])

  return (
    <div className="admin-bulk-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !processing && onCancel()}>
      <section className="admin-bulk-modal" role="alertdialog" aria-modal="true" aria-labelledby="admin-bulk-modal-title" aria-describedby="admin-bulk-modal-description">
        <span className="kicker">BULK FULFILLMENT</span>
        <h2 id="admin-bulk-modal-title">선택 주문 배송처리</h2>
        <p id="admin-bulk-modal-description"><b>{count}건</b>의 주문을 배송중으로 변경하시겠습니까?</p>
        <div>
          <button type="button" className="btn btn-ghost" disabled={processing} onClick={onCancel}>취소</button>
          <button ref={confirmButtonRef} type="button" className="btn btn-primary" disabled={processing} onClick={onConfirm}>{processing ? '처리 중...' : '배송처리'}</button>
        </div>
      </section>
    </div>
  )
}

function AdminOrdersContent() {
  const { showToast } = useStore()
  const [orders, setOrders] = useState([])
  const [filter, setFilter] = useState(initialOrderFilter)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updatingOrderId, setUpdatingOrderId] = useState(null)
  const [selectedOrderIds, setSelectedOrderIds] = useState(() => new Set())
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false)
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState(null)
  const selectAllRef = useRef(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    setSelectedOrderIds(new Set())
    try {
      setOrders(await fetchAdminOrders())
    } catch (caught) {
      console.error('Admin orders fetch failed:', { code: caught?.code || 'ADMIN_ORDERS_FETCH_FAILED' })
      setError(caught.message || '주문 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const summary = useMemo(() => summarizeAdminOrders(orders), [orders])
  const visibleOrders = useMemo(() => filterAdminOrders(orders, filter).filter((order) => {
    const needle = query.trim().toLowerCase()
    return !needle || `${order.toss_order_id} ${order.buyerName} ${order.user_id}`.toLowerCase().includes(needle)
  }), [filter, orders, query])
  const visibleShippableIds = useMemo(() => visibleOrders.filter(isBulkShippableOrder).map((order) => order.order_id), [visibleOrders])
  const allVisibleSelected = visibleShippableIds.length > 0 && visibleShippableIds.every((orderId) => selectedOrderIds.has(orderId))
  const someVisibleSelected = visibleShippableIds.some((orderId) => selectedOrderIds.has(orderId))
  const selectedOrder = orders.find((order) => order.order_id === selectedOrderId) || null

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someVisibleSelected && !allVisibleSelected
  }, [allVisibleSelected, someVisibleSelected])

  const toggleOrder = (orderId) => {
    setSelectedOrderIds((current) => {
      const next = new Set(current)
      if (next.has(orderId)) next.delete(orderId)
      else next.add(orderId)
      return next
    })
  }

  const toggleAllVisible = () => {
    setSelectedOrderIds((current) => {
      const next = new Set(current)
      if (allVisibleSelected) visibleShippableIds.forEach((orderId) => next.delete(orderId))
      else visibleShippableIds.forEach((orderId) => next.add(orderId))
      return next
    })
  }

  const advance = async (order) => {
    const nextStatus = NEXT_ORDER_STATUS[order.status]
    if (!nextStatus) return
    if (!window.confirm(`주문 상태를 '${ORDER_STATUS_LABELS[nextStatus]}'(으)로 변경할까요?`)) return
    setUpdatingOrderId(order.order_id)
    try {
      await updateAdminOrderStatus(order.order_id, nextStatus)
      setOrders((current) => current.map((item) => item.order_id === order.order_id ? { ...item, status: nextStatus } : item))
      setSelectedOrderIds((current) => {
        const next = new Set(current)
        next.delete(order.order_id)
        return next
      })
      showToast(`주문 상태를 ${ORDER_STATUS_LABELS[nextStatus]}(으)로 변경했습니다.`)
    } catch (caught) {
      console.error('Admin order status update failed:', { code: caught?.code || 'ORDER_STATUS_UPDATE_FAILED' })
      showToast(caught.message || '주문 상태를 변경하지 못했습니다.')
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const confirmBulkShipping = async () => {
    const orderIds = [...selectedOrderIds]
    if (orderIds.length === 0) return
    setBulkProcessing(true)
    try {
      const updatedOrderIds = await bulkShipAdminOrders(orderIds)
      const updatedSet = new Set(updatedOrderIds)
      setOrders((current) => current.map((order) => updatedSet.has(order.order_id) ? { ...order, status: 'shipped' } : order))
      setSelectedOrderIds(new Set())
      setBulkConfirmOpen(false)
      showToast(`${updatedOrderIds.length}건의 주문을 배송중으로 변경했습니다.`)
    } catch (caught) {
      console.error('Admin bulk shipping failed:', { code: caught?.code || 'BULK_SHIPPING_FAILED' })
      setBulkConfirmOpen(false)
      showToast(caught.message || '선택 주문을 배송처리하지 못했습니다. 주문 상태를 다시 확인해 주세요.')
      await load()
    } finally {
      setBulkProcessing(false)
    }
  }

  const summaryItems = [
    ['전체 주문', summary.total],
    ['결제완료', summary.paid],
    ['상품준비중', summary.preparing],
    ['배송중', summary.shipped],
    ['배송완료', summary.delivered],
  ]

  return <div className="wrap page admin-orders-page">
    <div className="admin-head admin-orders-head"><h1>주문 · 출고 관리</h1><p>결제 이후 주문 처리 현황</p></div>
    <dl className="admin-order-summary" aria-label="주문 운영 요약">{summaryItems.map(([label, count]) => <div key={label}><dt>{label}</dt><dd>{count}<small>건</small></dd></div>)}</dl>
    <div className="admin-toolbar"><div className="admin-filters">{FILTERS.map((item) => <button className={filter === item.value ? 'on' : ''} key={item.value} onClick={() => setFilter(item.value)}>{item.label}</button>)}</div><input className="admin-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="주문번호 또는 주문자 검색" /></div>
    <div className="admin-bulk-bar">
      <span>선택 <b>{selectedOrderIds.size}</b>건</span>
      <button type="button" className="btn btn-primary btn-sm" disabled={selectedOrderIds.size === 0 || bulkProcessing || updatingOrderId !== null} onClick={() => setBulkConfirmOpen(true)}>선택 주문 배송처리</button>
    </div>
    {loading ? <div className="empty" role="status"><p>주문 데이터를 불러오는 중입니다.</p></div> : error ? <div className="empty" role="alert"><h3>주문을 불러오지 못했습니다.</h3><p>잠시 후 다시 시도해 주세요.</p><button className="btn btn-primary btn-sm" onClick={() => void load()}>다시 시도</button></div> : visibleOrders.length === 0 ? <div className="empty"><h3>{orders.length === 0 ? '표시할 주문이 없습니다.' : '현재 조건에 해당하는 주문이 없습니다.'}</h3></div> : <div className="table-wrap"><table role="table" className="admin-mobile-cards admin-orders-table"><thead><tr><th className="admin-order-select"><input ref={selectAllRef} type="checkbox" checked={allVisibleSelected} disabled={visibleShippableIds.length === 0 || bulkProcessing} aria-label="화면의 상품준비중 주문 전체선택" onChange={toggleAllVisible} /></th><th>주문번호</th><th>주문일시</th><th>주문자</th><th>주문 상품</th><th>결제액</th><th>상태</th><th>처리</th></tr></thead><tbody>{visibleOrders.map((order) => { const nextStatus = NEXT_ORDER_STATUS[order.status]; const shippable = isBulkShippableOrder(order); return <tr key={order.order_id} className={selectedOrderIds.has(order.order_id) ? 'selected' : ''}><td data-label="선택" className="admin-order-select"><input type="checkbox" checked={selectedOrderIds.has(order.order_id)} disabled={!shippable || bulkProcessing} aria-label={`${order.toss_order_id} 주문 선택${shippable ? '' : ' (상품준비중 주문만 선택 가능)'}`} onChange={() => toggleOrder(order.order_id)} /></td><td data-label="주문번호" className="td-mono admin-order-id">{order.toss_order_id}</td><td data-label="주문일시" className="admin-date">{formatDate(order.created_at)}</td><td data-label="주문자"><div className="td-name">{order.buyerName}</div><div className="admin-user-id">{order.user_id.slice(-8)}</div></td><td data-label="주문 상품" className="admin-order-items">{(order.order_items || []).map((item) => <div key={item.product_id}>{item.products?.name || `상품 #${item.product_id}`} <span>× {item.quantity}</span></div>)}</td><td data-label="결제액" className="admin-number">{won(order.total_price)}</td><td data-label="상태"><span className={`status ${order.status === 'delivered' ? 'status-done' : 'status-active'}`}>{ORDER_STATUS_LABELS[order.status] || order.status}</span></td><td data-label="처리"><div className="admin-order-row-actions"><button type="button" className="btn-mini soft" onClick={() => setSelectedOrderId(order.order_id)}>상세</button>{nextStatus ? <button className="btn-mini solid" disabled={updatingOrderId === order.order_id || bulkProcessing} onClick={() => void advance(order)}>{updatingOrderId === order.order_id ? '처리 중...' : `${ORDER_STATUS_LABELS[nextStatus]} 처리`}</button> : <span className="admin-action-muted">{order.status === 'pending' ? '결제 대기' : '처리 완료'}</span>}</div></td></tr> })}</tbody></table></div>}
    {bulkConfirmOpen && <BulkShipConfirmModal count={selectedOrderIds.size} processing={bulkProcessing} onCancel={() => setBulkConfirmOpen(false)} onConfirm={() => void confirmBulkShipping()} />}
    {selectedOrder && <OrderDetail order={selectedOrder} updating={updatingOrderId === selectedOrder.order_id} busy={updatingOrderId !== null || bulkProcessing} onClose={() => setSelectedOrderId(null)} onAdvance={advance} />}
  </div>
}

export default function AdminOrders() { return <AdminGate><AdminOrdersContent /></AdminGate> }
```

## src/pages/AdminPartnerships.jsx

제안 필터·상세·메모·저장·미저장 확인

원본 줄 8–212

```jsx
const STATUS_FILTERS = ['all', 'new', 'reviewing', 'approved', 'rejected']
const formatDate = (value, withTime = false) => new Intl.DateTimeFormat('ko-KR', withTime
  ? { dateStyle: 'long', timeStyle: 'short' }
  : { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value))

function safeWebsite(value) {
  if (!value) return null
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

function DetailItem({ label, children }) {
  return <div><dt>{label}</dt><dd>{children || '—'}</dd></div>
}

function PartnershipDetail({ inquiry, authUserId, onClose, onSaved }) {
  const { showToast } = useStore()
  const [status, setStatus] = useState(inquiry.status)
  const [adminNote, setAdminNote] = useState(inquiry.admin_note || '')
  const [saving, setSaving] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const closeButtonRef = useRef(null)
  const website = safeWebsite(inquiry.website)
  const dirty = status !== inquiry.status || adminNote !== (inquiry.admin_note || '')
  const dirtyRef = useRef(dirty)
  const savingRef = useRef(saving)
  const onCloseRef = useRef(onClose)
  dirtyRef.current = dirty
  savingRef.current = saving
  onCloseRef.current = onClose

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !savingRef.current) {
        if (dirtyRef.current) setConfirmClose(true)
        else onCloseRef.current()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  const requestClose = () => {
    if (saving) return
    if (dirty) setConfirmClose(true)
    else onClose()
  }

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(inquiry.email)
      showToast('이메일 주소를 복사했습니다.')
    } catch {
      showToast('이메일 주소를 복사하지 못했습니다.')
    }
  }

  const save = async (event) => {
    event.preventDefault()
    if (saving || !dirty) return
    setSaving(true)
    try {
      const updated = await updateAdminPartnership(inquiry.id, { status, adminNote, reviewedBy: authUserId })
      onSaved(updated)
      showToast('협업 제안 처리 내용을 저장했습니다.')
    } catch (caught) {
      console.error('Admin partnership update failed:', caught)
      showToast(caught.message || '협업 제안 처리 내용을 저장하지 못했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return <>
    <button type="button" className="admin-product-editor-backdrop" onClick={requestClose} aria-label="협업 제안 상세 닫기" />
    <section className="admin-product-editor-shell admin-partnership-detail" role="dialog" aria-modal="true" aria-labelledby="admin-partnership-detail-title">
      <div className="admin-product-editor-head">
        <div><span>PARTNERSHIP DETAIL</span><h2 id="admin-partnership-detail-title"><Icon name="leaf" size={19} />{inquiry.brand_name}</h2></div>
        <button ref={closeButtonRef} type="button" className="icon-btn" onClick={requestClose} disabled={saving} aria-label="닫기"><Icon name="x" size={20} /></button>
      </div>
      <form className="admin-product-editor-form" onSubmit={save}>
        <div className="admin-product-editor-body">
          <div className="admin-partnership-detail-grid">
            <div className="admin-partnership-copy">
              <section><h3>브랜드 정보</h3><dl className="admin-partnership-dl">
                <DetailItem label="브랜드명">{inquiry.brand_name}</DetailItem>
                <DetailItem label="담당자명">{inquiry.contact_name}</DetailItem>
                <DetailItem label="이메일"><span className="admin-partnership-inline">{inquiry.email}<button type="button" onClick={() => void copyEmail()}>복사</button></span></DetailItem>
                <DetailItem label="연락처">{inquiry.phone}</DetailItem>
                <DetailItem label="홈페이지 / SNS">{website ? <a href={website} target="_blank" rel="noreferrer">새 탭에서 열기 <Icon name="arrow-up-right" size={13} /></a> : inquiry.website}</DetailItem>
              </dl></section>
              <section><h3>제안 정보</h3><dl className="admin-partnership-dl">
                <DetailItem label="제안 유형">{inquiry.proposal_type}</DetailItem>
                <DetailItem label="상품 카테고리">{inquiry.product_category}</DetailItem>
                <DetailItem label="대표 제품">{inquiry.product_name}</DetailItem>
              </dl></section>
              <section><h3>브랜드 소개</h3><p>{inquiry.brand_description}</p></section>
              <section><h3>제휴 희망 이유</h3><p>{inquiry.partnership_reason || '작성되지 않았습니다.'}</p></section>
            </div>

            <aside className="admin-partnership-operations">
              <section><h3>접수 정보</h3><dl className="admin-partnership-dl compact">
                <DetailItem label="접수일시">{formatDate(inquiry.created_at, true)}</DetailItem>
                <DetailItem label="현재 상태"><span className={`admin-partnership-status ${inquiry.status}`}>{PARTNERSHIP_STATUS_LABELS[inquiry.status]}</span></DetailItem>
              </dl></section>
              <label className="admin-field"><span>상태</span><select value={status} onChange={(event) => setStatus(event.target.value)}>{Object.entries(PARTNERSHIP_STATUS_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
              <label className="admin-field"><span>관리자 메모</span><textarea rows="9" maxLength={4000} value={adminNote} onChange={(event) => setAdminNote(event.target.value)} placeholder="담당 MD 확인 필요&#10;원재료 인증 자료 요청 예정" /><small>{adminNote.length.toLocaleString()} / 4,000</small></label>
            </aside>
          </div>
        </div>
        <div className="admin-actions">
          <span className={`admin-save-state${dirty ? ' changed' : ''}`}>{dirty ? '저장하지 않은 변경사항이 있습니다.' : '현재 저장된 상태입니다.'}</span>
          <button type="button" className="btn btn-ghost" onClick={requestClose} disabled={saving}>닫기</button>
          <button className="btn btn-primary" disabled={saving || !dirty}>{saving ? '저장 중...' : '변경사항 저장'}</button>
        </div>
      </form>
      {confirmClose && <div className="admin-unsaved-layer"><div className="admin-unsaved-dialog" role="alertdialog" aria-modal="true" aria-labelledby="admin-partnership-unsaved-title"><span className="admin-unsaved-icon"><Icon name="alert-circle" size={22} /></span><h3 id="admin-partnership-unsaved-title">저장하지 않은 변경사항이 있습니다.</h3><p>상세 화면을 닫으면 입력한 처리 내용이 사라집니다.</p><div><button type="button" className="btn btn-ghost" onClick={() => setConfirmClose(false)}>계속 편집</button><button type="button" className="btn admin-discard-button" onClick={onClose}>변경사항 버리기</button></div></div></div>}
    </section>
  </>
}

function AdminPartnershipsContent() {
  const { authUserId } = useStore()
  const [inquiries, setInquiries] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      setInquiries(await fetchAdminPartnerships())
    } catch (caught) {
      console.error('Admin partnerships fetch failed:', caught)
      setError(caught.message || '협업 제안 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    fetchAdminPartnerships()
      .then((rows) => { if (active) setInquiries(rows) })
      .catch((caught) => {
        if (!active) return
        console.error('Admin partnerships fetch failed:', caught)
        setError(caught.message || '협업 제안 목록을 불러오지 못했습니다.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const summary = useMemo(() => inquiries.reduce((counts, inquiry) => {
    counts.total += 1
    counts[inquiry.status] += 1
    return counts
  }, { total: 0, new: 0, reviewing: 0, approved: 0, rejected: 0 }), [inquiries])

  const visibleInquiries = useMemo(() => inquiries.filter((inquiry) => {
    const needle = query.trim().toLowerCase()
    const matchesQuery = !needle || `${inquiry.brand_name} ${inquiry.contact_name} ${inquiry.email}`.toLowerCase().includes(needle)
    return matchesQuery
      && (statusFilter === 'all' || inquiry.status === statusFilter)
      && (typeFilter === 'all' || inquiry.proposal_type === typeFilter)
  }), [inquiries, query, statusFilter, typeFilter])

  const saved = (updated) => {
    setInquiries((current) => current.map((item) => item.id === updated.id ? updated : item))
    setSelected(updated)
  }

  return <>
    <div className="wrap page admin-partnerships-page">
      <div className="admin-head admin-orders-head"><h1>협업 제안</h1><p>브랜드 입점 및 제휴 요청</p></div>
      <dl className="admin-order-summary" aria-label="협업 제안 상태 요약">{[
        ['전체 제안', summary.total], ['신규', summary.new], ['검토중', summary.reviewing], ['승인', summary.approved], ['거절', summary.rejected],
      ].map(([label, count]) => <div key={label}><dt>{label}</dt><dd>{count}<small>건</small></dd></div>)}</dl>

      <div className="admin-toolbar admin-partnership-toolbar">
        <div className="admin-filters">{STATUS_FILTERS.map((status) => <button className={statusFilter === status ? 'on' : ''} key={status} onClick={() => setStatusFilter(status)}>{status === 'all' ? '전체' : PARTNERSHIP_STATUS_LABELS[status]}</button>)}</div>
        <div className="admin-partnership-tools"><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="제안 유형 필터"><option value="all">모든 제안 유형</option>{PARTNERSHIP_PROPOSAL_TYPES.map((type) => <option key={type}>{type}</option>)}</select><input className="admin-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="브랜드명, 담당자명 또는 이메일 검색" aria-label="협업 제안 검색" /></div>
      </div>

      {loading ? <div className="empty" role="status"><p>협업 제안을 불러오는 중입니다.</p></div> : error ? <div className="empty" role="alert"><h3>협업 제안을 불러오지 못했습니다.</h3><p>잠시 후 다시 시도해 주세요.</p><button className="btn btn-primary btn-sm" onClick={() => void load()}>다시 시도</button></div> : visibleInquiries.length === 0 ? <div className="empty"><h3>{inquiries.length === 0 ? '접수된 협업 제안이 없습니다.' : '현재 조건에 해당하는 제안이 없습니다.'}</h3></div> : <div className="table-wrap admin-partnership-table-wrap"><table role="table" className="admin-mobile-cards admin-partnership-table"><thead><tr><th>브랜드</th><th>제안 유형</th><th>상품 카테고리</th><th>담당자</th><th>접수일</th><th>상태</th><th>관리</th></tr></thead><tbody>{visibleInquiries.map((inquiry) => <tr key={inquiry.id}><td data-label="브랜드"><div className="td-name">{inquiry.brand_name}</div><div className="admin-product-brand">{inquiry.email}</div></td><td data-label="제안 유형">{inquiry.proposal_type}</td><td data-label="상품 카테고리">{inquiry.product_category}</td><td data-label="담당자">{inquiry.contact_name}</td><td data-label="접수일" className="admin-date">{formatDate(inquiry.created_at)}</td><td data-label="상태"><span className={`admin-partnership-status ${inquiry.status}`}>{PARTNERSHIP_STATUS_LABELS[inquiry.status]}</span></td><td data-label="관리"><button className="admin-product-action edit" onClick={() => setSelected(inquiry)}>보기</button></td></tr>)}</tbody></table></div>}
    </div>
    {selected && <PartnershipDetail inquiry={selected} authUserId={authUserId} onClose={() => setSelected(null)} onSaved={saved} />}
  </>
}

export default function AdminPartnerships() { return <AdminGate><AdminPartnershipsContent /></AdminGate> }
```

## src/pages/AdminInquiries.jsx

문의 필터·답변 입력·등록후 읽기전용

원본 줄 8–163

```jsx
const FILTERS = [
  { value: 'all', label: '전체' },
  { value: 'waiting', label: '답변 대기' },
  { value: 'answered', label: '답변 완료' },
]
const formatDate = (value, withTime = false) => new Intl.DateTimeFormat('ko-KR', withTime
  ? { dateStyle: 'long', timeStyle: 'short' }
  : { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value))

function StatusBadge({ status }) {
  return <span className={`admin-inquiry-status ${isAnsweredInquiry(status) ? 'answered' : 'waiting'}`}>{inquiryStatusLabel(status)}</span>
}

function DetailItem({ label, children, wide = false }) {
  return <div className={wide ? 'wide' : ''}><dt>{label}</dt><dd>{children || '—'}</dd></div>
}

function InquiryDetail({ inquiry, onClose, onAnswered }) {
  const { showToast } = useStore()
  const [answer, setAnswer] = useState(inquiry.admin_answer || '')
  const [answerError, setAnswerError] = useState('')
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const closeButtonRef = useRef(null)
  const answered = isAnsweredInquiry(inquiry)
  const orderNumber = inquiry.orders?.toss_order_id || inquiry.order_id

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !savingRef.current) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const submit = async (event) => {
    event.preventDefault()
    if (savingRef.current || answered) return
    const nextError = validateAdminInquiryAnswer(answer)
    setAnswerError(nextError)
    if (nextError) return

    savingRef.current = true
    setSaving(true)
    try {
      const updated = await answerAdminCustomerInquiry(inquiry.id, answer)
      onAnswered({ ...inquiry, ...updated, orders: inquiry.orders })
      showToast('답변이 등록되었습니다.')
    } catch (caught) {
      console.error('Admin customer inquiry answer failed:', { code: caught?.code || 'ADMIN_INQUIRY_ANSWER_FAILED' })
      showToast(caught.message || '답변을 등록하지 못했습니다.')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  return <>
    <button type="button" className="admin-product-editor-backdrop" onClick={() => !saving && onClose()} aria-label="1:1 문의 상세 닫기" />
    <section className="admin-product-editor-shell admin-inquiry-detail" role="dialog" aria-modal="true" aria-labelledby="admin-inquiry-detail-title">
      <div className="admin-product-editor-head"><div><span>INQUIRY DETAIL</span><h2 id="admin-inquiry-detail-title"><Icon name="message-circle" size={19} />1:1 문의 상세</h2></div><button ref={closeButtonRef} type="button" className="icon-btn" onClick={onClose} disabled={saving} aria-label="닫기"><Icon name="x" size={20} /></button></div>
      <form className="admin-product-editor-form" onSubmit={submit}>
        <div className="admin-product-editor-body">
          <div className="admin-inquiry-detail-grid">
            <div className="admin-inquiry-copy">
              <section><h3>문의 정보</h3><dl className="admin-partnership-dl">
                <DetailItem label="문의 유형">{inquiry.category}</DetailItem>
                <DetailItem label="제목">{inquiry.title}</DetailItem>
                <DetailItem label="접수일">{formatDate(inquiry.created_at, true)}</DetailItem>
                <DetailItem label="현재 상태"><StatusBadge status={inquiry.status} /></DetailItem>
              </dl></section>
              <section><h3>고객 정보</h3><dl className="admin-partnership-dl"><DetailItem label="이메일">{inquiry.contact_email}</DetailItem></dl></section>
              <section><h3>연결 주문</h3><p className="admin-inquiry-order">{orderNumber || '연결된 주문 없음'}</p></section>
              <section><h3>문의 내용</h3><p>{inquiry.content}</p></section>
            </div>
            <aside className="admin-partnership-operations admin-inquiry-answer-panel">
              <section><h3>관리자 답변</h3>{answered && <p className="admin-inquiry-answered-at">답변일 {formatDate(inquiry.answered_at, true)}</p>}</section>
              <label className="admin-field"><span>답변 내용</span><textarea rows="12" maxLength={4000} value={answer} readOnly={answered} onChange={(event) => { setAnswer(event.target.value); setAnswerError('') }} placeholder="고객에게 전달할 답변을 입력해 주세요." aria-invalid={Boolean(answerError)} aria-describedby={answerError ? 'admin-inquiry-answer-error' : undefined} />
                <small>{answer.length.toLocaleString()} / 4,000</small>{answerError && <em id="admin-inquiry-answer-error" className="admin-inquiry-answer-error" role="alert">{answerError}</em>}
              </label>
            </aside>
          </div>
        </div>
        <div className="admin-actions"><span className="admin-save-state">{answered ? '등록된 답변입니다.' : '답변 등록 후에는 수정할 수 없습니다.'}</span><button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>닫기</button>{!answered && <button className="btn btn-primary" disabled={saving}>{saving ? '답변 등록 중...' : '답변 등록'}</button>}</div>
      </form>
    </section>
  </>
}

function AdminInquiriesContent() {
  const [inquiries, setInquiries] = useState([])
  const [filter, setFilter] = useState('all')
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(false)
    try {
      setInquiries(await fetchAdminCustomerInquiries())
    } catch (caught) {
      console.error('Admin customer inquiries fetch failed:', { code: caught?.code || 'ADMIN_INQUIRIES_FETCH_FAILED' })
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    fetchAdminCustomerInquiries()
      .then((rows) => { if (active) setInquiries(rows) })
      .catch((caught) => {
        if (!active) return
        console.error('Admin customer inquiries fetch failed:', { code: caught?.code || 'ADMIN_INQUIRIES_FETCH_FAILED' })
        setError(true)
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const summary = useMemo(() => inquiries.reduce((counts, inquiry) => {
    counts.total += 1
    counts[isAnsweredInquiry(inquiry) ? 'answered' : 'waiting'] += 1
    return counts
  }, { total: 0, waiting: 0, answered: 0 }), [inquiries])
  const visibleInquiries = inquiries.filter((inquiry) => filter === 'all' || (filter === 'answered') === isAnsweredInquiry(inquiry))
  const selected = inquiries.find((inquiry) => inquiry.id === selectedId)

  const answered = (updated) => {
    setInquiries((current) => current.map((item) => item.id === updated.id ? updated : item))
  }

  return <>
    <div className="wrap page admin-partnerships-page admin-inquiries-page">
      <div className="admin-head admin-orders-head"><h1>1:1 문의 관리</h1><p>고객 문의 및 답변</p></div>
      <dl className="admin-order-summary admin-inquiry-summary" aria-label="1:1 문의 상태 요약">
        <div><dt>전체</dt><dd>{summary.total}<small>건</small></dd></div>
        <div className={summary.waiting ? 'needs-review' : ''}><dt>답변 대기</dt><dd>{summary.waiting}<small>건</small></dd></div>
        <div><dt>답변 완료</dt><dd>{summary.answered}<small>건</small></dd></div>
      </dl>
      <div className="admin-toolbar"><div className="admin-filters">{FILTERS.map((item) => <button className={filter === item.value ? 'on' : ''} key={item.value} onClick={() => setFilter(item.value)}>{item.label}</button>)}</div></div>
      {loading ? <div className="empty" role="status"><p>문의 목록을 불러오는 중입니다.</p></div> : error ? <div className="empty" role="alert"><h3>문의 목록을 불러오지 못했습니다.</h3><button className="btn btn-primary btn-sm" onClick={() => void load()}>다시 시도</button></div> : visibleInquiries.length === 0 ? <div className="empty"><h3>{inquiries.length === 0 ? '접수된 1:1 문의가 없습니다.' : '현재 조건에 해당하는 문의가 없습니다.'}</h3></div> : <div className="table-wrap admin-inquiry-table-wrap"><table role="table" className="admin-mobile-cards admin-inquiry-table"><thead><tr><th>문의 유형</th><th>제목</th><th>고객 이메일</th><th>주문번호</th><th>접수일</th><th>상태</th><th>관리</th></tr></thead><tbody>{visibleInquiries.map((inquiry) => <tr key={inquiry.id}><td data-label="문의 유형"><span className="td-cat">{inquiry.category}</span></td><td data-label="제목"><div className="td-name">{inquiry.title}</div></td><td data-label="고객 이메일">{inquiry.contact_email}</td><td data-label="주문번호" className="td-mono">{inquiry.orders?.toss_order_id || inquiry.order_id || '—'}</td><td data-label="접수일" className="admin-date">{formatDate(inquiry.created_at)}</td><td data-label="상태"><StatusBadge status={inquiry.status} /></td><td data-label="관리"><button className="admin-product-action edit" onClick={() => setSelectedId(inquiry.id)}>보기</button></td></tr>)}</tbody></table></div>}
    </div>
    {selected && <InquiryDetail inquiry={selected} onClose={() => setSelectedId(null)} onAnswered={answered} />}
  </>
}

export default function AdminInquiries() { return <AdminGate><AdminInquiriesContent /></AdminGate> }
```

## src/lib/catalog.js

순수 목록 필터·목적 점수·재고·성분 매칭

원본 줄 1–193

```js
import {
  canonicalProductCategory,
  matchCategory,
  PRODUCT_CATEGORY,
} from '../data/mock.js'

const DEFAULT_GOAL = '식단 영양 관리'
const CATEGORY_SCORE_UNIT = 1000
const RELIABLE_NUTRITION_BONUS = 100
const DIVERSITY_WINDOW = 12
const DIVERSITY_MIN_CATEGORY_FIT = 3
const DIVERSITY_MAX_PER_CATEGORY = 3

// 실제 DB category 10개를 구매 목적별로 해석한다. 숫자가 클수록 목적의 주된 상품군이다.
const GOAL_CATEGORY_FIT = Object.freeze({
  '근육량 증가': Object.freeze({
    [PRODUCT_CATEGORY.HIGH_PROTEIN_FOOD]: 5,
    [PRODUCT_CATEGORY.MEAL]: 4.5,
    [PRODUCT_CATEGORY.PROTEIN_SNACK]: 4,
    [PRODUCT_CATEGORY.DRINK]: 3.5,
    [PRODUCT_CATEGORY.DAIRY_ALTERNATIVE]: 3.5,
    [PRODUCT_CATEGORY.CEREAL]: 2.5,
    [PRODUCT_CATEGORY.NUTS]: 2,
    [PRODUCT_CATEGORY.HEALTH_FOOD]: 1.5,
    [PRODUCT_CATEGORY.SUPPLEMENT]: 1,
    [PRODUCT_CATEGORY.SAUCE]: 0.5,
  }),
  '체중 관리': Object.freeze({
    [PRODUCT_CATEGORY.MEAL]: 5,
    [PRODUCT_CATEGORY.HIGH_PROTEIN_FOOD]: 4.75,
    [PRODUCT_CATEGORY.PROTEIN_SNACK]: 4,
    [PRODUCT_CATEGORY.CEREAL]: 4,
    [PRODUCT_CATEGORY.DAIRY_ALTERNATIVE]: 3.5,
    [PRODUCT_CATEGORY.DRINK]: 3.5,
    [PRODUCT_CATEGORY.NUTS]: 3,
    [PRODUCT_CATEGORY.HEALTH_FOOD]: 1.5,
    [PRODUCT_CATEGORY.SAUCE]: 1,
    [PRODUCT_CATEGORY.SUPPLEMENT]: 0.5,
  }),
  '식단 영양 관리': Object.freeze({
    [PRODUCT_CATEGORY.MEAL]: 5,
    [PRODUCT_CATEGORY.HIGH_PROTEIN_FOOD]: 4.5,
    [PRODUCT_CATEGORY.PROTEIN_SNACK]: 4,
    [PRODUCT_CATEGORY.CEREAL]: 4,
    [PRODUCT_CATEGORY.DAIRY_ALTERNATIVE]: 3.5,
    [PRODUCT_CATEGORY.NUTS]: 3.5,
    [PRODUCT_CATEGORY.DRINK]: 3.25,
    [PRODUCT_CATEGORY.SAUCE]: 2,
    [PRODUCT_CATEGORY.HEALTH_FOOD]: 1.5,
    [PRODUCT_CATEGORY.SUPPLEMENT]: 0.5,
  }),
  '영양제 탐색': Object.freeze({
    [PRODUCT_CATEGORY.SUPPLEMENT]: 5,
    [PRODUCT_CATEGORY.HEALTH_FOOD]: 2,
    [PRODUCT_CATEGORY.DRINK]: 1.5,
    [PRODUCT_CATEGORY.DAIRY_ALTERNATIVE]: 1,
    [PRODUCT_CATEGORY.NUTS]: 0.75,
    [PRODUCT_CATEGORY.PROTEIN_SNACK]: 0.5,
    [PRODUCT_CATEGORY.CEREAL]: 0.5,
    [PRODUCT_CATEGORY.HIGH_PROTEIN_FOOD]: 0.25,
    [PRODUCT_CATEGORY.MEAL]: 0.25,
    [PRODUCT_CATEGORY.SAUCE]: 0.25,
  }),
})

const GOAL_NUTRIENT_KEYS = Object.freeze({
  '근육량 증가': ['protein', 'sugar'],
  '체중 관리': ['calories', 'sugar'],
  '식단 영양 관리': ['sodium', 'sugar'],
  '영양제 탐색': [],
})

function resolvedGoal(goal) {
  return GOAL_CATEGORY_FIT[goal] ? goal : DEFAULT_GOAL
}

function categoryFit(product, goal) {
  const category = canonicalProductCategory(product.category)
  return GOAL_CATEGORY_FIT[resolvedGoal(goal)][category] || 0
}

// DB는 영양값을 NOT NULL DEFAULT 0으로 저장하므로 숫자 0만으로 실제 0과 해당 없음을
// 구분할 수 없다. 식품 목표에서는 영양제의 식품 영양표를 비교 불가로 보고 중립 처리한다.
export function hasComparableNutrition(product, goal) {
  const effectiveGoal = resolvedGoal(goal)
  if (effectiveGoal !== '영양제 탐색'
    && canonicalProductCategory(product.category) === PRODUCT_CATEGORY.SUPPLEMENT) return false

  return GOAL_NUTRIENT_KEYS[effectiveGoal].every((key) => {
    const value = product.nutrition?.[key]
    return value !== null && value !== '' && Number.isFinite(Number(value))
  })
}

function nutritionFit(product, goal) {
  const effectiveGoal = resolvedGoal(goal)
  if (effectiveGoal === '영양제 탐색' || !hasComparableNutrition(product, effectiveGoal)) return 0

  const n = product.nutrition
  if (effectiveGoal === '근육량 증가') return n.protein * 20 - n.sugar
  if (effectiveGoal === '체중 관리') return 1000 - n.calories - n.sugar * 20
  return 1000 - n.sodium - n.sugar * 5
}

export function goalScoreDetails(product, goal) {
  const effectiveGoal = resolvedGoal(goal)
  const category = categoryFit(product, effectiveGoal) * CATEGORY_SCORE_UNIT
  const nutrition = nutritionFit(product, effectiveGoal)
  const dataReliability = hasComparableNutrition(product, effectiveGoal)
    ? RELIABLE_NUTRITION_BONUS
    : 0

  return {
    category,
    nutrition,
    dataReliability,
    total: category + nutrition + dataReliability,
  }
}

// 기존 영양 산식은 유지하고, 목표별 category와 데이터 비교 가능성을 앞단 점수로 더한다.
export function goalScore(product, goal) {
  return goalScoreDetails(product, goal).total
}

function compareRecommendation(a, b, goal) {
  return goalScore(b, goal) - goalScore(a, goal) || a.id - b.id
}

function diversifyTopRecommendations(sortedProducts, goal) {
  const effectiveGoal = resolvedGoal(goal)
  if (effectiveGoal === '영양제 탐색') return sortedProducts

  const pool = [...sortedProducts]
  const top = []
  const categoryCounts = new Map()

  while (pool.length && top.length < DIVERSITY_WINDOW) {
    const repeatedCategory = top.length >= 2
      && canonicalProductCategory(top.at(-1).category) === canonicalProductCategory(top.at(-2).category)
      ? canonicalProductCategory(top.at(-1).category)
      : null

    let nextIndex = pool.findIndex((product) => {
      const category = canonicalProductCategory(product.category)
      return categoryFit(product, effectiveGoal) >= DIVERSITY_MIN_CATEGORY_FIT
        && (categoryCounts.get(category) || 0) < DIVERSITY_MAX_PER_CATEGORY
        && category !== repeatedCategory
    })
    if (nextIndex < 0) nextIndex = 0

    const [next] = pool.splice(nextIndex, 1)
    const category = canonicalProductCategory(next.category)
    categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1)
    top.push(next)
  }

  return [...top, ...pool]
}

function isSellable(product) {
  return product.isActive !== false && (product.stock == null || product.stock > 0)
}

// 상품 목록 필터 + 정렬 (Home 프리뷰 / 맞춤 상품 / 전체상품 페이지 공용)
export function filterAndSort(products, { search, subFilters, allergies, sortBy, goal, shopCategory, shopSub, dealsOnly = false, hideAllergens = true }) {
  let list = products.filter((p) => {
    if (!isSellable(p)) return false
    if (dealsOnly && !(p.originalPrice > p.price)) return false
    if (!matchCategory(p, shopCategory, shopSub)) return false
    if (search) {
      const q = search.toLowerCase()
      if (!p.name.toLowerCase().includes(q) && !p.brand.toLowerCase().includes(q) && !p.category.toLowerCase().includes(q)) return false
    }
    for (const tag of subFilters) {
      if (tag === '고단백' && p.nutrition.protein < 15) return false
      if (tag === '저당' && p.nutrition.sugar > 5) return false
      if (tag === '저염' && p.nutrition.sodium > 250) return false
      if (tag === '카페인 제외' && p.caffeine) return false
    }
    // 목록에서만 임시 해제하며 저장된 선호 설정은 변경하지 않는다.
    if (hideAllergens && matchingAllergens(p, allergies).length) return false
    return true
  })
  if (sortBy === 'lowPrice') list = [...list].sort((a, b) => a.price - b.price || a.id - b.id)
  else if (sortBy === 'highPrice') list = [...list].sort((a, b) => b.price - a.price || a.id - b.id)
  else list = diversifyTopRecommendations([...list].sort((a, b) => compareRecommendation(a, b, goal)), goal)
  return list
}

export function matchingAllergens(product, allergies = []) {
  return [...new Set(allergies)].filter(allergen => (product.allergens || []).includes(allergen))
}
```

## src/lib/ai-search.js

AI 결과가 실제 상품 목록으로 변환되는 로컬 UI 로직

원본 줄 30–77

```js
export const AI_SORT_TO_UI = {
  relevance: 'recommend', price_asc: 'lowPrice', price_desc: 'highPrice',
  protein_desc: 'protein', sugar_asc: 'sugar', sodium_asc: 'sodium',
}

export function conditionLabels(c) {
  const labels = []
  if (c.category) labels.push(c.category)
  for (const [field, label, unit, comparison] of [
    ['protein_min', '단백질', 'g', '이상'], ['sugar_max', '당류', 'g', '이하'],
    ['sodium_max', '나트륨', 'mg', '이하'], ['calories_max', '열량', 'kcal', '이하'], ['price_max', '가격', '원', '이하'],
  ]) if (c[field] !== null) labels.push(`${label} ${c[field].toLocaleString('ko-KR')}${unit} ${comparison}`)
  if (c.exclude_caffeine) labels.push('카페인 제외')
  if (c.excluded_allergens.length) labels.push(`${c.excluded_allergens.join(' · ')} 제외`)
  labels.push(...c.keywords)
  return labels.length ? labels : ['전체 상품']
}

export function filterAiProducts(products, raw, sort = null) {
  const c = normalizeConditions(raw)
  const fields = [
    ['protein_min', 'protein', true], ['sugar_max', 'sugar', false],
    ['sodium_max', 'sodium', false], ['calories_max', 'calories', false],
  ]
  const haystack = p => normalizeText([p.name, p.brand, p.category, p.summary, ...(p.mainIngredients || [])].join(' '))
  const list = products.filter(p => {
    if (!p.isActive || (c.category && p.category !== c.category)) return false
    if (c.price_max !== null && p.price > c.price_max) return false
    for (const [key, nutrient, minimum] of fields) {
      if (c[key] === null) continue
      const value = p.nutrition?.[nutrient]
      if (!Number.isFinite(value) || (minimum ? value < c[key] : value > c[key])) return false
    }
    if (c.exclude_caffeine && p.caffeine) return false
    if (c.excluded_allergens.some(a => p.allergens.includes(a))) return false
    return c.keywords.every(k => haystack(p).includes(normalizeText(k)))
  })
  const score = p => c.keywords.reduce((total, k) => total + (normalizeText(p.name).includes(normalizeText(k)) ? 2 : 1), 0)
  const comparisons = {
    relevance: (a, b) => score(b) - score(a),
    price_asc: (a, b) => a.price - b.price, price_desc: (a, b) => b.price - a.price,
    protein_desc: (a, b) => b.nutrition.protein - a.nutrition.protein,
    sugar_asc: (a, b) => a.nutrition.sugar - b.nutrition.sugar,
    sodium_asc: (a, b) => a.nutrition.sodium - b.nutrition.sodium,
  }
  const compare = comparisons[sort || c.sort_by] || comparisons.relevance
  return list.sort((a, b) => compare(a, b) || a.id - b.id)
}
```

## src/lib/payments.js

회원 배송지 토글·완성 조건·결제 오류 문구

원본 줄 1–41

```js
export function memberCheckoutShipping(user = {}, profile = {}) {
  return {
    name: user?.name || '',
    phone: profile?.phone || '',
    postalCode: profile?.postalCode || '',
    address: profile?.address || '',
    addressDetail: profile?.addressDetail || '',
    deliveryRequest: '',
  }
}

export function shippingForMemberToggle(current = {}, memberShipping = {}, checked) {
  const deliveryRequest = current.deliveryRequest || ''
  if (checked) return { ...memberShipping, deliveryRequest }
  return {
    name: '',
    phone: '',
    postalCode: '',
    address: '',
    addressDetail: '',
    deliveryRequest,
  }
}

export function isCheckoutShippingComplete(values = {}) {
  const name = String(values.name || values.recipientName || '').trim()
  const phone = String(values.phone || values.recipientPhone || '').trim()
  const postalCode = String(values.postalCode || '').trim()
  const address = String(values.address || '').trim()
  return Boolean(name && phone.length >= 5 && postalCode && address)
}

export function checkoutRequestErrorMessage(error) {
  if (error?.message === 'CHECKOUT_COUPON_UNAVAILABLE') return '이미 사용했거나 사용할 수 없는 쿠폰입니다. 쿠폰 적용을 취소한 뒤 다시 선택해 주세요.'
  const code = String(error?.code || error?.name || '')
  if (/NOT_SELECTED_PAYMENT_METHOD|NotSelectedPaymentMethod/i.test(code)) return '결제수단을 선택해 주세요.'
  if (/NEED_AGREEMENT|NeedAgreement/i.test(code)) return '필수 결제 약관에 동의해 주세요.'
  if (/UNSUPPORTED_TEST_PHASE_PAYMENT_METHOD|UnsupportedTestPhasePaymentMethod/i.test(code)) return '테스트 환경에서 지원하지 않는 결제수단입니다. 다른 결제수단을 선택해 주세요.'
  if (/USER_CANCEL|PAY_PROCESS_CANCELED|UserCancel/i.test(code)) return '결제가 취소되었습니다. 다시 시도해 주세요.'
  return '결제를 진행하지 못했습니다. 결제수단·약관과 장바구니 재고를 확인해 주세요.'
}
```

## src/data/mock.js

목적·보조 조건·알레르기·히어로·카테고리의 공개 UI 설정. 샘플 상품 덤프 제외

원본 줄 6–158

```js
export const GOALS = [
  {
    id: 'muscle',
    name: '근육량 증가',
    en: 'Muscle & Strength',
    icon: 'dumbbell',
    desc: 'WPI 분리유청과 저지방 단백질 중심으로 순수 근합성을 돕는 구성',
    focusMetric: '순수 단백질 함량',
    theme: 'muscle',
  },
  {
    id: 'weight',
    name: '체중 관리',
    en: 'Weight & Balance',
    icon: 'flame',
    desc: '혈당을 완만하게, 알룰로스 기반 저칼로리·저당 식단 설계',
    focusMetric: '열량 · 당류',
    theme: 'weight',
  },
  {
    id: 'diet',
    name: '식단 영양 관리',
    en: 'Clean Eating',
    icon: 'apple',
    desc: '자연 저염식과 식이섬유로 탄단지 균형을 맞춘 깨끗한 한 끼',
    focusMetric: '나트륨 · 식이섬유',
    theme: 'diet',
  },
  {
    id: 'supplement',
    name: '영양제 탐색',
    en: 'Daily Vitality',
    icon: 'pill',
    desc: '고순도 활성 비타민과 식물성 오메가로 채우는 데일리 케어',
    focusMetric: '핵심 기능성분',
    theme: 'supp',
  },
]

// 보조 조건 (다중 선택 필터)
export const SUB_FILTERS = [
  { id: 'low_sugar', tag: '저당', label: '저당', hint: '당류 5g 이하' },
  { id: 'low_sodium', tag: '저염', label: '저염', hint: '나트륨 250mg 이하' },
  { id: 'high_protein', tag: '고단백', label: '고단백', hint: '단백질 15g 이상' },
  { id: 'no_caffeine', tag: '카페인 제외', label: '카페인 제외', hint: '디카페인' },
]

export const ALLERGENS = [
  '대두', '우유', '계란', '견과류', '밀', '갑각류', '복숭아', '쇠고기', '닭고기',
]

// 히어로 슬라이드
export const HERO_SLIDES = [
  {
    id: 1,
    tag: 'Well-being Selection',
    title: '흙과 자연이 건네는\n온전한 하루의 영양',
    desc: '불필요한 인공 첨가물 없이, 공인된 영양성분만 담았습니다. 자연 친화적 원료로 완성하는 깨끗한 한 끼.',
    badge: '등록된 영양성분을 확인하세요',
    btn: '저염 클린식 컬렉션',
    collection: { category: '전체상품', sub: '전체', subFilters: ['저염'] },
    image:
      'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1400&auto=format&fit=crop&q=80',
  },
  {
    id: 2,
    tag: 'Clean Protein Lab',
    title: '속 편한 분리유청,\n당류 0g의 단백질 밸런스',
    desc: '유당 걱정 없는 깨끗한 단백질. 자연 감미료로 건강한 달콤함을 설계했습니다.',
    badge: '프로틴 상품 모아보기',
    btn: '프로틴 컬렉션 보기',
    collection: { category: '프로틴', sub: '전체', subFilters: [] },
    image:
      'https://images.unsplash.com/photo-1607013251379-e6eecfffe234?w=1400&auto=format&fit=crop&q=80',
  },
  {
    id: 3,
    tag: 'Low-sugar Botanical',
    title: '설탕 없이도\n깊고 상쾌한 웰빙 라이프',
    desc: '탄산음료 대신 천연 발효 음료로 장 건강과 수분 리듬을 편안하게 깨워보세요.',
    badge: '無합성감미료 원칙',
    btn: '저당 음료 컬렉션',
    collection: { category: '건강음료', sub: '전체', subFilters: ['저당'] },
    image:
      'https://images.unsplash.com/photo-1556881286-fc6915169721?w=1400&auto=format&fit=crop&q=80',
  },
]

// 상단 제품 카테고리 = "상품 종류". (저당/고단백 등 영양 특성은 별도 필터로 분리)
// Supabase category와 관리자 상품 폼이 같은 값을 사용하도록 여기에서 한 번만 관리한다.
export const PRODUCT_CATEGORY = Object.freeze({
  NUTS: '견과·건과류',
  HEALTH_FOOD: '기타 건강식품',
  HIGH_PROTEIN_FOOD: '닭가슴살·고단백 식품',
  MEAL: '도시락·간편식',
  SAUCE: '소스·조미료',
  CEREAL: '시리얼·그래놀라',
  SUPPLEMENT: '영양제·비타민',
  DAIRY_ALTERNATIVE: '유제품·대체유',
  DRINK: '음료·프로틴음료',
  PROTEIN_SNACK: '프로틴바·건강간식',
})

export const PRODUCT_CATEGORIES = Object.freeze(Object.values(PRODUCT_CATEGORY))

// 입력/URL/DB 값의 양끝·중간 공백, 영문 대소문자, Unicode 중점 표기 차이를 흡수한다.
export function normalizeCategoryName(value) {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('ko-KR')
    .replace(/\s+/g, '')
    .replace(/[ㆍᆞ・]/g, '·')
}

const PRODUCT_CATEGORY_BY_KEY = new Map(
  PRODUCT_CATEGORIES.map((category) => [normalizeCategoryName(category), category]),
)

export function canonicalProductCategory(value) {
  const raw = String(value || '').normalize('NFKC').trim()
  return PRODUCT_CATEGORY_BY_KEY.get(normalizeCategoryName(raw)) || raw
}

export const CATEGORIES = [
  { id: 'all', name: '전체상품' },
  { id: 'protein', name: '프로틴', group: '프로틴', subs: [
    { name: '프로틴 음료', db: [PRODUCT_CATEGORY.DRINK, PRODUCT_CATEGORY.DAIRY_ALTERNATIVE] },
    { name: '프로틴 바·스낵', db: [PRODUCT_CATEGORY.PROTEIN_SNACK] },
  ] },
  { id: 'meal', name: '간편식', group: '간편식', subs: [
    { name: '도시락·볶음밥', db: [PRODUCT_CATEGORY.MEAL] },
    { name: '닭가슴살·육류', db: [PRODUCT_CATEGORY.HIGH_PROTEIN_FOOD] },
  ] },
  { id: 'drink', name: '건강음료', group: '건강음료', subs: [
    { name: '대체유', db: [PRODUCT_CATEGORY.DAIRY_ALTERNATIVE] },
    { name: '기능성·스포츠', db: [PRODUCT_CATEGORY.DRINK] },
  ] },
  { id: 'snack', name: '건강간식', group: '건강간식', subs: [
    { name: '견과·건과류', db: [PRODUCT_CATEGORY.NUTS] },
    { name: '시리얼·그래놀라', db: [PRODUCT_CATEGORY.CEREAL] },
  ] },
  { id: 'supplement', name: '영양제', group: '영양제', subs: [
    { name: '비타민', kw: ['비타민'] },
    { name: '오메가3', kw: ['오메가'] },
    { name: '유산균', kw: ['유산균', '바이오틱스'] },
  ] },
  { id: 'sauce', name: PRODUCT_CATEGORY.SAUCE, group: PRODUCT_CATEGORY.SAUCE },
  { id: 'health-food', name: '건강식품', group: '건강식품' },
]

// 실제 "단백질 제품"만 프로틴으로 인정 (고단백 tag 하나만으로 분류하지 않음)
const PROTEIN_PRODUCT_RE = /(프로틴|단백질|단백\s*100|WPI|WPC)/i
```

