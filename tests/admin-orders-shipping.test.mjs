import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const adminQuerySource = readFileSync(new URL('../src/lib/admin.js', import.meta.url), 'utf8')
const adminOrdersSource = readFileSync(new URL('../src/pages/AdminOrders.jsx', import.meta.url), 'utf8')
const cssSource = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
const shippingMigration = readFileSync(new URL('../supabase/migrations/20260905000400_checkout_shipping_snapshot.sql', import.meta.url), 'utf8')
const adminMigration = readFileSync(new URL('../supabase/migrations/20260905000100_admin_management_rls.sql', import.meta.url), 'utf8')
const checkoutMigration = readFileSync(new URL('../supabase/migrations/20260904000200_checkout_payments.sql', import.meta.url), 'utf8')

const shippingFields = ['recipient_name', 'recipient_phone', 'postal_code', 'address', 'address_detail', 'delivery_request']

test('admin orders query selects every existing order shipping snapshot field', () => {
  for (const field of shippingFields) {
    assert.match(adminQuerySource, new RegExp(`\\b${field}\\b`))
  }
  assert.match(adminQuerySource, /order_items\(product_id, quantity, price_at_order, products\(name, brand\)\)/)
})

test('order detail renders the stored snapshot with an explicit legacy-order empty state', () => {
  for (const field of shippingFields) {
    assert.match(adminOrdersSource, new RegExp(`order\\.${field}\\b`))
  }
  assert.match(adminOrdersSource, /저장된 배송 정보가 없습니다\./)
  assert.match(adminOrdersSource, /주문 당시 단가 \{won\(item\.price_at_order\)\}/)
  assert.doesNotMatch(adminOrdersSource, /localStorage/)
})

test('shipping schema and checkout RPC persist the same snapshot fields selected by admin', () => {
  for (const field of shippingFields) {
    assert.match(shippingMigration, new RegExp(`add column if not exists ${field} text`))
    assert.match(shippingMigration, new RegExp(`insert into public\\.orders \\([\\s\\S]*?${field}`))
  }
  assert.match(shippingMigration, /insert into public\.order_items \(order_id, product_id, quantity, price_at_order\)/)
  assert.doesNotMatch(shippingMigration, /disable row level security/i)
})

test('order and order-item reads remain owner-only or admin-only at the database layer', () => {
  assert.match(checkoutMigration, /create policy orders_select_own[\s\S]*?using \(auth\.uid\(\) = user_id\)/i)
  assert.match(checkoutMigration, /create policy order_items_select_own[\s\S]*?orders\.user_id = auth\.uid\(\)/i)
  assert.match(adminMigration, /create policy orders_select_admin_all[\s\S]*?using \(\(select public\.is_admin\(\)\)\)/i)
  assert.match(adminMigration, /create policy order_items_select_admin_all[\s\S]*?using \(\(select public\.is_admin\(\)\)\)/i)
  assert.doesNotMatch(`${checkoutMigration}\n${adminMigration}`, /disable row level security/i)
})

test('admin order detail wraps long shipping text and collapses for tablet and mobile', () => {
  assert.match(cssSource, /\.admin-order-detail-list dd[\s\S]*?overflow-wrap:\s*anywhere/)
  assert.match(cssSource, /@media \(max-width: 980px\)[\s\S]*?\.admin-order-detail-grid[\s\S]*?grid-template-columns:\s*1fr/)
  assert.match(cssSource, /@media \(max-width: 760px\)[\s\S]*?\.admin-order-detail-list[\s\S]*?grid-template-columns:\s*1fr/)
})
