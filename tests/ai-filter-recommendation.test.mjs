import test from 'node:test'
import assert from 'node:assert/strict'
import {
  AI_FILTER_IDS,
  availableFilterIds,
  recommendationSchema,
  validateRecommendationInput,
  validateRecommendationResult,
} from '../supabase/functions/_shared/ai-filter-recommendation-contract.js'
import { createAiFilterRecommendationHandler } from '../supabase/functions/ai-filter-recommendation/handler.js'
import {
  clearAiFilterRecommendationCache,
  requestAiFilterRecommendation,
} from '../src/lib/ai-filter-recommendation.js'

const origin = 'http://127.0.0.1:5173'
const inputFor = (currentCategory, options = {}) => ({
  currentCategory,
  availableFilters: availableFilterIds(currentCategory),
  goal: '체중 관리',
  currentlySelected: [],
  naturalLanguageRequest: null,
  ...options,
})
const requestFor = input => new Request('https://example.test/ai-filter-recommendation', {
  method: 'POST',
  headers: { origin, 'content-type': 'application/json' },
  body: JSON.stringify(input),
})
const geminiResponse = recommendation => Response.json({
  candidates: [{
    finishReason: 'STOP',
    content: { parts: [{ text: JSON.stringify(recommendation) }] },
  }],
})

test('category mapping exposes only meaningful existing quick-filter IDs', () => {
  assert.deepEqual(availableFilterIds('소스·조미료'), ['low_sugar', 'low_sodium'])
  assert.deepEqual(availableFilterIds('건강음료'), ['low_sugar', 'no_caffeine'])
  assert.deepEqual(availableFilterIds('프로틴'), ['high_protein', 'low_sugar', 'low_sodium'])
  assert.deepEqual(availableFilterIds('전체상품'), AI_FILTER_IDS)
  assert.deepEqual(availableFilterIds('존재하지 않음'), [])
})

test('input validation rejects invented, mismatched, and unavailable filters', () => {
  assert.ok(validateRecommendationInput(inputFor('소스·조미료')).value)
  assert.match(validateRecommendationInput({ ...inputFor('소스·조미료'), availableFilters: ['high_protein'] }).error, /올바르지/)
  assert.match(validateRecommendationInput({ ...inputFor('소스·조미료'), currentlySelected: ['no_caffeine'] }).error, /선택 조건/)
  assert.match(validateRecommendationInput({ ...inputFor('소스·조미료'), goal: '질병 치료' }).error, /구매 목적/)
  assert.match(validateRecommendationInput(inputFor('없는 카테고리')).error, /추천 가능/)
})

test('dynamic structured-output schema and result validation enforce available filters', () => {
  const available = availableFilterIds('건강음료')
  const schema = recommendationSchema(available)
  assert.deepEqual(schema.properties.recommendedFilters.items.enum, available)
  assert.deepEqual(validateRecommendationResult({
    recommendedFilters: ['low_sugar', 'low_sugar'],
    reason: '현재 상품군과 구매 목적을 기준으로 저당 조건을 추천해요.',
  }, available).value.recommendedFilters, ['low_sugar'])
  assert.match(validateRecommendationResult({
    recommendedFilters: ['high_protein'],
    reason: '잘못된 추천',
  }, available).error, /올바르지/)
})

test('Edge Function sends only scoped context and returns safe filter IDs', async () => {
  const input = inputFor('소스·조미료', { currentlySelected: ['low_sugar'] })
  let calls = 0
  const handler = createAiFilterRecommendationHandler({
    getApiKey: () => 'fixture-key-not-real',
    allowedOrigins: [origin],
    logger: { error() {} },
    fetchImpl: async (url, options) => {
      calls += 1
      assert.match(url, /\/gemini-3\.5-flash-lite:generateContent$/)
      assert.ok(!url.includes('key='))
      const body = JSON.parse(options.body)
      assert.deepEqual(JSON.parse(body.contents[0].parts[0].text), input)
      assert.deepEqual(body.generationConfig.responseJsonSchema, recommendationSchema(input.availableFilters))
      assert.ok(!JSON.stringify(body).includes('productId'))
      return geminiResponse({
        recommendedFilters: ['low_sugar', 'low_sodium'],
        reason: '체중 관리 목적과 소스 상품군을 고려해 당류와 나트륨 조건을 추천해요.',
      })
    },
  })

  const response = await handler(requestFor(input))
  assert.equal(response.status, 200)
  assert.equal(calls, 1)
  assert.deepEqual((await response.json()).recommendation.recommendedFilters, ['low_sugar', 'low_sodium'])
})

test('Edge Function rejects a model filter outside the category allowlist', async () => {
  const handler = createAiFilterRecommendationHandler({
    getApiKey: () => 'fixture-key-not-real',
    allowedOrigins: [origin],
    logger: { error() {} },
    fetchImpl: async () => geminiResponse({
      recommendedFilters: ['high_protein'],
      reason: '허용되지 않은 응답',
    }),
  })
  const response = await handler(requestFor(inputFor('소스·조미료')))
  assert.equal(response.status, 502)
  assert.deepEqual(await response.json(), { error: { code: 'INVALID_RESPONSE' } })
})

test('invalid requests, upstream errors, and retries do not become successful recommendations', async () => {
  let upstreamCalls = 0
  const handler = createAiFilterRecommendationHandler({
    getApiKey: () => 'fixture-key-not-real',
    allowedOrigins: [origin],
    logger: { error() {} },
    fetchImpl: async () => { upstreamCalls += 1; return new Response('private upstream body', { status: 503 }) },
  })
  const invalid = await handler(requestFor({ ...inputFor('건강음료'), availableFilters: ['high_protein'] }))
  assert.equal(invalid.status, 400)
  assert.equal(upstreamCalls, 0)
  const failed = await handler(requestFor(inputFor('건강음료')))
  assert.equal(failed.status, 502)
  assert.equal(upstreamCalls, 1)
  assert.ok(!(await failed.text()).includes('private'))
})

test('frontend invokes on demand, caches successful identical input, and never caches failure', async () => {
  clearAiFilterRecommendationCache()
  const input = inputFor('프로틴', { goal: '근육량 증가' })
  let calls = 0
  const client = { functions: { async invoke(name, options) {
    calls += 1
    assert.equal(name, 'ai-filter-recommendation')
    assert.deepEqual(options.body, input)
    return { data: { recommendation: {
      recommendedFilters: ['high_protein'],
      reason: '근육량 증가 목적과 프로틴 상품군에 맞춰 고단백 조건을 추천해요.',
    } }, error: null }
  } } }
  assert.deepEqual((await requestAiFilterRecommendation(client, input)).recommendedFilters, ['high_protein'])
  assert.deepEqual((await requestAiFilterRecommendation(client, input)).recommendedFilters, ['high_protein'])
  assert.equal(calls, 1)

  const failingInput = inputFor('건강음료')
  const failingClient = { functions: { async invoke() {
    return { data: null, error: { context: { status: 503, async json() { return { error: { code: 'NOT_CONFIGURED' } } } } } }
  } } }
  const originalError = console.error
  console.error = () => {}
  try {
    await assert.rejects(requestAiFilterRecommendation(failingClient, failingInput), /준비되지/)
    await assert.rejects(requestAiFilterRecommendation(failingClient, failingInput), /준비되지/)
  } finally {
    console.error = originalError
  }
})
