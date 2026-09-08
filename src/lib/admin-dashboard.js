import { isFulfillmentOrder } from './admin-validation.js'

// Dashboard display 기준. 재고 운영 기준이 정해지면 이 값만 실제 정책으로 교체합니다.
export const LOW_STOCK_THRESHOLD = 5

export const koreaDate = (value = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(value))

export function salesDateRange(days = 30, now = new Date()) {
  const end = koreaDate(now)
  const start = new Date(`${end}T00:00:00Z`)
  start.setUTCDate(start.getUTCDate() - days + 1)
  return { start: start.toISOString().slice(0, 10), end }
}

export function validSalesRange({ start, end }) {
  const valid = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString().slice(0, 10) === value
  return valid(start) && valid(end) && end >= start && (Date.parse(end) - Date.parse(start)) / 86400000 < 3660
}

export function salesChange(current, previous) {
  if (!previous) return current ? '직전 기간 실적 없음' : '직전 기간 대비 0%'
  const change = (current - previous) / previous * 100
  return `직전 기간 대비 ${change > 0 ? '+' : ''}${change.toFixed(1)}%`
}

const dateIsToday = (value) => {
  return value && koreaDate(value) === koreaDate()
}

export function maskDashboardName(value) {
  const name = String(value || '').trim()
  if (!name) return '회원'
  if (name.length === 1) return name
  return `${name[0]}${'○'.repeat(Math.min(name.length - 1, 2))}`
}

export function getDashboardMetrics({ products = [], orders = [], partnerships = [], inquiries = [], reviewReports = [] } = {}) {
  const fulfillmentOrders = orders.filter(isFulfillmentOrder)
  const todayOrders = fulfillmentOrders.filter((order) => dateIsToday(order.paid_at || order.created_at))
  return {
    waitingReviewReports: reviewReports.filter(report => report.status === 'received').length,
    todayOrders: todayOrders.length,
    todayPayment: todayOrders.reduce((total, order) => total + Number(order.total_price || 0), 0),
    preparingOrders: orders.filter((order) => order.status === 'preparing').length,
    pendingOrders: orders.filter((order) => order.status === 'pending').length,
    waitingInquiries: inquiries.filter((inquiry) => ['received', 'in_progress'].includes(inquiry.status)).length,
    newPartnerships: partnerships.filter((inquiry) => inquiry.status === 'new').length,
    lowStockProducts: products.filter((product) => Number(product.stock) <= LOW_STOCK_THRESHOLD).length,
  }
}
