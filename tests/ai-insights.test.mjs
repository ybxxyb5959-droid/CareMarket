import test from 'node:test'
import assert from 'node:assert/strict'
import { createAiInsightsHandler, GEMINI_MODEL } from '../supabase/functions/ai-insights/handler.js'
import { resolveInsightOrigins, STOREFRONT_ORIGIN } from '../supabase/functions/ai-insights/origins.js'
import { GEMINI_CART_SCHEMA, GEMINI_COMPARE_SCHEMA } from '../supabase/functions/_shared/ai-insights-contract.js'
import { analyzeCartNutrition, CART_NUTRITION_THRESHOLDS, composeCartInsight, cartAnalysisBasis, isCartInsight } from '../supabase/functions/_shared/cart-nutrition-analysis.js'
import { getCountdown, getLocalDateKey, isDiscountProduct, selectDailyDeals } from '../src/lib/deals.js'

const origin = 'http://127.0.0.1:5173'
const product = (id, category = `카테고리 ${id}`) => ({
  product_id: id,
  name: `상품 ${id}`,
  category,
  price: 1000 + id,
  calories: 100,
  protein: 10 + id,
  carbs: 20,
  fat: 3,
  sugar: 2,
  sodium: 100,
  serving_size: '1개',
  allergens: ['대두'],
  main_ingredients: ['대두 단백'],
  contains_caffeine: false,
})
const geminiResponse = (value) => new Response(JSON.stringify({
  candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(value) }] } }],
}), { headers: { 'Content-Type': 'application/json' } })
const cartNarrative = {
  headline: '단백질 상품을 중심으로 살펴봤어요.',
  summary: '코드가 확인한 영양 구성을 바탕으로 짧게 정리했어요.',
  actions: ['필요한 영양 방향의 상품을 함께 살펴보세요.'],
}
const request = (body, headers = {}) => new Request('https://example.test/ai-insights', {
  method: 'POST',
  headers: { origin, authorization: 'Bearer valid-session', 'content-type': 'application/json', ...headers },
  body: JSON.stringify(body),
})

function makeHandler(fetchImpl, overrides = {}) {
  return createAiInsightsHandler({
    getApiKey: () => 'test-only-key',
    productionOrigins: [],
    getUser: async () => ({ id: 'user-a' }),
    getProfile: async (userId) => ({ user_id: userId, primary_goal: 'muscle_gain' }),
    getProducts: async (ids) => ids.map((id) => product(id)),
    getCartSnapshot: async (userId) => ({
      profile: { user_id: userId, primary_goal: 'muscle_gain' },
      preferences: { high_protein: true },
      items: [{ quantity: 2, product: product(1) }],
    }),
    fetchImpl,
    logger: { error() {} },
    ...overrides,
  })
}

test('production storefront preflight works with missing or stale origin secrets', async () => {
  for (const configured of ['', 'https://old-store.example', ` ${STOREFRONT_ORIGIN}, https://preview.example, `]) {
    const origins = resolveInsightOrigins(configured)
    assert.equal(origins.filter((value) => value === STOREFRONT_ORIGIN).length, 1)
    if (configured.includes('preview.example')) assert.ok(origins.includes('https://preview.example'))
    const handler = makeHandler(() => { throw new Error('Preflight must not call Gemini') }, { productionOrigins: origins })
    const response = await handler(new Request('https://example.test/ai-insights', {
      method: 'OPTIONS',
      headers: { origin: STOREFRONT_ORIGIN, 'access-control-request-method': 'POST', 'access-control-request-headers': 'authorization,apikey,content-type,x-client-info' },
    }))
    assert.equal(response.status, 204)
    assert.equal(response.headers.get('access-control-allow-origin'), STOREFRONT_ORIGIN)
    assert.match(response.headers.get('access-control-allow-headers'), /authorization/)
  }
})

test('production origin default does not allow unrelated or lookalike origins', async () => {
  const handler = makeHandler(() => { throw new Error('Untrusted origins must not call Gemini') }, { productionOrigins: resolveInsightOrigins() })
  for (const origin of ['https://other.vercel.app', `${STOREFRONT_ORIGIN}.evil.test`, `${STOREFRONT_ORIGIN}/path`, 'http://caremarket.vercel.app']) {
    const response = await handler(new Request('https://example.test/ai-insights', { method: 'OPTIONS', headers: { origin } }))
    assert.equal(response.status, 403)
  }
})

for (const ids of [[1, 2], [1, 2, 3]]) {
  test(`compares exactly ${ids.length} server-loaded products`, async () => {
    let fetchedIds
    const output = {
      summary: '선택한 상품은 영양 구성과 가격 부담에 차이가 있습니다.',
      highlights: ids.map((id) => ({ product_id: id, reason: '선택 상품 중 단백질 구성이 두드러집니다.' })),
      goal_fit_summary: '현재 구매목적에서는 단백질 구성과 가격을 함께 살펴볼 수 있습니다.',
      recommendation: { product_id: ids[0], reason: '구매목적에 맞는 영양 구성과 가격 부담을 함께 고려한 선택입니다.' },
    }
    const handler = makeHandler(async (url, options) => {
      assert.match(url, new RegExp(`/${GEMINI_MODEL}:generateContent$`))
      const payload = JSON.parse(options.body)
      assert.deepEqual(payload.generationConfig.responseJsonSchema, GEMINI_COMPARE_SCHEMA)
      assert.equal(payload.generationConfig.maxOutputTokens, 1536)
      const prompt = JSON.parse(payload.contents[0].parts[0].text)
      assert.deepEqual(prompt.products.map((item) => item.product_id), ids)
      assert.equal(prompt.primary_goal, 'muscle_gain')
      assert.equal(JSON.stringify(payload).includes('test-only-key'), false)
      return geminiResponse(output)
    }, {
      productionOrigins: resolveInsightOrigins(),
      getProducts: async (requested) => { fetchedIds = requested; return requested.map((id) => product(id)) },
    })
    const response = await handler(request({ mode: 'compare', product_ids: ids }, { origin: STOREFRONT_ORIGIN }))
    assert.equal(response.status, 200)
    assert.deepEqual(fetchedIds, ids)
    assert.deepEqual((await response.json()).insight, output)
  })
}

test('rejects a missing product id before Gemini', async () => {
  let calls = 0
  const handler = makeHandler(async () => { calls += 1; return geminiResponse({}) }, {
    getProducts: async () => [product(1)],
  })
  const response = await handler(request({ mode: 'compare', product_ids: [1, 999] }))
  assert.equal(response.status, 404)
  assert.deepEqual(await response.json(), { error: { code: 'PRODUCT_NOT_FOUND' } })
  assert.equal(calls, 0)
})

test('cart summary uses only the authenticated user server snapshot', async () => {
  let requestedUser
  const handler = makeHandler(async (_url, options) => {
    const payload = JSON.parse(options.body)
    assert.deepEqual(payload.generationConfig.responseJsonSchema, GEMINI_CART_SCHEMA)
    const prompt = JSON.parse(payload.contents[0].parts[0].text)
    assert.deepEqual(prompt.goal, '근육량 증가')
    assert.deepEqual(prompt.selected_conditions, ['고단백'])
    assert.deepEqual(prompt.cart_scope, { item_count: 1, single_product: true })
    assert.equal(prompt.analysis.dominant.includes('protein'), true)
    assert.equal(prompt.analysis.balance_items.some((item) => item.key === 'protein' && item.status === 'good'), true)
    assert.equal(JSON.stringify(prompt).includes('상품 6'), false)
    assert.equal('nutrition_totals' in prompt, false)
    assert.equal('cart_items' in prompt, false)
    return geminiResponse(cartNarrative)
  }, {
    getCartSnapshot: async (userId) => {
      requestedUser = userId
      return { profile: { primary_goal: 'muscle_gain' }, preferences: { high_protein: true }, items: [{ quantity: 2, product: product(6) }] }
    },
  })
  const response = await handler(request({ mode: 'cart_summary' }))
  assert.equal(response.status, 200)
  assert.equal(requestedUser, 'user-a')
  const insight = (await response.json()).insight
  assert.equal(insight.headline, '근육량 증가 기준 장바구니 분석')
  assert.equal(insight.aiExplanationAvailable, true)
  assert.equal(insight.balanceItems.some((item) => item.key === 'protein' && item.status === 'good'), true)
  assert.deepEqual(insight.basis, {
    personalized: true,
    primary_goal: '근육량 증가',
    selected_conditions: ['고단백'],
    excluded_allergens: [],
  })
})

test('cart quantities never change composition and duplicate IDs count once', () => {
  const rows = [{ quantity: 1, product: product(6) }, { quantity: 2, product: product(1) }]
  const context = { primaryGoal: '근육량 증가' }
  const one = analyzeCartNutrition(rows, context)
  const twenty = analyzeCartNutrition([{ ...rows[0], quantity: 20 }, rows[1], rows[0]], context)
  assert.deepEqual(one, twenty)
  assert.equal(one.itemCount, 2)
  assert.equal(one.balanceItems.find(item => item.key === 'protein').text, '1 / 2종')
  assert.equal('totals' in one, false)
  assert.equal('totalQuantity' in one, false)
})

test('missing preferences stays a general analysis without fake personalization', async () => {
  const handler = makeHandler(async (_url, options) => {
    const prompt = JSON.parse(JSON.parse(options.body).contents[0].parts[0].text)
    assert.equal(prompt.goal, null)
    assert.deepEqual(prompt.selected_conditions, [])
    return geminiResponse(cartNarrative)
  }, {
    getCartSnapshot: async () => ({ profile: { primary_goal: null }, preferences: null, items: [{ quantity: 1, product: product(1) }] }),
  })
  const response = await handler(request({ mode: 'cart_summary' }))
  assert.equal(response.status, 200)
  const insight = (await response.json()).insight
  assert.equal(insight.aiExplanationAvailable, true)
  assert.deepEqual(insight.basis, {
    personalized: false,
    primary_goal: null,
    selected_conditions: [],
    excluded_allergens: [],
  })
})

test('empty cart rejects before Gemini is called', async () => {
  let calls = 0
  const handler = makeHandler(async () => { calls += 1; return geminiResponse(cartNarrative) }, {
    getCartSnapshot: async () => ({ profile: null, preferences: null, items: [] }),
  })
  const response = await handler(request({ mode: 'cart_summary' }))
  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), { error: { code: 'EMPTY_CART' } })
  assert.equal(calls, 0)
})

test('missing Gemini configuration still returns the deterministic cart result', async () => {
  let calls = 0
  const handler = makeHandler(async () => { calls += 1; return geminiResponse(cartNarrative) }, {
    getApiKey: () => '',
  })
  const response = await handler(request({ mode: 'cart_summary' }))
  assert.equal(response.status, 200)
  const insight = (await response.json()).insight
  assert.equal(insight.aiExplanationAvailable, false)
  assert.ok(insight.balanceItems.length > 0)
  assert.equal(calls, 0)
})

test('cannot request another user cart or send extra cart data', async () => {
  let cartCalls = 0
  const handler = makeHandler(async () => geminiResponse({}), {
    getCartSnapshot: async () => { cartCalls += 1; return null },
  })
  const response = await handler(request({ mode: 'cart_summary', user_id: 'user-b' }))
  assert.equal(response.status, 400)
  assert.equal(cartCalls, 0)
})

test('authentication and Gemini failures return safe errors', async () => {
  const handler = makeHandler(async () => new Response('private upstream body', { status: 500 }))
  const missingAuth = await handler(request({ mode: 'compare', product_ids: [1, 2] }, { authorization: '' }))
  assert.equal(missingAuth.status, 401)
  assert.deepEqual(await missingAuth.json(), { error: { code: 'AUTH_REQUIRED' } })
  const failed = await handler(request({ mode: 'compare', product_ids: [1, 2] }))
  assert.equal(failed.status, 502)
  assert.deepEqual(await failed.json(), { error: { code: 'UPSTREAM_ERROR' } })
})

test('numeric or medical narrative is rejected after Structured Output', async () => {
  const handler = makeHandler(async () => geminiResponse({
    summary: '단백질이 20g이라 치료에 좋습니다.',
    highlights: [{ product_id: 1, reason: '특징' }, { product_id: 2, reason: '특징' }],
    goal_fit_summary: '구매목적 기준 요약',
    recommendation: { product_id: 1, reason: '선택 상품 중 구매목적에 더 잘 맞습니다.' },
  }))
  const response = await handler(request({ mode: 'compare', product_ids: [1, 2] }))
  assert.equal(response.status, 502)
  assert.deepEqual(await response.json(), { error: { code: 'INVALID_RESPONSE' } })
})

test('comparison rejects a recommendation outside the selected products', async () => {
  const handler = makeHandler(async () => geminiResponse({
    summary: '선택한 상품의 구성에는 차이가 있습니다.',
    highlights: [{ product_id: 1, reason: '구성상 특징이 있습니다.' }, { product_id: 2, reason: '다른 구성상 특징이 있습니다.' }],
    goal_fit_summary: '구매목적에 따라 선택 기준을 달리 볼 수 있습니다.',
    recommendation: { product_id: 999, reason: '선택하지 않은 상품을 추천합니다.' },
  }))
  const response = await handler(request({ mode: 'compare', product_ids: [1, 2] }))
  assert.equal(response.status, 502)
  assert.deepEqual(await response.json(), { error: { code: 'INVALID_RESPONSE' } })
})

test('cart analysis replaces an invalid Gemini narrative with deterministic fallback', async () => {
  const handler = makeHandler(async () => geminiResponse({
    headline: '장바구니 점수를 확인했어요.',
    summary: '현재 장바구니의 건강 점수는 87점입니다.',
    actions: ['점수를 높이세요.'],
  }))
  const response = await handler(request({ mode: 'cart_summary' }))
  assert.equal(response.status, 200)
  const insight = (await response.json()).insight
  assert.equal(insight.aiExplanationAvailable, false)
  assert.equal(/87|점수/.test(JSON.stringify(insight)), false)
  assert.ok(insight.balanceItems.length > 0)
})

test('cart analysis keeps deterministic results when Gemini is unavailable', async () => {
  const handler = makeHandler(async () => new Response('private upstream body', { status: 500 }))
  const response = await handler(request({ mode: 'cart_summary' }))
  assert.equal(response.status, 200)
  const insight = (await response.json()).insight
  assert.equal(insight.aiExplanationAvailable, false)
  assert.match(insight.explanationNotice, /계산한 기본 분석/)
  assert.ok(insight.currentFeatures.length > 0)
})

test('deterministic cart analysis reuses catalog thresholds and avoids unsupported fiber data', () => {
  assert.deepEqual(CART_NUTRITION_THRESHOLDS, { highProteinMin: 15, lowSugarMax: 5, lowSodiumMax: 250 })
  const analysis = analyzeCartNutrition([
    { quantity: 2, product: { ...product(1), protein: 20, sugar: 2, sodium: 320 } },
    { quantity: 1, product: { ...product(2), protein: 18, sugar: 3, sodium: 310 } },
  ], { primaryGoal: '식단 영양 관리' })
  assert.deepEqual(analysis.dominant, ['sugar'])
  assert.ok(analysis.good.includes('sugar'))
  assert.equal(analysis.balanceItems.find(item => item.key === 'attention').count, 2)
  assert.equal(analysis.availableNutrients.includes('fiber'), false)
  assert.equal(analysis.balanceItems.some((item) => item.key === 'fiber'), false)
})

test('a varied combination is not automatically labeled as needing balance', () => {
  const varied = analyzeCartNutrition([
    { quantity: 1, product: { ...product(1, '도시락·간편식'), protein: 20, sugar: 2, sodium: 200 } },
    { quantity: 1, product: { ...product(2, '음료·프로틴음료'), protein: 8, sugar: 3, sodium: 120 } },
    { quantity: 1, product: { ...product(3, '견과·건과류'), protein: 6, sugar: 8, sodium: 280 } },
  ])
  assert.deepEqual(varied.needsBalance, [])
  assert.equal(varied.balanceItems.find(item => item.key === 'attention').text, '1 / 3종')
  assert.ok(varied.good.includes('sugar'))
  assert.ok(varied.good.includes('sodium'))
  assert.equal(varied.compositionSignals.includes('category_concentrated'), false)
})

test('single product wording is conservative and supplement food zeroes are not judged', () => {
  const single = analyzeCartNutrition([{ quantity: 3, product: { ...product(1), protein: 20 } }])
  assert.equal(single.singleProduct, true)
  assert.equal(single.observations.some((text) => /불균형|치우/.test(text)), false)

  const supplement = analyzeCartNutrition([{
    quantity: 2,
    product: { ...product(9, '영양제·비타민'), calories: 0, protein: 0, sugar: 0, sodium: 0 },
  }], { primaryGoal: '영양제 탐색' })
  assert.deepEqual(supplement.availableNutrients, [])
  assert.equal(supplement.balanceItems.find(item => item.key === 'supplement').text, '1 / 1종')
  assert.equal(supplement.balanceItems.some(item => ['sugar', 'sodium', 'protein'].includes(item.key)), false)
})

test('old and incomplete cart responses are rejected instead of rendering an empty card', () => {
  const current = composeCartInsight(analyzeCartNutrition([{ quantity: 3, product: { ...product(1), protein: 20 } }]), cartAnalysisBasis())
  assert.equal(isCartInsight(current), true)
  assert.equal(isCartInsight({ summary: 'old', strengths: [], considerations: [], recommendations: [] }), false)
  for (const field of ['headline', 'summary', 'actions', 'balanceItems', 'currentFeatures', 'analysisVersion']) {
    assert.equal(isCartInsight({ ...current, [field]: undefined }), false, field)
  }
  assert.equal(isCartInsight({ ...current, actions: [] }), false)
})

test('one protein SKU x20 remains one type, including API failures', async () => {
  const rows = [{ quantity: 20, product: { ...product(1), protein: 20 } }]
  const context = { primaryGoal: '근육량 증가' }
  const analysis = analyzeCartNutrition(rows, context)
  assert.equal(analysis.balanceItems.find(item => item.key === 'protein').text, '1 / 1종')
  assert.deepEqual(analysis, analyzeCartNutrition([{ ...rows[0], quantity: 1 }], context))
  assert.doesNotMatch(JSON.stringify(analysis), /식이섬유|반복|totalQuantity|totals/)
  for (const failure of [async () => new Response('', { status: 500 }), async () => { throw new DOMException('timed out', 'TimeoutError') }]) {
    const handler = makeHandler(failure, { getCartSnapshot: async () => ({ profile: { primary_goal: 'muscle_gain' }, items: rows }) })
    const response = await handler(request({ mode: 'cart_summary' }))
    const { insight } = await response.json()
    assert.equal(response.status, 200)
    assert.equal(isCartInsight(insight), true)
    assert.equal(insight.aiExplanationAvailable, false)
    assert.equal(insight.balanceItems.find(item => item.key === 'protein').text, '1 / 1종')
  }
})

test('daily deals are real discounts, stable per date, and category-diverse', () => {
  const products = Array.from({ length: 10 }, (_, index) => ({
    id: index + 1,
    category: `분류 ${index % 5}`,
    isActive: true,
    stock: 2,
    price: 800,
    originalPrice: 1000,
  }))
  products.push({ id: 99, category: '제외', isActive: true, stock: 0, price: 800, originalPrice: 1000 })
  const first = selectDailyDeals(products, '2026-09-05')
  const refresh = selectDailyDeals(products, '2026-09-05')
  const nextDay = selectDailyDeals(products, '2026-09-06')
  assert.deepEqual(first.map((item) => item.id), refresh.map((item) => item.id))
  assert.notDeepEqual(first.map((item) => item.id), nextDay.map((item) => item.id))
  assert.equal(first.length, 4)
  assert.equal(new Set(first.map((item) => item.category)).size, 4)
  assert.ok(first.every(isDiscountProduct))
})

test('countdown targets the next local midnight', () => {
  const now = new Date(2026, 8, 5, 15, 38, 16, 0)
  assert.equal(getLocalDateKey(now), '2026-09-05')
  assert.equal(getCountdown(now), '08:21:44')
})

test('comparison allows DB-backed numeric ingredient names but rejects invented measurements', async () => {
  const output = { summary: '오메가3와 비타민B12 성분을 비교했습니다.', highlights: [{ product_id: 1, reason: '오메가3 성분이 등록되어 있습니다.' }, { product_id: 2, reason: '비타민B12 성분이 등록되어 있습니다.' }], goal_fit_summary: '등록 성분을 기준으로 비교했습니다.', recommendation: { product_id: 1, reason: '현재 목적의 상품군에 해당합니다.' } }
  const overrides = { getProducts: async () => [{ ...product(1), name: '오메가3', main_ingredients: ['오메가3'] }, { ...product(2), name: '비타민B12', main_ingredients: ['비타민B12'] }] }
  const valid = await makeHandler(async () => geminiResponse(output), overrides)(request({ mode: 'compare', product_ids: [1, 2] }))
  assert.equal(valid.status, 200)
  for (const summary of ['오메가3 단백질 20g입니다.', '비타민D9가 있습니다.']) {
    const invalid = await makeHandler(async () => geminiResponse({ ...output, summary }), overrides)(request({ mode: 'compare', product_ids: [1, 2] }))
    assert.equal(invalid.status, 502)
  }
})

test('three types select different metrics by purpose and omit unavailable food data', () => {
  const rows = [{ quantity: 20, product: { ...product(1), protein: 24, calories: 100 } }, { quantity: 1, product: { ...product(2), protein: 20, calories: 120 } }, { quantity: 1, product: { ...product(3), protein: 5, calories: 400 } }]
  const weight = analyzeCartNutrition(rows, { primaryGoal: 'weight_control' })
  assert.equal(weight.balanceItems.find(item => item.key === 'calories').text, '2 / 3종')
  assert.equal(weight.balanceItems.find(item => item.key === 'protein').text, '2 / 3종')
  const diet = analyzeCartNutrition(rows, { primaryGoal: 'nutrition_management' })
  assert.equal(diet.balanceItems.some(item => item.key === 'calories'), false)
  assert.equal(diet.balanceItems.find(item => item.key === 'sodium').text, '3 / 3종')
  const lowSugar = analyzeCartNutrition(rows, { selectedConditions: ['저당'] })
  assert.deepEqual(lowSugar.balanceItems.map(item => item.key), ['sugar', 'attention'])
  const unknown = analyzeCartNutrition([{ quantity: 1, product: { ...product(1), protein: null } }], { primaryGoal: 'muscle_gain' })
  assert.equal(unknown.balanceItems.find(item => item.key === 'protein').count, 0)
  assert.match(unknown.productReasons[0].checks.join(' '), /판정을 보류/)
})
