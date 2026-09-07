import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { registeredSupplementIngredients, measuredSupplementIngredients, usesCatalogDemoActives, supplementComparisonRows } from '../supabase/functions/_shared/product-type.js'
const catalog = JSON.parse(fs.readFileSync(new URL('../data/products.seed.json', import.meta.url))).map((p, i) => ({ ...p, product_id: i + 1 }))
test('all existing fictional supplements have measured actives without changing raw registrations', () => {
  const original = JSON.stringify(catalog)
  for (const product of catalog.filter(p => p.category === '영양제·비타민')) {
    assert.ok(measuredSupplementIngredients(product).length, product.name)
    assert.equal(usesCatalogDemoActives(product), [71,79].includes(product.product_id))
  }
  assert.equal(JSON.stringify(catalog), original)
  assert.equal(registeredSupplementIngredients(catalog[70]).some(p=>p.amount), false)
  assert.equal(supplementComparisonRows([catalog[70], catalog[78]]).length, 8)
})
test('registered amounts and unrelated products never receive catalog mock amounts', () => {
  for (const product of [
    { ...catalog[70], main_ingredients: ['비타민C 250mg'] },
    { ...catalog[70], name: '새 상품' },
    { ...catalog[70], product_id: 9999 },
    { ...catalog[70], category: '일반 식품' },
  ]) assert.equal(usesCatalogDemoActives(product), false)
  assert.equal(measuredSupplementIngredients({ ...catalog[70], main_ingredients: ['비타민C 250mg'] })[0].amount, '250mg')
})
