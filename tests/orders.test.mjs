import assert from 'node:assert/strict'
import test from 'node:test'
import { fetchMyOrders } from '../src/lib/orders.js'
import fs from 'node:fs'

test('customer order history requests only paid and fulfillment statuses', async () => {
  const calls = []
  const result = { data: [{ order_id: 'paid-order', status: 'paid' }], error: null }
  const query = {
    select() { return query },
    eq(...args) { calls.push(['eq', ...args]); return query },
    in(...args) { calls.push(['in', ...args]); return query },
    order(...args) { calls.push(['order', ...args]); return Promise.resolve(result) },
  }
  const client = {
    from(table) {
      calls.push(['from', table])
      return query
    },
  }

  assert.deepEqual(await fetchMyOrders(client, 'user-a'), result.data)
  assert.deepEqual(calls.find(([method]) => method === 'in'), [
    'in',
    'status',
    ['paid', 'preparing', 'shipped', 'delivered'],
  ])
})

test('order history exposes product detail links and a text receipt with purchase-time amounts', () => {
  const ordersPage = fs.readFileSync(new URL('../src/pages/Orders.jsx', import.meta.url), 'utf8')
  const ordersQuery = fs.readFileSync(new URL('../src/lib/orders.js', import.meta.url), 'utf8')
  assert.match(ordersPage, /order-product-name-link[\s\S]*openProduct\(activeProduct\)/)
  assert.match(ordersPage, /receipt-open-label[^>]*>영수증</)
  for (const label of ['상품금액', '쿠폰할인', '배송비', '결제금액', '배송지']) {
    assert.match(ordersPage, new RegExp(label))
  }
  assert.match(ordersQuery, /\bdiscount_amount\b/)
})
