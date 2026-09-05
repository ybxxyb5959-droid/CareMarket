import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fetchWishlistIds, saveWishlistItem } from '../src/lib/wishlist.js'

function query(result) {
  const chain = {
    select() { return chain },
    eq() { return chain },
    order() { return Promise.resolve(result) },
    upsert() { return Promise.resolve(result) },
    delete() { return chain },
    then(resolve) { return Promise.resolve(result).then(resolve) },
  }
  return chain
}

test('wishlist reads only the authenticated owner query result', async () => {
  const calls = []
  const client = { from(table) { calls.push(['from', table]); const q = query({ data: [{ product_id: 7 }, { product_id: 3 }], error: null }); const eq = q.eq; q.eq = (...args) => { calls.push(['eq', ...args]); return eq.apply(q, args) }; return q } }
  assert.deepEqual(await fetchWishlistIds(client, 'user-a'), [7, 3])
  assert.deepEqual(calls, [['from', 'wishlist_items'], ['eq', 'user_id', 'user-a']])
})

test('wishlist validates product ids and requires an owner', async () => {
  await assert.rejects(saveWishlistItem({}, null, 1, true), /AUTH_REQUIRED/)
  await assert.rejects(saveWishlistItem({}, 'user-a', 0, true), /INVALID_PRODUCT_ID/)
})

test('wishlist migration keeps RLS enabled with owner-scoped write policies', () => {
  const sql = fs.readFileSync(new URL('../supabase/migrations/20260905000500_wishlist_items.sql', import.meta.url), 'utf8')
  assert.match(sql, /create table if not exists public\.wishlist_items/i)
  assert.match(sql, /alter table public\.wishlist_items enable row level security/i)
  assert.match(sql, /for insert[\s\S]*with check \(user_id = auth\.uid\(\)\)/i)
  assert.match(sql, /for delete[\s\S]*using \(user_id = auth\.uid\(\)\)/i)
  assert.doesNotMatch(sql, /disable row level security|drop table|drop column/i)
})

test('orders query includes the purchase-time shipping snapshot', () => {
  const source = fs.readFileSync(new URL('../src/lib/orders.js', import.meta.url), 'utf8')
  for (const field of ['recipient_name', 'recipient_phone', 'postal_code', 'address', 'address_detail', 'delivery_request']) {
    assert.match(source, new RegExp(`\\b${field}\\b`))
  }
})
