import { isPresentationViewAllowed } from './presentation.js'

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
  adminReviews: '/admin/reviews',
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

export function parseAppLocation(location, presentationStage) {
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
  const requestedView = isSearch ? 'products' : (PATH_VIEWS[pathname] || 'notFound')
  const view = isPresentationViewAllowed(requestedView, presentationStage) ? requestedView : 'notFound'
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

export function viewUrl(view, presentationStage) {
  return isPresentationViewAllowed(view, presentationStage) ? (VIEW_PATHS[view] || '/') : '/'
}

export function adminOrdersUrl({ status } = {}) {
  return status === 'pending' ? '/admin/orders?status=pending' : VIEW_PATHS.adminOrders
}

export function productUrl(productId) {
  const id = Number(productId)
  return Number.isSafeInteger(id) && id > 0 ? `/products/${id}` : '/products'
}
