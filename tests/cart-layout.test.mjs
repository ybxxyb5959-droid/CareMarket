import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const cartSource = readFileSync(new URL('../src/pages/Cart.jsx', import.meta.url), 'utf8')

test('cart keeps production analysis and adds midterm simple totals behind the presentation flag', () => {
  assert.doesNotMatch(cartSource, /<details[^>]*className="cart-wellness"/)
  assert.doesNotMatch(cartSource, /<summary>|wellnessOpen|onToggle=/)
  assert.match(cartSource, /<section className="cart-wellness"/)
  assert.match(cartSource, /cartNutritionTotals\(displayCart\)/)
  assert.match(cartSource, /장바구니 영양정보 단순 합계/)
  assert.match(cartSource, /기준 초과·부족은 판단하지 않습니다/)
  assert.match(cartSource, /<CartAiInsight cartOverride=\{displayCart\} \/>/)
  assert.match(cartSource, /IS_MIDTERM_PRESENTATION \? <>/)
})
