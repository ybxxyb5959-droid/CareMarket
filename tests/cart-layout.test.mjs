import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const cartSource = readFileSync(new URL('../src/pages/Cart.jsx', import.meta.url), 'utf8')

test('cart reuses existing analysis with optimistic quantities in every presentation stage', () => {
  assert.doesNotMatch(cartSource, /<details[^>]*className="cart-wellness"/)
  assert.doesNotMatch(cartSource, /<summary>|wellnessOpen|onToggle=/)
  assert.match(cartSource, /<section className="cart-wellness"/)
  assert.match(cartSource, /<CartAiInsight cartOverride=\{displayCart\} \/>/)
})
