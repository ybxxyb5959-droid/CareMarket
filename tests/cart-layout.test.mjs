import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const cartSource = readFileSync(new URL('../src/pages/Cart.jsx', import.meta.url), 'utf8')

test('cart nutrition summary and balance analysis are always visible', () => {
  assert.doesNotMatch(cartSource, /<details[^>]*className="cart-wellness"/)
  assert.doesNotMatch(cartSource, /<summary>|wellnessOpen|onToggle=/)
  assert.match(cartSource, /<section className="cart-wellness"/)
  assert.match(cartSource, /내 장바구니 영양 요약/)
  assert.match(cartSource, /<CartAiInsight cartOverride=\{displayCart\} \/>/)
})
