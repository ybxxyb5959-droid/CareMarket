import assert from 'node:assert/strict'
import test from 'node:test'
import { fetchMyOrders } from '../src/lib/orders.js'

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
