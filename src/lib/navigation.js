const VIEW_PATHS = {
  main: '/',
  products: '/products',
  goalSetup: '/goals',
  cart: '/cart',
  checkout: '/checkout',
  orders: '/orders',
  mypage: '/mypage',
  login: '/login',
  register: '/register',
  adminProducts: '/admin/products',
  adminOrders: '/admin/orders',
  philosophy: '/about',
  terms: '/terms',
  privacy: '/privacy',
  cleanLabel: '/clean-label',
  support: '/support',
  paymentSuccess: '/payment/success',
  paymentFail: '/payment/fail',
}

const PATH_VIEWS = Object.fromEntries(Object.entries(VIEW_PATHS).map(([view, path]) => [path, view]))

export function parseAppLocation(location) {
  const pathname = location?.pathname || '/'
  const params = new URLSearchParams(location?.search || '')
  const detail = pathname.match(/^\/products\/(\d+)\/?$/)
  if (detail) {
    return { view: 'detail', productId: Number(detail[1]) }
  }
  const isSearch = pathname === '/search'
  const view = isSearch ? 'products' : (PATH_VIEWS[pathname.replace(/\/$/, '') || '/'] || 'main')
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

export function productUrl(productId) {
  const id = Number(productId)
  return Number.isSafeInteger(id) && id > 0 ? `/products/${id}` : '/products'
}
