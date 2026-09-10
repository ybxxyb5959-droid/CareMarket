import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeCartNutrition, cartAnalysisBasis, cartAnalysisForGemini, composeCartInsight } from '../supabase/functions/_shared/cart-nutrition-analysis.js'
import { cartQuickSummary } from '../src/lib/cart-quick-summary.js'

const row = (id, name, category, allergens = [], quantity = 1) => ({ quantity, product: {
  id, name, category, allergens, nutrition: { protein: 24, sugar: 2, sodium: 100, calories: 180 },
} })
const context = { compositionOnly: true, excludedAllergens: ['우유'] }
const beef = row(1, '소고기', '육류')
const salmon = row(2, '연어', '생선류', ['우유'])

test('actual beef and salmon composition ignores purchase goals and filters', () => {
  const plain = analyzeCartNutrition([beef, salmon], context)
  const goals = analyzeCartNutrition([beef, salmon], { ...context, primaryGoal: 'supplement_search', selectedConditions: ['저염'] })
  assert.deepEqual(goals, plain)
  assert.match(plain.fallback.summary, /단백질 중심/)
  assert.doesNotMatch(JSON.stringify(plain), /영양제 탐색|목표 달성|구매목적|하루 권장량/)
  const payload = cartAnalysisForGemini(plain, cartAnalysisBasis(context))
  assert.equal('goal' in payload, false)
  assert.equal('selected_conditions' in payload, false)
  assert.deepEqual(payload.excluded_allergens, ['우유'])
  assert.equal(payload.products.find(p => p.id === 2).quantity, 1)
})

test('registered category diversity and concentration are described', () => {
  const food = (id, name, category) => ({ ...row(id, name, category), product: { ...row(id, name, category).product, nutrition: {} } })
  const diverse = analyzeCartNutrition([food(1, '상품 A', '간식'), food(2, '상품 B', '소스')], context)
  assert.match(diverse.fallback.summary, /2개 카테고리/)
  const similar = analyzeCartNutrition([food(1, '상품 A', '간식'), food(2, '상품 B', '간식')], context)
  assert.match(similar.fallback.summary, /간식 카테고리에 집중/)
})

test('Drawer and detail prioritize exact registered allergy matches without inference', () => {
  const unknown = { quantity: 1, product: { id: 3, name: '우유라는 이름만 있는 상품', category: '간식' } }
  const analysis = analyzeCartNutrition([unknown, beef, salmon], context)
  const insight = composeCartInsight(analysis, cartAnalysisBasis(context))
  const quick = cartQuickSummary(insight)
  assert.equal(quick.checks[0].id, 2)
  assert.match(quick.checks[0].reason, /우유/)
  assert.match(insight.attentionPoints[0], /연어.*우유/)
  assert.deepEqual(insight.productReasons.find(p => p.id === 3).allergyMatches, [])
  assert.equal(quick.attentionCount, insight.balanceItems.find(p => p.key === 'attention').count)
})

test('quantity refresh updates input while preserving SKU-based composition; empty cart is safe', () => {
  const before = analyzeCartNutrition([beef, salmon], context)
  const after = analyzeCartNutrition([{ ...beef, quantity: 4 }, salmon], context)
  assert.equal(after.composition.products.find(p => p.id === 1).quantity, 4)
  assert.equal(after.fallback.summary, before.fallback.summary)
  assert.deepEqual(after.balanceItems, before.balanceItems)
  assert.equal(analyzeCartNutrition([], context).itemCount, 0)
})
