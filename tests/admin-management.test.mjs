import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { NEXT_ORDER_STATUS, isBulkShippableOrder, summarizeAdminOrders, validateAdminProduct } from '../src/lib/admin-validation.js'

const fulfillmentMigration = readFileSync(new URL('../supabase/migrations/20260905000600_order_fulfillment_bulk.sql', import.meta.url), 'utf8')

const validProduct = {
  name: '관리자 테스트 상품',
  brand: 'CareMarket Test',
  category: '기타 건강식품',
  price: '1000',
  original_price: '1200',
  stock: '3',
  summary: '',
  serving_size: '',
  calories: '10',
  protein: '1',
  carbs: '1',
  fat: '0',
  sugar: '0',
  sodium: '0',
  allergens: ['대두'],
  contains_caffeine: false,
  main_ingredients: '콩, 정제수',
  is_active: true,
  image_url: 'https://images.unsplash.com/photo-1',
}

test('admin product validation normalizes permitted product values', () => {
  const product = validateAdminProduct(validProduct)
  assert.equal(product.price, 1000)
  assert.deepEqual(product.main_ingredients, ['콩', '정제수'])
  assert.deepEqual(product.allergens, ['대두'])
})

test('admin product validation rejects negative values and unknown allergens', () => {
  assert.throws(() => validateAdminProduct({ ...validProduct, stock: '-1' }), /0 이상의 숫자/)
  assert.throws(() => validateAdminProduct({ ...validProduct, allergens: ['토마토'] }), /허용값/)
})

test('only forward paid-order fulfillment transitions are exposed', () => {
  assert.deepEqual(NEXT_ORDER_STATUS, { paid: 'preparing', preparing: 'shipped', shipped: 'delivered' })
  assert.equal(NEXT_ORDER_STATUS.pending, undefined)
  assert.equal(NEXT_ORDER_STATUS.delivered, undefined)
})

test('bulk shipping only accepts preparing orders', () => {
  assert.equal(isBulkShippableOrder({ status: 'preparing' }), true)
  assert.equal(isBulkShippableOrder({ status: 'shipped' }), false)
  assert.equal(isBulkShippableOrder({ status: 'delivered' }), false)
})

test('admin order summary groups non-fulfillment states as needing review', () => {
  assert.deepEqual(summarizeAdminOrders([
    { status: 'pending' },
    { status: 'paid' },
    { status: 'preparing' },
    { status: 'preparing' },
    { status: 'shipped' },
    { status: 'delivered' },
  ]), { total: 6, preparing: 2, shipped: 1, delivered: 1, needsReview: 2 })
})

test('payment finalization advances paid orders to preparing without replacing inventory logic', () => {
  assert.match(fulfillmentMigration, /complete_paid_order_with_inventory\(p_order_id, p_payment_key\)/)
  assert.match(fulfillmentMigration, /set status = 'preparing'[\s\S]*and payment_key = p_payment_key[\s\S]*and status = 'paid'/)
  assert.doesNotMatch(fulfillmentMigration, /delete from public\.orders/i)
})

test('bulk shipping is one guarded preparing-to-shipped update', () => {
  assert.match(fulfillmentMigration, /if not public\.is_admin\(\)/)
  assert.match(fulfillmentMigration, /v_preparing_count <> v_order_count/)
  assert.match(fulfillmentMigration, /set status = 'shipped'[\s\S]*target\.status = 'preparing'/)
})
