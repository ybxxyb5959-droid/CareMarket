import { useEffect, useMemo, useState } from 'react'
import { StoreContext } from './store'
import { INITIAL_ORDERS, INITIAL_USER, PRODUCTS } from './data/mock'
import { supabase } from './lib/supabase'

const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

const DEFAULT_GOAL = '식단 영양 관리'
const DEFAULT_SUB_FILTERS = ['저당']

const GOAL_TO_DB = {
  '근육량 증가': 'muscle_gain',
  '체중 관리': 'weight_control',
  '식단 영양 관리': 'nutrition_management',
  '영양제 탐색': 'supplement_search',
}

const DB_TO_GOAL = Object.fromEntries(
  Object.entries(GOAL_TO_DB).map(([label, value]) => [value, label]),
)

function toPreferenceState(preferences) {
  if (!preferences) return { subFilters: [], allergies: [] }

  const subFilters = []
  if (preferences.low_sugar) subFilters.push('저당')
  if (preferences.low_sodium) subFilters.push('저염')
  if (preferences.high_protein) subFilters.push('고단백')
  if (preferences.exclude_caffeine) subFilters.push('카페인 제외')
  if (preferences.excluded_allergens?.length) subFilters.push('알레르기 제외')

  return {
    subFilters,
    allergies: preferences.excluded_allergens || [],
  }
}

function toAppUser(authUser) {
  return {
    ...INITIAL_USER,
    name: authUser.user_metadata?.display_name?.trim() || authUser.email?.split('@')[0] || 'CareMarket 회원',
    email: authUser.email || '',
  }
}

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
  const [goal, setGoal] = useState(DEFAULT_GOAL)
  const [subFilters, setSubFilters] = useState(DEFAULT_SUB_FILTERS)
  const [allergies, setAllergies] = useState([])
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('recommend')

  // 검색 모드: 'normal'(상품명/카테고리) | 'ai'(자연어 조건). 사용자가 직접 전환
  const [searchMode, setSearchMode] = useState('normal')
  const [aiQuery, setAiQuery] = useState('')
  const [aiResult, setAiResult] = useState(null)

  // 상단 제품 카테고리 브라우징 (목표와 별개 축)
  const [shopCategory, setShopCategory] = useState('전체상품')
  const [shopSub, setShopSub] = useState('전체')

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
  const [authUserId, setAuthUserId] = useState(null)
  const [settingsLoading, setSettingsLoading] = useState(false)

  // 토스트
  const [toast, setToast] = useState(null)

  const showToast = (msg) => {
    setToast(msg)
    window.clearTimeout(showToast._t)
    showToast._t = window.setTimeout(() => setToast(null), 2800)
  }

  const syncAuthSession = (session) => {
    if (session?.user) {
      setUser(toAppUser(session.user))
      setIsLoggedIn(true)
      setAuthUserId(session.user.id)
      return
    }

    setUser(INITIAL_USER)
    setIsLoggedIn(false)
    setAuthUserId(null)
    setSettingsLoading(false)
    setGoal(DEFAULT_GOAL)
    setSubFilters(DEFAULT_SUB_FILTERS)
    setAllergies([])
  }

  useEffect(() => {
    let mounted = true

    const restoreSession = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (!mounted) return

      if (error) {
        console.error('Supabase session restore failed:', error.message)
        return
      }

      syncAuthSession(data.session)
    }

    restoreSession()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) syncAuthSession(session)
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!authUserId) return undefined

    let mounted = true

    const loadWellnessSettings = async () => {
      setSettingsLoading(true)

      const [profileResult, preferencesResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('primary_goal')
          .eq('user_id', authUserId)
          .single(),
        supabase
          .from('user_preferences')
          .select('low_sugar, low_sodium, high_protein, exclude_caffeine, excluded_allergens')
          .eq('user_id', authUserId)
          .maybeSingle(),
      ])

      if (!mounted) return

      if (profileResult.error || preferencesResult.error) {
        const error = profileResult.error || preferencesResult.error
        showToast(`맞춤 설정을 불러오지 못했습니다. ${error.message}`)
        setSettingsLoading(false)
        return
      }

      const loadedGoal = DB_TO_GOAL[profileResult.data.primary_goal] || null
      const loadedPreferences = toPreferenceState(preferencesResult.data)

      setGoal(loadedGoal)
      setSubFilters(loadedPreferences.subFilters)
      setAllergies(loadedPreferences.allergies)
      setSettingsLoading(false)

      if (!loadedGoal) {
        setView('goalSetup')
        scrollTop()
      }
    }

    loadWellnessSettings()

    return () => {
      mounted = false
    }
  // 인증 사용자 변경 시에만 DB 설정을 다시 불러온다.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId])

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

  const saveWellnessSettings = async () => {
    if (!authUserId) {
      showToast('로그인 후 맞춤 웰빙 설정을 저장할 수 있습니다.')
      navigate('login')
      return false
    }

    const primaryGoal = GOAL_TO_DB[goal]
    if (!primaryGoal) {
      showToast('핵심 구입 목적을 선택해 주세요.')
      return false
    }

    const { error: goalError } = await supabase.rpc('set_my_primary_goal', {
      goal: primaryGoal,
    })

    if (goalError) {
      showToast(`주목표를 저장하지 못했습니다. ${goalError.message}`)
      return false
    }

    const { error: preferencesError } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: authUserId,
        low_sugar: subFilters.includes('저당'),
        low_sodium: subFilters.includes('저염'),
        high_protein: subFilters.includes('고단백'),
        exclude_caffeine: subFilters.includes('카페인 제외'),
        excluded_allergens: allergies,
      }, { onConflict: 'user_id' })

    if (preferencesError) {
      showToast(`보조조건을 저장하지 못했습니다. ${preferencesError.message}`)
      return false
    }

    navigate('main')
    showToast('맞춤 웰빙 설정이 반영되었습니다.')
    return true
  }

  const login = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      showToast(`로그인에 실패했습니다. ${error.message}`)
      return false
    }

    syncAuthSession(data.session)
    navigate('main')
    showToast(`${toAppUser(data.user).name} 님, 환영합니다.`)
    return true
  }

  const register = async ({ email, password, displayName }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
      },
    })

    if (error) {
      showToast(`회원가입에 실패했습니다. ${error.message}`)
      return false
    }

    if (data.session) {
      syncAuthSession(data.session)
      navigate('goalSetup')
      showToast('가입 완료! 웰빙 목표 설정으로 이동합니다.')
    } else {
      navigate('login')
      showToast('가입 확인 이메일을 보냈습니다. 인증 후 로그인해 주세요.')
    }

    return true
  }

  const logout = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      showToast(`로그아웃에 실패했습니다. ${error.message}`)
      return false
    }

    syncAuthSession(null)
    navigate('main')
    showToast('로그아웃되었습니다.')
    return true
  }

  const value = useMemo(
    () => ({
      view, navigate, setView,
      selectedProduct, openProduct, setSelectedProduct,
      goal, setGoal, saveWellnessSettings, settingsLoading,
      subFilters, setSubFilters, toggleSub,
      allergies, setAllergies, toggleAllergy,
      search, setSearch,
      searchMode, setSearchMode, aiQuery, setAiQuery, aiResult, runAiSearch, clearAiSearch,
      shopCategory, setShopCategory, shopSub, setShopSub,
      sortBy, setSortBy,
      wishlist, toggleWish,
      cart, addToCart, setQty, removeFromCart,
      drawerOpen, setDrawerOpen,
      orders, checkout, updateOrderStatus,
      products, setProducts,
      user, setUser, login, register, logout, isLoggedIn,
      cartTotal, deliveryFee, cartCount,
      toast, showToast,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view, selectedProduct, goal, subFilters, allergies, search, searchMode, aiQuery, aiResult, shopCategory, shopSub, sortBy, wishlist, cart, drawerOpen, orders, products, user, isLoggedIn, authUserId, settingsLoading, toast],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
