import test from 'node:test'
import assert from 'node:assert/strict'
import { createAiInsightsHandler, GEMINI_MODEL } from '../supabase/functions/ai-insights/handler.js'
import { GEMINI_CART_SCHEMA, GEMINI_COMPARE_SCHEMA } from '../supabase/functions/_shared/ai-insights-contract.js'
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
  allergens: ['대두'],
  contains_caffeine: false,
})
const geminiResponse = (value) => new Response(JSON.stringify({
  candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(value) }] } }],
}), { headers: { 'Content-Type': 'application/json' } })
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

for (const ids of [[1, 2], [1, 2, 3]]) {
  test(`compares exactly ${ids.length} server-loaded products`, async () => {
    let fetchedIds
    const output = {
      summary: '선택한 상품은 영양 구성과 가격 부담에 차이가 있습니다.',
      highlights: ids.map((id) => ({ product_id: id, reason: '선택 상품 중 단백질 구성이 두드러집니다.' })),
      goal_fit_summary: '현재 구매목적에서는 단백질 구성과 가격을 함께 살펴볼 수 있습니다.',
    }
    const handler = makeHandler(async (url, options) => {
      assert.match(url, new RegExp(`/${GEMINI_MODEL}:generateContent$`))
      const payload = JSON.parse(options.body)
      assert.deepEqual(payload.generationConfig.responseJsonSchema, GEMINI_COMPARE_SCHEMA)
      const prompt = JSON.parse(payload.contents[0].parts[0].text)
      assert.deepEqual(prompt.products.map((item) => item.product_id), ids)
      assert.equal(prompt.primary_goal, 'muscle_gain')
      assert.equal(JSON.stringify(payload).includes('test-only-key'), false)
      return geminiResponse(output)
    }, { getProducts: async (requested) => { fetchedIds = requested; return requested.map((id) => product(id)) } })
    const response = await handler(request({ mode: 'compare', product_ids: ids }))
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
  const output = {
    summary: '장바구니에는 단백질 중심 상품이 담겨 있습니다.',
    goal_alignment: '현재 구매목적과 관련된 상품 구성이 눈에 띕니다.',
    observations: ['같은 카테고리 상품이 반복되어 구성의 유사성이 있습니다.'],
  }
  const handler = makeHandler(async (_url, options) => {
    const payload = JSON.parse(options.body)
    assert.deepEqual(payload.generationConfig.responseJsonSchema, GEMINI_CART_SCHEMA)
    const prompt = JSON.parse(payload.contents[0].parts[0].text)
    assert.equal(prompt.cart_items[0].quantity, 2)
    assert.equal(prompt.primary_goal, 'muscle_gain')
    return geminiResponse(output)
  }, {
    getCartSnapshot: async (userId) => {
      requestedUser = userId
      return { profile: { primary_goal: 'muscle_gain' }, preferences: { high_protein: true }, items: [{ quantity: 2, product: product(1) }] }
    },
  })
  const response = await handler(request({ mode: 'cart_summary' }))
  assert.equal(response.status, 200)
  assert.equal(requestedUser, 'user-a')
  assert.deepEqual((await response.json()).insight, output)
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
  }))
  const response = await handler(request({ mode: 'compare', product_ids: [1, 2] }))
  assert.equal(response.status, 502)
  assert.deepEqual(await response.json(), { error: { code: 'INVALID_RESPONSE' } })
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
