import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const cartSource = readFileSync(new URL('../src/pages/Cart.jsx', import.meta.url), 'utf8')

test('cart displays composition analysis without nutrient totals', () => {
  assert.doesNotMatch(cartSource, /<details[^>]*className="cart-wellness"/)
  assert.doesNotMatch(cartSource, /<summary>|wellnessOpen|onToggle=/)
  assert.match(cartSource, /<section className="cart-wellness"/)
  assert.doesNotMatch(cartSource, /cartNutritionTotals|ns-cell|총 나트륨|총 당류|총 단백질|총 열량/)
  assert.match(cartSource, /<CartAiInsight cartOverride=\{displayCart\} \/>/)
})
