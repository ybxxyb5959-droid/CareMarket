import assert from 'node:assert/strict'
import test from 'node:test'
import { NEXT_ORDER_STATUS, validateAdminProduct } from '../src/lib/admin-validation.js'

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
