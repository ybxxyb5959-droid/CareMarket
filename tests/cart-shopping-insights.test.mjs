import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeCartNutrition, cartAnalysisBasis, cartAnalysisForGemini, composeCartInsight, reconcileCartInsight } from '../supabase/functions/_shared/cart-nutrition-analysis.js'

const row = (id, extra = {}) => ({ quantity: 1, product: { id, name: `음료 ${id}`, category: '음료', nutrition: { servingSize: '250ml', protein: 25, sugar: 2, sodium: 100 }, ...extra } })
const context = { compositionOnly: true, excludedAllergens: ['우유'] }
const analyze = rows => analyzeCartNutrition(rows, context)

test('matching servings expose real tradeoffs and enrich summary without repeating badges', () => {
  const result = analyze([row(1), row(2, { nutrition: { servingSize: '250ml', protein: 20, sugar: 1, sodium: 100 } })])
  const preview = result.productReasons[0].preview
  assert.match(preview, /단백질은 5g 높아요/)
  assert.match(preview, /당류는 1g 높아요/)
  assert.doesNotMatch(result.fallback.summary, /5g 높아요/)
  const payload = cartAnalysisForGemini(result, cartAnalysisBasis(context))
  assert.equal(payload.shopping_insights.length, 2)
})

test('catalog packaged servings compare correctly without inferring amounts from product names', () => {
  const result = analyze([row(1, { nutrition: { servingSize: '1팩 (250ml)', protein: 25, sugar: 0, sodium: 125 } }), row(2, { nutrition: { servingSize: '1팩 (250ml)', protein: 25, sugar: 0, sodium: 120 } })])
  assert.match(result.productReasons[0].preview, /단백질 25g·당류 0g으로 같고, 나트륨은 5mg 높아요/)
  assert.doesNotMatch(result.fallback.summary, /제공량이 다르면/)
  const ambiguous = analyze([row(1), row(2, { nutrition: { servingSize: '2팩 (250ml)', protein: 25, sugar: 0, sodium: 120 } })])
  assert.equal(ambiguous.productReasons[0].shoppingInsights[0].kind, 'serving')
})

test('equal key nutrients do not imply identical ingredients or products', () => {
  const result = analyze([row(1), row(2)])
  assert.match(result.productReasons[0].preview, /단백질·당류·나트륨 수치가 같아요/)
  assert.match(result.productReasons[0].story.title, /단백질 25g/)
})

test('missing, different or ambiguous servings and different categories never yield numeric comparisons', () => {
  for (const servingSize of [undefined, '500ml', '1병', '250g']) {
    const result = analyze([row(1), row(2, { nutrition: { servingSize, protein: 20, sugar: 1, sodium: 100 } })])
    assert.equal(result.productReasons[0].shoppingInsights[0].kind, 'serving')
  }
  const result = analyze([row(1), row(2, { category: '간식' })])
  assert.equal(result.productReasons[0].shoppingInsights[0].kind, 'facts')
})

test('missing nutrient fields cannot establish equality; allergies persist in every AI summary', () => {
  const result = analyze([row(1, { allergens: ['우유'] }), row(2), row(3, { nutrition: { servingSize: '250ml' } })])
  assert.ok(result.summaryOptions.every(text => text.includes('알레르기')))
  assert.ok(!result.productReasons.find(p => p.id === 3).shoppingInsights.some(p => p.kind === 'same'))
  const basis = cartAnalysisBasis(context)
  const local = composeCartInsight(result, basis)
  const remote = composeCartInsight(result, basis, { summary: result.summaryOptions.at(-1), actions: result.fallback.actions }, true)
  assert.equal(reconcileCartInsight(remote, local).summary, remote.summary)
  assert.equal(reconcileCartInsight({ ...remote, summary: '근거 없는 분석' }, local).summary, local.summary)
})
