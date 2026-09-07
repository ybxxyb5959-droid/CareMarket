import test from 'node:test'
import assert from 'node:assert/strict'
import { demoSupplements, appendDemoSupplements, withDemoSupplementActives } from '../src/data/demo-supplements.js'
import { filterAndSort } from '../src/lib/catalog.js'
import { measuredSupplementIngredients, comparisonPolicy, supplementComparisonRows, supplementCardDescription } from '../supabase/functions/_shared/product-type.js'
import { analyzeCartNutrition } from '../supabase/functions/_shared/cart-nutrition-analysis.js'
const options = { shopCategory: '영양제', shopSub: '전체', subFilters: [], allergies: [], sortBy: 'recommend' }
test('each purchase goal prioritizes its representative; exploration keeps default order', () => {
  for (const product of demoSupplements) assert.equal(filterAndSort(demoSupplements, {...options, goal: product.demoGoal})[0].id, product.id)
  assert.deepEqual(filterAndSort([...demoSupplements].reverse(), {...options, goal: '영양제 탐색'}).map(p=>p.id), demoSupplements.map(p=>p.id))
})
test('demo fallback never overwrites real products or measured demo data', () => {
  const real = { ...demoSupplements[0], isDemoProduct: false, mainIngredients: [] }
  assert.equal(withDemoSupplementActives(real), real)
  const measured = { ...demoSupplements[0], mainIngredients: ['크레아틴 123mg'] }
  assert.equal(withDemoSupplementActives(measured), measured)
  assert.equal(appendDemoSupplements([measured]).filter(p=>p.demoGoal === measured.demoGoal).length, 1)
  assert.ok(demoSupplements.every(p=>p.isDemoIngredientData && measuredSupplementIngredients(p).length))
})
test('missing values never create dosage rows and cards show at most two ingredients', () => {
  const p = { ...demoSupplements[0], mainIngredients: [null, undefined, '', '비타민E 미등록', '아연', '크레아틴 3,000mg', '카테킨 300mg', '기타 1mg'] }
  assert.equal(measuredSupplementIngredients(p).length, 3)
  assert.equal(supplementComparisonRows([p]).length, 3)
  assert.equal(supplementCardDescription(p).split(' · ').length, 2)
})
test('all supplements including identical ingredient sets have no winner and remain supplementary in carts', () => {
  for (const p of demoSupplements) {
    assert.equal(comparisonPolicy([p, {...p,id:999}], p.demoGoal).allowWinner, false)
    const analysis = analyzeCartNutrition([{ product: p, quantity: 1 }], { primaryGoal: p.demoGoal })
    assert.equal(analysis.productReasons[0].group, '보조 영양 상품')
    assert.equal(analysis.productReasons[0].checks.length, 0)
  }
})
