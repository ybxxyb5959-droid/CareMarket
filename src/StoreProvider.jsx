import { useMemo, useState } from 'react'
import { StoreContext } from './store'
import { INITIAL_ORDERS, INITIAL_USER, PRODUCTS } from './data/mock'

const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

// Mock AI 자연어 검색: 대표 예시 문장을 조건으로 해석 (추후 Gemini + Supabase로 교체 예정)
function analyzeMockAiQuery(query) {
  const normalized = query.replaceAll(' ', '')

  if (
    (normalized.includes('당류낮') || normalized.includes('저당'))
    && (normalized.includes('단백질높') || normalized.includes('고단백'))
    && normalized.includes('간식')
  ) {
    return {
      conditions: ['간식', '당류 ≤ 5g', '단백질 ≥ 15g'],
      matches: (product) => product.name.includes('프로틴바') && product.nutrition.sugar <= 5 && product.nutrition.protein >= 15,
    }
  }

  if (normalized.includes('나트륨낮') || normalized.includes('저염')) {
    return {
      conditions: ['식품', '나트륨 ≤ 250mg'],
      matches: (product) => product.category !== '영양제 탐색' && product.nutrition.sodium <= 250,
    }
  }

  if (normalized.includes('카페인없') && normalized.includes('영양제')) {
    return {
      conditions: ['영양제', '카페인 제외'],
      matches: (product) => product.category === '영양제 탐색' && !product.caffeine,
    }
  }

  return {
    conditions: ['입력한 조건'],
    message: '검색 조건을 임시 분석했습니다.',
    matches: () => true,
  }
}

export function StoreProvider({ children }) {
  const [view, setView] = useState('main')
  const [selectedProduct, setSelectedProduct] = useState(PRODUCTS[1])

  // 맞춤 조건
  const [goal, setGoal] = useState('식단 영양 관리')
  const [subFilters, setSubFilters] = useState(['저당'])
  const [allergies, setAllergies] = useState([])
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('recommend')

  // 검색 모드: 'normal'(상품명/카테고리) | 'ai'(자연어 조건). 사용자가 직접 전환
  const [searchMode, setSearchMode] = useState('normal')
  const [aiQuery, setAiQuery] = useState('')
  const [aiResult, setAiResult] = useState(null)

  // 커머스 상태
  const [wishlist, setWishlist] = useState([1, 2])
  const [cart, setCart] = useState([
    { product: PRODUCTS[1], quantity: 2 },
    { product: PRODUCTS[3], quantity: 1 },
  ])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [orders, setOrders] = useState(INITIAL_ORDERS)
  const [products, setProducts] = useState(PRODUCTS)
  const [user, setUser] = useState(INITIAL_USER)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // 토스트
  const [toast, setToast] = useState(null)

  const showToast = (msg) => {
    setToast(msg)
    window.clearTimeout(showToast._t)
    showToast._t = window.setTimeout(() => setToast(null), 2800)
  }

  const navigate = (v) => {
    setView(v)
    scrollTop()
  }

  const openProduct = (product) => {
    setSelectedProduct(product)
    setView('detail')
    scrollTop()
  }

  const runAiSearch = (raw) => {
    const query = (raw ?? aiQuery).trim()
    if (!query) return
    setAiQuery(query)
    setSearchMode('ai')
    setAiResult({ query, ...analyzeMockAiQuery(query) })
    setView('main')
    scrollTop()
  }

  const clearAiSearch = () => {
    setAiResult(null)
    setAiQuery('')
    setSearchMode('normal')
  }

  const toggleWish = (id) => {
    setWishlist((prev) => {
      const has = prev.includes(id)
      showToast(has ? '위시리스트에서 제외했습니다.' : '위시리스트에 저장했습니다.')
      return has ? prev.filter((x) => x !== id) : [...prev, id]
    })
  }

  const addToCart = (product, count = 1) => {
    setCart((prev) => {
      const found = prev.find((i) => i.product.id === product.id)
      if (found) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + count } : i,
        )
      }
      return [...prev, { product, quantity: count }]
    })
    showToast(`장바구니에 담았습니다 · ${product.name.slice(0, 14)}…`)
    setDrawerOpen(true)
  }

  const setQty = (id, q) =>
    setCart((prev) =>
      prev.map((i) => (i.product.id === id ? { ...i, quantity: Math.max(1, q) } : i)),
    )

  const removeFromCart = (id) => setCart((prev) => prev.filter((i) => i.product.id !== id))

  const toggleAllergy = (a) =>
    setAllergies((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]))

  const toggleSub = (tag) =>
    setSubFilters((prev) => (prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]))

  const cartTotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0)
  const deliveryFee = cartTotal >= 40000 || cartTotal === 0 ? 0 : 3000
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)

  const checkout = () => {
    if (cart.length === 0) return
    const newOrder = {
      id: `ORD-20260903-${Math.floor(1000 + Math.random() * 9000)}`,
      date: '2026. 09. 03  방금',
      status: '결제완료',
      active: true,
      totalAmount: cartTotal + deliveryFee,
      items: cart.map((c) => ({ name: c.product.name, count: c.quantity, price: c.product.price })),
      tracker: '우체국 안심콜드체인 대기',
    }
    setOrders((prev) => [newOrder, ...prev])
    setCart([])
    setDrawerOpen(false)
    navigate('orders')
    showToast('주문이 완료되었습니다! (가상 결제)')
  }

  const updateOrderStatus = (id, status, active) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status, active } : o)))
    showToast(`${id} · ${status} 처리되었습니다.`)
  }

  const login = () => {
    setUser(INITIAL_USER)
    setIsLoggedIn(true)
    navigate('main')
    showToast(`${INITIAL_USER.name} 님, 환영합니다.`)
  }

  const logout = () => {
    setIsLoggedIn(false)
    navigate('main')
    showToast('로그아웃되었습니다.')
  }

  const value = useMemo(
    () => ({
      view, navigate, setView,
      selectedProduct, openProduct, setSelectedProduct,
      goal, setGoal,
      subFilters, setSubFilters, toggleSub,
      allergies, setAllergies, toggleAllergy,
      search, setSearch,
      searchMode, setSearchMode, aiQuery, setAiQuery, aiResult, runAiSearch, clearAiSearch,
      sortBy, setSortBy,
      wishlist, toggleWish,
      cart, addToCart, setQty, removeFromCart,
      drawerOpen, setDrawerOpen,
      orders, checkout, updateOrderStatus,
      products, setProducts,
      user, setUser, login, logout, isLoggedIn,
      cartTotal, deliveryFee, cartCount,
      toast, showToast,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view, selectedProduct, goal, subFilters, allergies, search, searchMode, aiQuery, aiResult, sortBy, wishlist, cart, drawerOpen, orders, products, user, isLoggedIn, toast],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
