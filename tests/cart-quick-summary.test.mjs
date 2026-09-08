import test from 'node:test'
import assert from 'node:assert/strict'
import { cartQuickSummary } from '../src/lib/cart-quick-summary.js'
import { analyzeCartNutrition, composeCartInsight, cartAnalysisBasis, reconcileCartInsight, isCartInsight } from '../supabase/functions/_shared/cart-nutrition-analysis.js'
const food = (id, extra = {}) => ({ product: { id, name: `상품 ${id}`, category: '일반 식품', nutrition: { protein: 20, sugar: 2, sodium: 100, calories: 150 }, ...extra }, quantity: 1 })
const supplement = id => food(id, { category: '영양제·비타민', mainIngredients: ['마그네슘 100mg'] })
const result = (cart, context = { primaryGoal: 'nutrition_management' }) => {
  const insight = composeCartInsight(analyzeCartNutrition(cart, context), cartAnalysisBasis(context))
  return { insight, quick: cartQuickSummary(insight) }
}
test('legacy AI wording cannot replace the current composition conclusion', () => {
  const { insight } = result([food(1)])
  const legacy = { ...insight, compositionVersion: 3, summary: '당류와 나트륨 기준에 맞는 구성이에요.', aiExplanationAvailable: true }
  assert.equal(isCartInsight(legacy), false)
  const accepted = reconcileCartInsight(legacy, insight)
  assert.equal(isCartInsight(accepted), true)
  assert.equal(accepted.summary, insight.summary)
  assert.equal(accepted.aiExplanationAvailable, false)
  assert.ok(accepted.explanationNotice)
  assert.deepEqual(accepted.productReasons, insight.productReasons)
  assert.equal(reconcileCartInsight({ ...legacy, basis: { primary_goal: '근육량 증가' } }, insight), insight)
  assert.equal(reconcileCartInsight({ ...legacy, balanceItems: [] }, insight), insight)
  assert.equal(reconcileCartInsight({ ...legacy, compositionVersion: 99 }, insight), null)
  assert.equal(reconcileCartInsight({ ...legacy, actions: [] }, insight), null)
})
test('food metrics and first good point are copied exactly from detailed analysis', () => {
  const { insight, quick } = result([food(1), food(2)])
  assert.deepEqual(quick.metrics, insight.balanceItems)
  assert.equal(quick.goodPoint, insight.goodPoints[0])
  assert.equal(quick.itemCount, 2)
  assert.equal(quick.attentionCount, 0)
  assert.deepEqual(quick.checks, [])
  assert.equal(quick.summary, insight.composition.shortSummary)
  assert.match(quick.summary, /단백질 중심/)
})
test('one and three warnings retain real reasons, prioritize allergies and cap at two', () => {
  const context = { primaryGoal: 'nutrition_management', excludedAllergens: ['우유'] }
  const highSodium = id => food(id, { nutrition: { protein: 20, sugar: 2, sodium: 280 } })
  const single = result([highSodium(1)], context).quick
  assert.equal(single.attentionCount, 1)
  assert.match(single.checks[0].reason, /280mg/)
  const { insight, quick } = result([highSodium(1), highSodium(2), food(3, { allergens: ['우유'] })], context)
  assert.equal(quick.attentionCount, 3)
  assert.equal(quick.checks.length, 2)
  assert.equal(quick.remaining, 1)
  assert.equal(quick.checks[0].name, '상품 3')
  assert.match(quick.checks[0].reason, /우유/)
  assert.match(insight.productReasons.find(p => p.id === 3).checks[0], /우유/)
})
test('supplement and mixed carts keep food denominators and existing groups', () => {
  const only = result([supplement(1)], { primaryGoal: 'supplement_search' }).quick
  assert.deepEqual(only.metrics.map(m => m.key), ['supplement', 'attention'])
  const { insight, quick } = result([supplement(1), food(2)])
  assert.equal(insight.productReasons.find(p => p.id === 1).group, '보조 영양 상품')
  assert.equal(quick.metrics.find(m => m.key === 'sugar').total, 1)
  assert.equal(quick.itemCount, 2)
})
test('missing information is never counted as meeting the criteria; quantity is not SKU count', () => {
  const cart = [food(1, { nutrition: {} })]
  cart[0].quantity = 20
  const { quick } = result(cart)
  assert.equal(quick.itemCount, 1)
  assert.equal(quick.metrics.find(m => m.key === 'sugar').count, 0)
  assert.equal(quick.attentionCount, 1)
  assert.match(quick.checks[0].reason, /정보가 충분하지/)
  assert.doesNotMatch(quick.summary, /잘 맞아요|안전|완벽/)
})
