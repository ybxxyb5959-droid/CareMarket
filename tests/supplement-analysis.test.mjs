import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { isSupplement, registeredSupplementIngredients, supplementIngredients, supplementComparisonRows, comparisonPolicy, comparisonFallback } from '../supabase/functions/_shared/product-type.js'
import { analyzeCartNutrition, composeCartInsight, cartAnalysisBasis } from '../supabase/functions/_shared/cart-nutrition-analysis.js'
import { createAiInsightsHandler } from '../supabase/functions/ai-insights/handler.js'
import { cartNutritionTotals } from '../src/lib/nutrition.js'

// Repository seed values, checked against a read-only products query on 2026-09-07.
const seed = JSON.parse(fs.readFileSync(new URL('../data/products.seed.json', import.meta.url)))
const product = id => ({ ...seed[id - 1], product_id: id })
const chicken = product(1), multi = product(71), omega = product(72), magnesium = product(75)
const rows = products => products.map(product => ({ product, quantity: 1 }))

test('registered category, including existing normalization, determines product type', () => {
  assert.equal(isSupplement(chicken), false)
  assert.equal(isSupplement({ category: ' 영양제 ・ 비타민 ' }), true)
  assert.equal(isSupplement({ category: '기타 건강식품', name: '비타민' }), false)
})

test('original multivitamin registration is preserved; omega oil is not EPA/DHA dosage', () => {
  const ingredients = registeredSupplementIngredients(multi)
  assert.equal(ingredients.length, 5)
  assert.ok(ingredients.every(item => item.amount === null))
  const oil = supplementIngredients(omega)[0]
  assert.equal(oil.name, '정제어유 (EPA 및 DHA 함유유지)')
  assert.equal(oil.amount, '1,000mg')
  assert.equal(oil.raw, omega.main_ingredients[0])
  assert.equal(supplementIngredients(product(76))[0].amount, '4000IU')
})

test('dynamic union includes only measured keys; missing amounts are dash', () => {
  const rows = supplementComparisonRows([multi, omega])
  assert.equal(rows.length, 6)
  assert.equal(rows.find(([label]) => label === '아연')[1](multi), '8.5mg')
  assert.equal(rows.find(([label]) => label === '아연')[1](omega), '-')
  assert.equal(rows.find(([label]) => label.includes('함유유지'))[1](omega), '1,000mg')
})

test('different supplements and food/supplement pairs never select a winner', () => {
  for (const goal of ['근육량 증가', '체중 관리', '영양제 탐색', null]) {
    for (const pair of [[multi, omega], [chicken, multi]]) {
      assert.equal(comparisonPolicy(pair, goal).allowWinner, false)
      assert.equal(comparisonFallback(pair, goal).recommendation, null)
    }
  }
  assert.equal(comparisonPolicy([multi, omega], 'muscle_gain').state, 'low_relevance')
  assert.equal(comparisonPolicy([multi, omega], 'supplement_search').state, 'different_roles')
  assert.match(comparisonFallback([{ ...multi, product_id: 9999, main_ingredients: [] }, omega], '영양제 탐색').summary, /정보가 충분하지/)
})

test('synthetic second magnesium fixture compares measured values without replacing registered data', () => {
  const second = { ...magnesium, product_id: 999, price: 15900, main_ingredients: ['쌀발효마그네슘 200mg', '비타민B6염산염'] }
  assert.equal(comparisonPolicy([magnesium, second], '영양제 탐색').state, 'direct')
  const row = supplementComparisonRows([magnesium, second]).find(([name]) => name === '쌀발효마그네슘')
  assert.equal(row[1](magnesium), '315mg')
  assert.equal(row[1](second), '200mg')
  assert.match(comparisonFallback([magnesium, second], '영양제 탐색').summary, /함량을 우선.*가격을 우선/)
  const excipientOnly = { ...omega, main_ingredients: [...omega.main_ingredients, '비타민B6염산염'] }
  assert.equal(comparisonPolicy([magnesium, excipientOnly], '영양제 탐색').similar, false)
})

test('muscle cart separates food and supplementary nutrition, and excludes supplements from food denominator', () => {
  const proteinDrink = { ...product(51), protein: 24 } // Explicit high-protein test fixture.
  const analysis = analyzeCartNutrition(rows([chicken, proteinDrink, multi]), { primaryGoal: 'muscle_gain' })
  assert.equal(analysis.groups.find(group => group.label === '직접 관련 상품').productIds.length, 2)
  const supplement = analysis.productReasons.find(p => p.id === 71)
  assert.equal(supplement.group, '보조 영양 상품')
  assert.equal(supplement.needsAttention, false)
  assert.equal(analysis.balanceItems.find(item => item.key === 'protein').total, 2)
  assert.equal(analysis.balanceItems.find(item => item.key === 'protein_complement').count, 0)
  assert.match(analysis.fallback.summary, /직접 관련 상품 2종.*보조 영양 상품 1종/)
})

test('supplement search is ingredient-based and preserves allergy/caffeine checks', () => {
  const analysis = analyzeCartNutrition(rows([multi, omega]), { primaryGoal: 'supplement_search', selectedConditions: ['high_protein', 'low_sugar'] })
  assert.ok(analysis.productReasons.every(p => p.group === '영양제 구성' && !p.needsAttention))
  assert.equal(analysis.balanceItems.some(p => ['protein', 'sugar', 'calories'].includes(p.key)), false)
  assert.match(analysis.productReasons[1].reasons.join(' '), /EPA 및 DHA 함유유지 1,000mg/)
  const allergy = analyzeCartNutrition(rows([{ ...multi, allergens: ['우유'], contains_caffeine: true }]), { primaryGoal: 'muscle_gain', excludedAllergens: ['우유'], selectedConditions: ['exclude_caffeine'] })
  assert.equal(allergy.productReasons[0].checks.length, 2)
  assert.equal(allergy.productReasons[0].checks.some(text => text.includes('단백질')), false)
  const composed = composeCartInsight(analysis, cartAnalysisBasis(), { summary: '임의 비타민 효능', actions: ['임의 건강효과'] })
  assert.equal(composed.summary, analysis.fallback.summary)
})

test('mixed supplement cart does not flag foods solely for their category', () => {
  const analysis = analyzeCartNutrition(rows([chicken, multi, omega]), { primaryGoal: 'supplement_search' })
  assert.equal(analysis.balanceItems.find(item => item.key === 'attention').count, 0)
  assert.deepEqual(analysis.attentionPoints, [])
  assert.match(analysis.fallback.summary, /영양제 2종과 일반 식품 1종/)
  assert.match(analysis.productReasons.find(item => item.id === 1).reasons.join(' '), /열량.*kcal/)
  const flagged = analyzeCartNutrition(rows([multi, { ...chicken, allergens: ['우유'], contains_caffeine: true, sugar: 20 }]), {
    primaryGoal: 'supplement_search', excludedAllergens: ['우유'], selectedConditions: ['exclude_caffeine', 'low_sugar'],
  })
  assert.equal(flagged.balanceItems.find(item => item.key === 'attention').count, 1)
  const checks = flagged.productReasons.find(item => item.id === 1).checks.join(' ')
  assert.match(checks, /우유/)
  assert.match(checks, /카페인/)
  assert.match(checks, /당류/)
  assert.doesNotMatch(checks, /영양제 이외/)
})

test('nutrition totals continue summing foods and exclude supplements', () => {
  const food = { ...chicken, nutrition: chicken }
  const supplement = { ...omega, nutrition: omega }
  assert.deepEqual(cartNutritionTotals(rows([food, supplement])), cartNutritionTotals(rows([food])))
})

test('server returns deterministic comparison and cart results without Gemini or its key', async () => {
  let calls = 0
  const handler = createAiInsightsHandler({ getApiKey: () => '', getUser: async () => ({ id: 'test' }),
    getProfile: async () => ({ primary_goal: 'muscle_gain' }), getProducts: async () => [multi, omega],
    getCartSnapshot: async () => ({ profile: { primary_goal: 'supplement_search' }, items: rows([multi, omega]) }),
    fetchImpl: async () => { calls++; throw new Error('AI failure') }, logger: { error() {} } })
  for (const body of [{ mode: 'compare', product_ids: [71, 72] }, { mode: 'cart_summary' }]) {
    const response = await handler(new Request('https://example.test', { method: 'POST', headers: { authorization: 'Bearer test', 'content-type': 'application/json' }, body: JSON.stringify(body) }))
    assert.equal(response.status, 200)
    const { insight } = await response.json()
    assert.equal(insight.aiExplanationAvailable, false)
    assert.doesNotMatch(insight.summary, /효능|피로 회복|근육 성장/)
    if (body.mode === 'compare') assert.equal(insight.recommendation, null)
  }
  assert.equal(calls, 0)
})
