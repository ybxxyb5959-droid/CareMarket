import { isFulfillmentOrder } from './admin-validation.js'

// Dashboard display 기준. 재고 운영 기준이 정해지면 이 값만 실제 정책으로 교체합니다.
export const LOW_STOCK_THRESHOLD = 5

// 운영 DB와 분리된 UI 데모 데이터입니다. 실제 주문/상품 데이터에는 쓰지 않습니다.
export const MOCK_PAYMENT_CHART_DATA = [
  { label: '월', value: 18200 },
  { label: '화', value: 24600 },
  { label: '수', value: 15800 },
  { label: '목', value: 31400 },
  { label: '금', value: 22700 },
  { label: '토', value: 28900 },
  { label: '오늘', value: 19600 },
]

export const MOCK_CATEGORY_SALES_DATA = [
  { label: '프로틴 · 간편식', value: 42 },
  { label: '건강간식', value: 34 },
  { label: '건강음료', value: 28 },
  { label: '영양제', value: 22 },
  { label: '소스 · 조미료', value: 16 },
  { label: '건강식품', value: 12 },
]

const dateIsToday = (value) => {
  const date = new Date(value)
  const now = new Date()
  return date.toLocaleDateString('ko-KR') === now.toLocaleDateString('ko-KR')
}

export function maskDashboardName(value) {
  const name = String(value || '').trim()
  if (!name) return '회원'
  if (name.length === 1) return name
  return `${name[0]}${'○'.repeat(Math.min(name.length - 1, 2))}`
}

export function getDashboardMetrics({ products = [], orders = [], partnerships = [], inquiries = [] } = {}) {
  const fulfillmentOrders = orders.filter(isFulfillmentOrder)
  const todayOrders = fulfillmentOrders.filter((order) => dateIsToday(order.created_at))
  return {
    todayOrders: todayOrders.length,
    todayPayment: todayOrders.reduce((total, order) => total + Number(order.total_price || 0), 0),
    preparingOrders: orders.filter((order) => order.status === 'preparing').length,
    pendingOrders: orders.filter((order) => order.status === 'pending').length,
    waitingInquiries: inquiries.filter((inquiry) => ['received', 'in_progress'].includes(inquiry.status)).length,
    newPartnerships: partnerships.filter((inquiry) => inquiry.status === 'new').length,
    lowStockProducts: products.filter((product) => Number(product.stock) <= LOW_STOCK_THRESHOLD).length,
  }
}
