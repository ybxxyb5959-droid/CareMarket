import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeCartNutrition, composeCartInsight, cartAnalysisBasis, cartAnalysisForGemini, reconcileCartInsight } from '../supabase/functions/_shared/cart-nutrition-analysis.js'
import { cartQuickSummary } from '../src/lib/cart-quick-summary.js'

const context = { primaryGoal: 'muscle_gain' }
const food = (id, name, protein = null, category = '일반 식품') => ({ quantity: 1,
  product: { id, name, category, nutrition: { protein, sugar: null, sodium: null, carbs: null, fat: null } } })
const cases = [
  ['protein_centered', [food(1, '닭가슴살', 25), food(2, '스테이크', 20), food(3, '프로틴 음료', 24, '음료·프로틴음료')]],
  ['protein_vegetable', [food(1, '닭가슴살', 25), food(2, '샐러드', 2), food(3, '야채 도시락', 4, '도시락·간편식')]],
  ['vegetable_centered', [food(1, '샐러드', 2), food(2, '야채 모음', null)]],
  ['varied', [food(1, '귀리 시리얼', 4, '시리얼·그래놀라'), food(2, '견과', 6, '견과·건과류'), food(3, '라떼', 2, '음료·프로틴음료')]],
  ['limited', [food(1, '오리지널'), food(2, '데일리 제품')]],
]

for (const [decision, rows] of cases) {
  test(`${decision}: Drawer and detail use one conclusion with registered evidence`, () => {
    const analysis = analyzeCartNutrition(rows, context)
    assert.equal(analysis.composition.decision, decision)
    const insight = composeCartInsight(analysis, cartAnalysisBasis(context))
    const quick = cartQuickSummary(insight)
    assert.equal(quick.summary, analysis.composition.shortSummary)
    assert.ok(insight.summary.startsWith(quick.summary))
    assert.match(insight.summary, /기준|등록/)
    assert.deepEqual(quick.metrics, [analysis.balanceItems[0], analysis.balanceItems[1], analysis.balanceItems.at(-1)])
    assert.doesNotMatch(JSON.stringify(insight), /영양이 완벽|영양소가 충분|균형 잡힌 식단|건강한 식단|식이섬유.*부족/)
  })
}

test('protein numbers, goal and role facts reach Gemini without invented nutrition', () => {
  const analysis = analyzeCartNutrition(cases[0][1], context)
  const input = cartAnalysisForGemini(analysis, cartAnalysisBasis(context))
  assert.equal(input.goal, '근육량 증가')
  assert.equal(input.cart_composition.highProteinProducts, 3)
  assert.equal(input.cart_composition.vegetableTypeProducts, 0)
  assert.equal(input.cart_composition.beverageProducts, 1)
  assert.match(analysis.fallback.summary, /3종 모두.*고단백/)
  assert.match(analysis.attentionPoints[0], /샐러드·채소류/)
  assert.equal(input.products[0].nutrition.protein, 25)
  assert.equal(input.products[0].nutrition.sugar, null)
  assert.equal('fiber' in input.products[0].nutrition, false)
})

test('supplements stay separate and cannot contribute protein or vegetable roles', () => {
  const rows = [...cases[0][1], food(4, '그린 프로틴 영양제', 99, '영양제·비타민')]
  const analysis = analyzeCartNutrition(rows, context)
  assert.equal(analysis.composition.decision, 'protein_centered')
  assert.equal(analysis.composition.supplementProducts, 1)
  assert.equal(analysis.composition.highProteinProducts, 3)
  assert.equal(analysis.composition.vegetableTypeProducts, 0)
  assert.equal(analysis.productReasons.find(p => p.id === 4).group, '보조 영양 상품')
  assert.equal(analysis.balanceItems.find(p => p.key === 'protein').total, 3)
  assert.match(analysis.composition.shortSummary, /보조 영양 상품 1종/)
})

test('missing nutrition remains null; name roles never turn into nutrient measurements', () => {
  const analysis = analyzeCartNutrition([food(1, '닭가슴살'), food(2, '야채 샐러드')], context)
  assert.equal(analysis.composition.decision, 'protein_vegetable')
  assert.equal(analysis.composition.highProteinProducts, 0)
  assert.equal(analysis.composition.missingProteinProducts, 2)
  assert.equal(analysis.balanceItems.find(p => p.key === 'protein').count, 0)
  assert.match(analysis.composition.detailSummary, /2종은 수치 판정을 보류/)
  assert.ok(analysis.composition.products.every(p => p.nutrition.protein === null))
})

test('ambiguous green names, mixed categories, sauces and minor ingredients do not prove roles', () => {
  const rows = [food(1, '그린 오리지널'), food(2, '초코 음료', null, '음료·프로틴음료'),
    food(3, '샐러드 드레싱', null, '소스·조미료'), food(4, '야채 주스', null, '음료·프로틴음료')]
  rows[0].product.mainIngredients = ['양파', '닭고기 향']
  const composition = analyzeCartNutrition(rows).composition
  assert.equal(composition.decision, 'limited')
  assert.equal(composition.vegetableTypeProducts, 0)
  assert.equal(composition.proteinSourceProducts, 0)
})

test('raw server rows and browser rows produce identical composition, independent of quantity', () => {
  const rows = cases[0][1]
  const server = rows.map(({ product: p }) => ({ quantity: 20,
    product: { product_id: p.id, name: p.name, category: p.category, ...p.nutrition } }))
  assert.deepEqual(analyzeCartNutrition(server).composition, analyzeCartNutrition([...rows, rows[0]]).composition)
})

test('AI contradictions, invented numbers and changed roles cannot replace current results', () => {
  const analysis = analyzeCartNutrition(cases[0][1], context)
  const basis = cartAnalysisBasis(context)
  const current = composeCartInsight(analysis, basis)
  for (const summary of ['다양하게 구성되어 있습니다.', '식이섬유 8g입니다.', '균형 잡힌 식단입니다.', '영양소가 충분합니다.']) {
    const narrative = { summary, actions: analysis.fallback.actions }
    assert.deepEqual(composeCartInsight(analysis, basis, narrative, true), current)
    assert.equal(reconcileCartInsight({ ...current, ...narrative, aiExplanationAvailable: true }, current), current)
  }
  const ai = composeCartInsight(analysis, basis, { summary: analysis.composition.detailSummary, actions: analysis.fallback.actions }, true)
  assert.equal(ai.aiExplanationAvailable, true)
  assert.equal(reconcileCartInsight(ai, current).summary, ai.summary)
  const changed = { ...ai, composition: { ...ai.composition, decision: 'varied' } }
  assert.equal(reconcileCartInsight(changed, current), current)
})
