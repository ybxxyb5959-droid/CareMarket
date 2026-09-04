import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { StoreContext } from './store'
import { INITIAL_ORDERS } from './data/mock'
import { supabase } from './lib/supabase'
import { adaptProductRow, fetchActiveProducts } from './lib/products'
import { createCartController, EMPTY_CART } from './lib/cart'
import { AI_SORT_TO_UI, conditionLabels, requestAiConditions } from './lib/ai-search'

const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

const DEFAULT_GOAL = '식단 영양 관리'
const DEFAULT_SUB_FILTERS = []

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
  // 실제 Supabase auth 사용자만 사용한다. (포인트/쿠폰 등 미구현 필드는 신뢰 가능한 기본값)
  return {
    name: authUser.user_metadata?.display_name?.trim() || authUser.email?.split('@')[0] || 'CareMarket 회원',
    email: authUser.email || '',
    tier: 'CareMarket 회원',
    points: 0,
    coupons: 0,
  }
}

export function StoreProvider({ children }) {
  const [view, setView] = useState('main')
  const [selectedProduct, setSelectedProduct] = useState(null)

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
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(null)
  const aiRequest = useRef(null)

  useEffect(() => () => aiRequest.current?.abort(), [])

  // 상단 제품 카테고리 브라우징 (목표와 별개 축)
  const [shopCategory, setShopCategory] = useState('전체상품')
  const [shopSub, setShopSub] = useState('전체')

  // 커머스 상태
  const [wishlist, setWishlist] = useState([])
  const [cartState, setCartState] = useState(EMPTY_CART)
  const [loginPromptOpen, setLoginPromptOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [orders, setOrders] = useState(INITIAL_ORDERS)
  const [products, setProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [productsError, setProductsError] = useState(null)
  const [productsReloadKey, setProductsReloadKey] = useState(0)
  const [user, setUser] = useState(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [authUserId, setAuthUserId] = useState(null)
  const [settingsLoading, setSettingsLoading] = useState(false)

  // 토스트
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)
  const loggingOut = useRef(false)

  const showToast = useCallback((msg) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2800)
  }, [])
  const cartController = useMemo(() => createCartController(supabase, setCartState, showToast), [showToast])
  const cart = useMemo(() => {
    if (!authUserId || cartState.ownerId !== authUserId) return []
    return cartState.rows.filter(row => row.product?.is_active).map(row => ({
      cartItemId: row.cart_item_id,
      product: adaptProductRow(row.product),
      quantity: row.quantity,
    }))
  }, [authUserId, cartState.ownerId, cartState.rows])
  const cartLoading = Boolean(authUserId && (cartState.ownerId !== authUserId || cartState.loading))
  const cartPending = cartState.ownerId === authUserId ? cartState.pending : 0
  const cartError = cartState.ownerId === authUserId ? cartState.error : null

  const syncAuthSession = useCallback((session) => {
    if (loggingOut.current && session?.user) return
    const nextId = session?.user?.id || null
    if (cartController.getOwner() !== nextId) {
      cartController.setOwner(nextId)
      setDrawerOpen(false)
      setLoginPromptOpen(false)
      setToast(null)
    }
    if (session?.user) {
      setUser(toAppUser(session.user))
      setIsLoggedIn(true)
      setAuthUserId(session.user.id)
      return
    }

    setUser(null)
    setIsLoggedIn(false)
    setAuthUserId(null)
    setSettingsLoading(false)
    setGoal(DEFAULT_GOAL)
    setSubFilters(DEFAULT_SUB_FILTERS)
    setAllergies([])
  }, [cartController])

  useEffect(() => {
    let mounted = true

    const loadProducts = async () => {
      setProductsLoading(true)
      setProductsError(null)

      try {
        const nextProducts = await fetchActiveProducts()
        if (!nextProducts.length) throw new Error('조회 가능한 상품이 없습니다.')
        if (!mounted) return

        const productsById = new Map(nextProducts.map((product) => [product.id, product]))
        setProducts(nextProducts)
        setSelectedProduct((current) => productsById.get(current?.id) || nextProducts[0])
        // 실제 서비스처럼 빈 장바구니/위시리스트로 시작 (임의 mock 항목 미주입)
        setWishlist((current) => current.filter((id) => productsById.has(id)))
      } catch (error) {
        if (!mounted) return
        console.error('Supabase products fetch failed:', error)
        setProducts([])
        setProductsError(error.message || '상품을 불러오지 못했습니다.')
      } finally {
        if (mounted) setProductsLoading(false)
      }
    }

    loadProducts()

    return () => {
      mounted = false
    }
  }, [productsReloadKey])

  const reloadProducts = () => setProductsReloadKey((key) => key + 1)

  useEffect(() => {
    if (!authUserId) return undefined
    void cartController.load()
    const refresh = () => {
      if (document.visibilityState === 'visible') void cartController.load()
    }
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [authUserId, cartController])

  useEffect(() => {
    let mounted = true
    let authChanged = false

    const restoreSession = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (!mounted || authChanged) return

      if (error) {
        console.error('Supabase session restore failed:', error.message)
        return
      }

      syncAuthSession(data.session)
    }

    restoreSession()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      authChanged = true
      if (mounted) syncAuthSession(session)
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
      cartController.setOwner(null)
      window.clearTimeout(toastTimer.current)
    }
  }, [cartController, syncAuthSession])

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
    setView('main')
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

  const clearAiSearch = () => {
    aiRequest.current?.abort()
    aiRequest.current = null
    setAiLoading(false)
    setAiError(null)
    setAiResult(null)
    setAiQuery('')
    setSearchMode('normal')
    if (['protein', 'sugar', 'sodium'].includes(sortBy)) setSortBy('recommend')
  }

  const toggleWish = (id) => {
    setWishlist((prev) => {
      const has = prev.includes(id)
      showToast(has ? '위시리스트에서 제외했습니다.' : '위시리스트에 저장했습니다.')
      return has ? prev.filter((x) => x !== id) : [...prev, id]
    })
  }

  const requireCartLogin = () => {
    if (!loggingOut.current && authUserId && cartController.getOwner() === authUserId) return true
    setDrawerOpen(false)
    setLoginPromptOpen(true)
    return false
  }

  const addToCart = async (product, count = 1) => {
    if (!requireCartLogin()) return false
    const generation = cartController.getGeneration()
    const saved = await cartController.add(product.id, count)
    if (saved && generation === cartController.getGeneration()) {
      showToast(`장바구니에 담았습니다 · ${product.name.slice(0, 14)}…`)
      setDrawerOpen(true)
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

  const cartTotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0)
  const deliveryFee = cartTotal >= 40000 || cartTotal === 0 ? 0 : 3000
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)

  const checkout = () => {
    if (!requireCartLogin() || cart.length === 0 || cartPending || cartLoading) return
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
    // Mock orders must not delete persistent cart rows without a real order transaction.
    setDrawerOpen(false)
    navigate('orders')
    showToast('가상 주문이 생성되었습니다. 실제 장바구니는 유지됩니다.')
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
    if (loggingOut.current) return false
    loggingOut.current = true
    cartController.setOwner(null)
    setDrawerOpen(false)
    setToast(null)
    let error
    try {
      const result = await supabase.auth.signOut()
      error = result.error
    } catch (caught) { error = caught }
    loggingOut.current = false

    if (error) {
      console.error('Supabase sign out failed:', error)
      // Re-read the actual session; never restore a captured previous account.
      try {
        const { data, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError
        syncAuthSession(data.session)
        void cartController.load()
      } catch (sessionError) {
        console.error('Supabase session recovery failed:', sessionError)
        syncAuthSession(null)
      }
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
      searchMode, setSearchMode, aiQuery, setAiQuery, aiResult, aiLoading, aiError, runAiSearch, clearAiSearch,
      shopCategory, setShopCategory, shopSub, setShopSub,
      sortBy, setSortBy,
      wishlist, toggleWish,
      cart, addToCart, changeCartQty, removeFromCart, cartLoading, cartPending, cartError,
      reloadCart: cartController.load, requireCartLogin, loginPromptOpen, setLoginPromptOpen,
      drawerOpen, setDrawerOpen,
      orders, checkout, updateOrderStatus,
      products, setProducts, productsLoading, productsError, reloadProducts,
      user, setUser, login, register, logout, isLoggedIn,
      cartTotal, deliveryFee, cartCount,
      toast, showToast,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view, selectedProduct, goal, subFilters, allergies, search, searchMode, aiQuery, aiResult, aiLoading, aiError, shopCategory, shopSub, sortBy, wishlist, cart, cartState, loginPromptOpen, drawerOpen, orders, products, productsLoading, productsError, user, isLoggedIn, authUserId, settingsLoading, toast],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
