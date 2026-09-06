import assert from 'node:assert/strict'
import test from 'node:test'
import { getDashboardMetrics, LOW_STOCK_THRESHOLD, maskDashboardName } from '../src/lib/admin-dashboard.js'
import { adminOrdersUrl } from '../src/lib/navigation.js'

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
