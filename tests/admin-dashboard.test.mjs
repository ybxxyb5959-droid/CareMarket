import assert from 'node:assert/strict'
import test from 'node:test'
import { getDashboardMetrics, LOW_STOCK_THRESHOLD, maskDashboardName, koreaDate, salesDateRange, validSalesRange, salesChange } from '../src/lib/admin-dashboard.js'
import { adminOrdersUrl, parseAppLocation, viewUrl } from '../src/lib/navigation.js'

test('dashboard metrics use fulfillment orders and exclude pending orders', () => {
  const today = new Date().toISOString()
  const yesterday = new Date(Date.now() - 86_400_000).toISOString()
  const metrics = getDashboardMetrics({
    products: [{ stock: LOW_STOCK_THRESHOLD }, { stock: LOW_STOCK_THRESHOLD + 1 }, { stock: 0 }],
    orders: [
      { status: 'paid', total_price: 18900, created_at: today },
      { status: 'preparing', total_price: 22000, created_at: today },
      { status: 'pending', total_price: 99000, created_at: today },
      { status: 'delivered', total_price: 12000, created_at: yesterday },
    ],
    inquiries: [{ status: 'received' }, { status: 'in_progress' }, { status: 'answered' }, { status: 'unknown' }],
    partnerships: [{ status: 'new' }, { status: 'reviewing' }],
  })

  assert.equal(metrics.todayOrders, 2)
  assert.equal(metrics.todayPayment, 40_900)
  assert.equal(metrics.preparingOrders, 1)
  assert.equal(metrics.pendingOrders, 1)
  assert.equal(metrics.waitingInquiries, 2)
  assert.equal(metrics.newPartnerships, 1)
  assert.equal(metrics.lowStockProducts, 2)
})

test('dashboard masks names without exposing extra customer details', () => {
  assert.equal(maskDashboardName('박민수'), '박○○')
  assert.equal(maskDashboardName('김'), '김')
  assert.equal(maskDashboardName(''), '회원')
})

test('dashboard pending attention item reuses the existing orders filter route', () => {
  assert.equal(adminOrdersUrl({ status: 'pending' }), '/admin/orders?status=pending')
  assert.equal(adminOrdersUrl(), '/admin/orders')
})

test('sales ranges include today and use Korea midnight, including leap days', () => {
  assert.equal(koreaDate('2026-09-05T15:00:00Z'), '2026-09-06')
  assert.deepEqual(salesDateRange(7, '2026-09-05T15:00:00Z'), { start: '2026-08-31', end: '2026-09-06' })
  assert.deepEqual(salesDateRange(30, '2024-03-01T00:00:00Z'), { start: '2024-02-01', end: '2024-03-01' })
  assert.equal(validSalesRange({ start: '2026-02-30', end: '2026-03-01' }), false)
  assert.equal(validSalesRange({ start: '2026-09-06', end: '2026-09-05' }), false)
  assert.equal(validSalesRange({ start: '2026-09-06', end: '2026-09-06' }), true)
})

test('today metrics prefer paid time over old checkout creation time', () => {
  const metrics = getDashboardMetrics({ orders: [
    { status: 'paid', created_at: '2000-01-01', paid_at: new Date().toISOString(), total_price: 2000 },
    { status: 'paid', created_at: new Date().toISOString(), paid_at: '2000-01-01', total_price: 9000 },
  ] })
  assert.equal(metrics.todayPayment, 2000)
  assert.equal(metrics.todayOrders, 1)
})

test('history route survives refresh and comparisons do not divide by zero', () => {
  assert.equal(viewUrl('adminHistory'), '/admin/history')
  assert.equal(parseAppLocation({ pathname: '/admin/history', search: '?start=2026-09-01&end=2026-09-06' }).view, 'adminHistory')
  assert.equal(salesChange(120, 100), '직전 기간 대비 +20.0%')
  assert.equal(salesChange(0, 100), '직전 기간 대비 -100.0%')
  assert.equal(salesChange(100, 0), '직전 기간 실적 없음')
  assert.equal(salesChange(0, 0), '직전 기간 대비 0%')
})
