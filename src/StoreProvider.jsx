import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { StoreContext } from './store'
import { supabase } from './lib/supabase'
import { adaptProductRow, fetchActiveProducts } from './lib/products'
import { calculateCartPricing, createCartController, EMPTY_CART } from './lib/cart'
import { AI_SORT_TO_UI, conditionLabels, requestAiConditions } from './lib/ai-search'
import { fetchWishlistIds, saveWishlistItem } from './lib/wishlist'
import { catalogUrl, parseAppLocation, productUrl, viewUrl } from './lib/navigation'

const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

const DEFAULT_GOAL = '식단 영양 관리'
const DEFAULT_SUB_FILTERS = []
const EMPTY_PROFILE = { phone: '', postalCode: '', address: '', addressDetail: '' }

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
  const initialRoute = useMemo(() => parseAppLocation(window.location), [])
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
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  // 배송 자동입력 등에 쓰는 회원 연락처 정보 (마이그레이션 적용 전에는 빈 값)
  const [profile, setProfile] = useState(EMPTY_PROFILE)

  // 토스트
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)
  const loggingOut = useRef(false)

  // kind: 'default'(우측 하단 · 일반 쇼핑) | 'auth'(상단 중앙 성공) | 'auth-error'(상단 중앙 실패)
  const showToast = useCallback((msg, kind = 'default', action = null) => {
    setToast({ msg, kind, action })
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), kind.startsWith('auth') ? 3200 : 2800)
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
    setAuthLoading(false)
    const nextId = session?.user?.id || null
    if (cartController.getOwner() !== nextId) {
      cartController.setOwner(nextId)
      setWishlist([])
      setProfile(EMPTY_PROFILE)
      wishlistPending.current.clear()
      setDrawerOpen(false)
      setLoginPromptOpen(false)
      setToast(null)
    }
    if (session?.user) {
      setUser(toAppUser(session.user))
      setIsLoggedIn(true)
      setAuthUserId(session.user.id)
      setProfileLoading(true)
      return
    }

    setUser(null)
    setIsLoggedIn(false)
    setAuthUserId(null)
    setSettingsLoading(false)
    setProfileLoading(false)
    setIsAdmin(false)
    setProfile(EMPTY_PROFILE)
    setGoal(DEFAULT_GOAL)
    setSubFilters(DEFAULT_SUB_FILTERS)
    setAllergies([])
  }, [cartController])

  useEffect(() => {
    let active = true
    if (!authUserId) return () => { active = false }
    fetchWishlistIds(supabase, authUserId)
      .then((ids) => { if (active) setWishlist(ids) })
      .catch((error) => {
        if (!active) return
        console.error('Supabase wishlist fetch failed:', { code: error?.code || 'WISHLIST_FETCH_FAILED' })
        showToast('찜한 상품을 불러오지 못했습니다.')
      })
    return () => { active = false }
  // showToast is intentionally excluded: the load is scoped to the authenticated owner.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId])

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
        const routeProductId = parseAppLocation(window.location).productId
        setProducts(nextProducts)
        setSelectedProduct((current) => routeProductId
          ? (productsById.get(routeProductId) || null)
          : (productsById.get(current?.id) || nextProducts[0]))
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
        setAuthLoading(false)
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
      setProfileLoading(true)

      const [profileResult, preferencesResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('display_name, primary_goal, role')
          .eq('user_id', authUserId)
          .single(),
        supabase
          .from('user_preferences')
          .select('low_sugar, low_sodium, high_protein, exclude_caffeine, excluded_allergens')
          .eq('user_id', authUserId)
          .maybeSingle(),
      ])

      if (!mounted) return

      if (profileResult.error) {
        const error = profileResult.error
        showToast(`맞춤 설정을 불러오지 못했습니다. ${error.message}`)
        setSettingsLoading(false)
        setProfileLoading(false)
        setIsAdmin(false)
        return
      }

      const isAdminUser = profileResult.data.role === 'admin'
      setIsAdmin(isAdminUser)

      if (isAdminUser && !window.location.pathname.startsWith('/payment/')) {
        const currentRoute = parseAppLocation(window.location)
        const adminView = ['adminProducts', 'adminOrders', 'adminPartnerships'].includes(currentRoute.view)
          ? currentRoute.view
          : 'adminProducts'
        const adminUrl = viewUrl(adminView)
        window.history.replaceState({ ...window.history.state, view: adminView, scrollY: 0 }, '', adminUrl)
        setView(adminView)
        scrollTop()
      }

      if (preferencesResult.error) {
        showToast(`맞춤 설정을 불러오지 못했습니다. ${preferencesResult.error.message}`)
        setSettingsLoading(false)
        setProfileLoading(false)
        return
      }

      const loadedGoal = DB_TO_GOAL[profileResult.data.primary_goal] || null
      const loadedPreferences = toPreferenceState(preferencesResult.data)

      setUser((current) => current && profileResult.data.display_name
        ? { ...current, name: profileResult.data.display_name }
        : current)
      setGoal(loadedGoal)
      setSubFilters(loadedPreferences.subFilters)
      setAllergies(loadedPreferences.allergies)
      setSettingsLoading(false)
      setProfileLoading(false)

      // 연락처 컬럼은 별도 마이그레이션으로 추가된다. 해당 마이그레이션이 아직
      // 적용되지 않은 환경에서도 role 조회와 관리자 권한 판별은 정상 동작해야 한다.
      supabase
        .from('profiles')
        .select('phone, postal_code, address, address_detail')
        .eq('user_id', authUserId)
        .maybeSingle()
        .then(({ data, error }) => {
          if (!mounted || error || !data) return
          setProfile({
            phone: data.phone || '',
            postalCode: data.postal_code || '',
            address: data.address || '',
            addressDetail: data.address_detail || '',
          })
        })

      // 조건 미설정 회원은 설정을 강제하지 않고 맞춤 상품 화면으로 안내한다.
      // (맞춤 상품 화면에서 '추천 조건 설정하기'로 자연스럽게 설정 화면으로 이동)
      if (!loadedGoal && !isAdminUser && !window.location.pathname.startsWith('/payment/')) {
        setView('custom')
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

  const rememberScroll = () => {
    window.history.replaceState({ ...window.history.state, view, scrollY: window.scrollY }, '', window.location.href)
  }
  const catalogStateUrl = () => catalogUrl({ search, searchMode, aiQuery, shopCategory, shopSub, dealsOnly, sortBy })
  const navigate = (v) => {
    if (['adminProducts', 'adminOrders', 'adminPartnerships'].includes(v) && !authLoading && !isAdmin) {
      showToast('관리자 권한이 필요한 페이지입니다.')
      setView('main')
      window.history.pushState({ view: 'main', scrollY: 0 }, '', '/')
      scrollTop()
      return
    }
    rememberScroll()
    const nextUrl = v === 'products' ? catalogStateUrl() : viewUrl(v)
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
    navigate('products')
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

  const toggleWish = async (id) => {
    if (!authUserId) {
      showToast('로그인 후 상품을 찜할 수 있습니다.')
      navigate('login')
      return false
    }
    if (wishlistPending.current.has(id)) return false
    wishlistPending.current.add(id)
    const has = wishlist.includes(id)
    setWishlist((current) => has ? current.filter((item) => item !== id) : [id, ...current])
    try {
      await saveWishlistItem(supabase, authUserId, id, !has)
      showToast(has ? '찜한 상품에서 제외했습니다.' : '찜한 상품에 저장했습니다.')
      return true
    } catch (error) {
      console.error('Supabase wishlist update failed:', { code: error?.code || 'WISHLIST_UPDATE_FAILED' })
      setWishlist((current) => has ? [id, ...current.filter((item) => item !== id)] : current.filter((item) => item !== id))
      showToast('찜한 상품을 변경하지 못했습니다.')
      return false
    } finally {
      wishlistPending.current.delete(id)
    }
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

    // 저장 후 홈이 아닌 맞춤 상품 화면으로 돌려보내 변경된 조건의 결과를 바로 확인하게 한다.
    navigate('custom')
    showToast('맞춤 웰빙 설정이 반영되었습니다.')
    return true
  }

  const login = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      console.error('Supabase sign in failed:', error?.message)
      showToast('로그인에 실패했습니다. 이메일 또는 비밀번호를 확인해주세요.', 'auth-error')
      return false
    }

    syncAuthSession(data.session)
    navigate('main')
    const displayName = data.user?.user_metadata?.display_name?.trim()
    showToast(displayName ? `${displayName}님, 안녕하세요.` : '안녕하세요.', 'auth')
    return true
  }

  const register = async ({
    email, password, displayName,
    phone, postalCode, address, addressDetail,
    termsAgreed, privacyAgreed, marketingAgreed,
  }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          phone: phone || '',
          postal_code: postalCode || '',
          address: address || '',
          address_detail: addressDetail || '',
          terms_agreed: Boolean(termsAgreed),
          privacy_agreed: Boolean(privacyAgreed),
          marketing_agreed: Boolean(marketingAgreed),
        },
      },
    })

    if (error) {
      console.error('Supabase sign up failed:', error?.message)
      showToast('회원가입에 실패했습니다.', 'auth-error')
      const isDuplicateEmail = error.code === 'user_already_exists'
        || /already (registered|exists)/i.test(error.message || '')
      return { ok: false, reason: isDuplicateEmail ? 'duplicate-email' : 'failed' }
    }

    if (data.session) {
      syncAuthSession(data.session)
      navigate('goalSetup')
      showToast('회원가입이 완료되었습니다.', 'auth')
    } else {
      navigate('login')
      showToast('가입 확인 이메일을 보냈습니다. 인증 후 로그인해 주세요.', 'auth')
    }

    return { ok: true }
  }

  // 가입 폼 실시간 이메일 중복 확인. 마이그레이션(email_exists RPC) 미적용 시 null 반환 → 라이브 안내 생략.
  const checkEmailExists = async (email) => {
    const value = (email || '').trim()
    if (!value) return null
    const { data, error } = await supabase.rpc('email_exists', { p_email: value })
    if (error) return null
    return Boolean(data)
  }

  const updateProfile = async ({ displayName, phone, postalCode, address, addressDetail }) => {
    if (!authUserId) {
      showToast('로그인 후 회원정보를 수정할 수 있습니다.', 'auth-error')
      return false
    }
    const name = (displayName || '').trim()
    if (!name) {
      showToast('이름을 입력해 주세요.')
      return false
    }

    const { error } = await supabase.rpc('update_my_profile', {
      p_display_name: name,
      p_phone: (phone || '').trim() || null,
      p_postal_code: (postalCode || '').trim() || null,
      p_address: (address || '').trim() || null,
      p_address_detail: (addressDetail || '').trim() || null,
    })

    if (error) {
      showToast(`회원정보를 저장하지 못했습니다. ${error.message}`, 'auth-error')
      return false
    }

    setUser((current) => (current ? { ...current, name } : current))
    setProfile({
      phone: (phone || '').trim(),
      postalCode: (postalCode || '').trim(),
      address: (address || '').trim(),
      addressDetail: (addressDetail || '').trim(),
    })
    showToast('회원정보가 저장되었습니다.', 'auth')
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
      showToast('로그아웃에 실패했습니다.', 'auth-error')
      return false
    }

    syncAuthSession(null)
    navigate('main')
    showToast('로그아웃되었습니다.', 'auth')
    return true
  }

  const value = useMemo(
    () => ({
      view, navigate, navigateToCatalog, setView,
      selectedProduct, openProduct, setSelectedProduct,
      goal, setGoal, saveWellnessSettings, settingsLoading,
      subFilters, setSubFilters, toggleSub,
      allergies, setAllergies, toggleAllergy,
      search, setSearch,
      searchMode, setSearchMode, aiQuery, setAiQuery, aiResult, aiLoading, aiError, runAiSearch, clearAiSearch,
      shopCategory, setShopCategory, shopSub, setShopSub, dealsOnly, setDealsOnly,
      sortBy, setSortBy,
      wishlist, toggleWish,
      cart, addToCart, changeCartQty, removeFromCart, cartLoading, cartPending, cartError,
      reloadCart: cartController.load, requireCartLogin, loginPromptOpen, setLoginPromptOpen,
      drawerOpen, setDrawerOpen,
      checkout,
      products, setProducts, productsLoading, productsError, reloadProducts,
      user, setUser, login, register, logout, isLoggedIn, authUserId, authLoading, profileLoading, isAdmin,
      profile, updateProfile, checkEmailExists,
      cartTotal, deliveryFee, cartCount,
      toast, showToast,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view, selectedProduct, goal, subFilters, allergies, search, searchMode, aiQuery, aiResult, aiLoading, aiError, shopCategory, shopSub, dealsOnly, sortBy, wishlist, cart, cartState, loginPromptOpen, drawerOpen, products, productsLoading, productsError, user, isLoggedIn, authUserId, authLoading, settingsLoading, profileLoading, isAdmin, profile, toast],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
