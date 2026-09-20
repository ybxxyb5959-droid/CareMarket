import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeCartNutrition } from '../supabase/functions/_shared/cart-nutrition-analysis.js'
import { productStory } from '../supabase/functions/_shared/cart-story.js'
const analyze = products => analyzeCartNutrition(products.map((p, i) => ({ quantity: 1, product: { id: i + 1, ...p } })), { compositionOnly: true })
test('nutrition management prioritizes sodium and fiber and distinguishes missing from zero', () => {
  const base = { name: '식품', category: '간식', serving: '50g', nutrition: { sodium: 80, protein: 10, sugar: 1, fiber: null } }
  const missing = productStory(base, '식단 영양 관리')
  assert.deepEqual(missing.metrics.map(m => m.key), ['sodium', 'sugar', 'protein'])
  assert.match(missing.title, /나트륨 80mg/)
  assert.equal(missing.checks.length, 0)
  for (const fiber of [0, 4]) {
    const known = productStory({ ...base, nutrition: { ...base.nutrition, fiber } }, '식단 영양 관리')
    assert.deepEqual(known.metrics.map(m => m.key), ['sodium', 'sugar', 'fiber', 'protein'])
    assert.equal(known.metrics[2].value, fiber)
    assert.equal(known.checks.length, 0)
  }
})
test('varied baskets describe categories without claiming nutritional balance', () => {
  const result = analyze(['음료', '간편식', '채소'].map(category => ({ category, name: category, nutrition: {} })))
  assert.equal(result.fallback.headline, '다양한 상품을 함께 담았어요')
  assert.doesNotMatch(result.fallback.summary, /균형 잡|건강한|완벽/)
})

test('weight management changes card emphasis and analysis basis', () => {
  const rows = [{ quantity: 1, product: { id: 1, name: '닭가슴살', category: '육류', nutrition: { calories: 130, protein: 25, sugar: 0, sodium: 80 } } }]
  const weight = analyzeCartNutrition(rows, { compositionOnly: true, displayGoal: '체중 관리' })
  assert.deepEqual(weight.productReasons[0].story.metrics.map(m => m.key), ['calories', 'sugar', 'protein'])
  assert.match(weight.productReasons[0].story.title, /130kcal/)
  // A single food defers to a "판단 근거 부족" nuance instead of a goal-fit claim.
  assert.match(weight.fallback.summary, /상품 한 종만으로는 전체 식단 균형을 판단하기 어려워요/)
  const muscle = analyzeCartNutrition(rows, { compositionOnly: true, displayGoal: '근육량 증가' })
  assert.equal(muscle.productReasons[0].story.metrics[0].key, 'protein')
  assert.doesNotMatch(muscle.fallback.summary, /저당|당류|저염|나트륨/)
  const lowProtein = analyzeCartNutrition([{ ...rows[0], product: { ...rows[0].product, nutrition: { protein: 3, sugar: 0, sodium: 10 } } }], { compositionOnly: true, displayGoal: '근육량 증가' })
  assert.match(lowProtein.fallback.summary, /고단백 기준에 해당하는 상품은 없어요/)
  assert.doesNotMatch(lowProtein.fallback.summary, /저당|당류|저염|나트륨/)
  assert.equal(muscle.fallback.headline, '담은 상품의 영양정보를 살펴보세요')
})
test('product story preserves missing nutrients and serving information', () => {
  const result = analyze([{ name: '프로틴 음료', category: '음료', nutrition: { servingSize: '1팩 (250ml)', protein: 25, sugar: 0 } }])
  const story = result.productReasons[0].story
  assert.match(story.title, /단백질 25g/)
  assert.equal(story.serving, '1팩 (250ml)')
  assert.deepEqual(story.metrics.map(m => m.key), ['protein', 'sugar'])
})
