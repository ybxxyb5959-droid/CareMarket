import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { emptyConditions, finalizeConditions, explicitBounds, normalizeConditions, GEMINI_SEARCH_SCHEMA, validateQuery } from '../supabase/functions/_shared/ai-search-contract.js'
import { createAiSearchHandler } from '../supabase/functions/ai-search/handler.js'
import { filterAiProducts, requestAiConditions } from '../src/lib/ai-search.js'
import { searchCases, geminiResponse, modelOutput } from './ai-search-cases.mjs'

const origin = 'http://127.0.0.1:5173'
const req = (query, options = {}) => new Request('https://example.test/ai-search', {
  method: 'POST', headers: { origin, 'content-type': 'application/json', ...options.headers }, body: JSON.stringify({ query }), ...options,
})
const products = JSON.parse(fs.readFileSync(new URL('../data/products.seed.json', import.meta.url), 'utf8')).map((p, i) => ({
  id: 1001 + i, name: p.name, brand: p.brand, category: p.category, summary: p.summary, price: p.price,
  mainIngredients: p.main_ingredients, isActive: p.is_active, allergens: p.allergens, caffeine: p.contains_caffeine,
  nutrition: { protein: p.protein, sugar: p.sugar, sodium: p.sodium, calories: p.calories },
}))
const makeHandler = (fetchImpl, extra = {}) => createAiSearchHandler({ getApiKey: () => 'test-only-not-a-real-key', allowedOrigins: [origin], fetchImpl, logger: { error() {} }, ...extra })
const jsonResponse = data => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })

for (const [index, entry] of searchCases.entries()) {
  test(`query ${index + 1}: ${entry.query.slice(0, 40) || '(empty)'}`, async () => {
    let calls = 0
    const handler = makeHandler(async (url, options) => {
      calls += 1
      assert.match(url, /\/gemini-3\.5-flash-lite:generateContent$/)
      assert.ok(!url.includes('key='))
      const input = JSON.parse(options.body)
      assert.equal(input.generationConfig.responseMimeType, 'application/json')
      assert.deepEqual(input.generationConfig.thinkingConfig, { thinkingLevel: 'minimal' })
      for (const field of ['temperature', 'topP', 'topK', 'top_p', 'top_k']) {
        assert.ok(!Object.hasOwn(input.generationConfig, field))
      }
      assert.deepEqual(input.generationConfig.responseJsonSchema, GEMINI_SEARCH_SCHEMA)
      assert.deepEqual(JSON.parse(input.contents[0].parts[0].text), { query: entry.query })
      assert.ok(!JSON.stringify(input).includes('test-only-not-a-real-key'))
      return jsonResponse(geminiResponse(entry.parsed))
    })
    const response = await handler(req(entry.query))
    assert.equal(response.status, entry.status || 200)
    const data = await response.json()
    if (entry.status) { assert.equal(calls, 0); assert.deepEqual(data, { error: { code: 'INVALID_INPUT' } }); return }
    assert.equal(calls, 1)
    assert.deepEqual(data.conditions, { ...emptyConditions(), ...entry.expected })
    const before = JSON.stringify(products)
    const matches = filterAiProducts(products, data.conditions)
    assert.ok(matches.every(p => products.includes(p)))
    assert.equal(JSON.stringify(products), before)
    if (entry.expected.sort_by === 'price_asc') assert.ok(matches.every((p, i) => !i || matches[i - 1].price <= p.price))
    if (entry.expected.excluded_allergens) assert.ok(matches.every(p => !p.allergens.some(a => entry.expected.excluded_allergens.includes(a))))
    console.log(`Fixture query ${index + 1}: ${matches.length} / 100 seed products`)
  })
}

test('invalid values normalize; unknown fields and invented keywords are removed', () => {
  assert.deepEqual(normalizeConditions({ category: 'unknown', protein_min: -1, sugar_max: '3', sodium_max: 1e99,
    calories_max: Infinity, price_max: NaN, excluded_allergens: ['토마토', '우유', '우유'],
    exclude_caffeine: 'true', sort_by: 'SQL', products: [{ id: 1 }], role: 'admin' }), { ...emptyConditions(), excluded_allergens: ['우유'] })
  assert.deepEqual(finalizeConditions(modelOutput({ keywords: ['없는상품이름', '프로틴'] }), '프로틴 보여줘').keywords, ['프로틴'])
})

test('explicit bounds beat model mistakes and qualitative defaults; units and zero preserved', () => {
  const result = finalizeConditions(modelOutput({ sugar_max: 99, protein_min: 5, price_max: 999,
    qualitative_filters: ['low_sugar', 'high_protein'] }), '당 3g 이하 단백질 20g 이상 15000원 이하')
  assert.equal(result.sugar_max, 3)
  assert.equal(result.protein_min, 20)
  assert.equal(result.price_max, 15000)
  assert.deepEqual(explicitBounds('나트륨 0.2g 이하 2만원 이하'), { sodium_max: 200, price_max: 20000 })
  assert.equal(finalizeConditions(modelOutput({ sugar_max: 55 }), '간식').sugar_max, null)
  assert.equal(finalizeConditions(modelOutput({ sugar_max: 55 }), '당 0g 이하').sugar_max, 0)
  assert.equal(finalizeConditions(modelOutput({ qualitative_filters: ['low_sugar'] }), '당 -3g 이하 저당').sugar_max, null)
  assert.ok(validateQuery(42).error)
})

test('keywords match name, brand, category, summary, ingredients with AND semantics', () => {
  const item = { ...products[0], name: 'Plain', brand: 'Care Brand', category: 'Test', summary: 'Cocoa snack', mainIngredients: ['Oats'], isActive: true }
  assert.equal(filterAiProducts([item], { keywords: ['brand', 'cocoa', 'oats'] }).length, 1)
  assert.equal(filterAiProducts([item], { keywords: ['brand', 'missing'] }).length, 0)
  assert.equal(filterAiProducts([{ ...item, isActive: false }], {}).length, 0)
  assert.equal(filterAiProducts(products, { price_max: 0 }).length, 0)
})

test('CORS, methods, malformed/oversized bodies reject before Gemini', async () => {
  const handler = makeHandler(() => { throw new Error('Must not fetch') })
  assert.equal((await handler(new Request('https://example.test', { method: 'OPTIONS', headers: { origin } }))).status, 204)
  assert.equal((await handler(new Request('https://example.test', { headers: { origin } }))).status, 405)
  assert.equal((await handler(req('간식', { headers: { origin: 'https://evil.test' } }))).status, 403)
  assert.equal((await handler(req('간식', { headers: { origin, 'content-type': 'text/plain' } }))).status, 415)
  assert.equal((await handler(req('간식', { body: '{broken' }))).status, 400)
  assert.equal((await handler(req('x'.repeat(3000)))).status, 413)
})

test('rate limit and missing key use safe errors without raw sensitive output', async () => {
  const logs = []
  const handler = makeHandler(() => { throw new Error('Must not fetch') }, { getApiKey: () => undefined, logger: { error(...args) { logs.push(args) } } })
  for (let n = 0; n < 12; n++) assert.equal((await handler(req('간식'))).status, 503)
  const limited = await handler(req('간식'))
  assert.equal(limited.status, 429)
  assert.equal(limited.headers.get('Retry-After'), '60')
  assert.ok(!JSON.stringify(logs).includes('간식'))
})

test('invalid/truncated JSON, upstream failures and timeouts never become successful default results', async () => {
  for (const fetchImpl of [
    async () => new Response('private key upstream detail', { status: 500 }),
    async () => jsonResponse({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{}' }] } }] }),
    async () => jsonResponse({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{broken' }] } }] }),
    async () => jsonResponse({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{}' }] } }] }),
    async () => { throw new DOMException('private timeout detail', 'TimeoutError') },
  ]) {
    const response = await makeHandler(fetchImpl)(req('간식'))
    assert.ok(response.status >= 500)
    const data = await response.json()
    assert.ok(data.error.code)
    assert.equal(data.conditions, undefined)
    assert.ok(!JSON.stringify(data).includes('private'))
  }
})

test('upstream diagnostics redact secrets and queries; clients receive only a code', async () => {
  const key = 'test-secret/+key', query = 'private shopper query'
  const logs = []
  const handler = makeHandler(async () => new Response(JSON.stringify({ error: {
    code: 400, status: 'INVALID_ARGUMENT',
    message: `Invalid schema. ${key} ${encodeURIComponent(key)} ${query} AIzaFakeSecret Bearer private-token https://example.test/?key=private`,
    details: [{ secret: 'never log details' }],
  } }), { status: 400 }), { getApiKey: () => key, logger: { error(...args) { logs.push(args) } } })
  const response = await handler(req(query))
  assert.equal(response.status, 502)
  assert.deepEqual(await response.json(), { error: { code: 'UPSTREAM_ERROR' } })
  const diagnostic = logs.find(([event]) => event === 'ai-search upstream failure')[1]
  assert.equal(diagnostic.status, 400)
  assert.equal(diagnostic.error.code, 400)
  assert.equal(diagnostic.error.status, 'INVALID_ARGUMENT')
  assert.match(diagnostic.error.message, /^Invalid schema\./)
  for (const secret of [key, encodeURIComponent(key), query, 'AIzaFakeSecret', 'private-token', 'never log details', '?key=private']) {
    assert.ok(!JSON.stringify(logs).includes(secret))
  }
})

test('non-JSON upstream errors retain HTTP status without logging the body', async () => {
  const logs = []
  const response = await makeHandler(async () => new Response('private HTML error', { status: 503 }),
    { logger: { error(...args) { logs.push(args) } } })(req('간식'))
  assert.equal(response.status, 502)
  assert.deepEqual(logs[0][1].error, { code: null, status: null, message: null })
  assert.equal(logs[0][1].status, 503)
  assert.ok(!JSON.stringify(logs).includes('private HTML'))
})

test('frontend function invocation sends only query and rejects malformed success responses', async () => {
  const client = { functions: { async invoke(name, options) {
    assert.equal(name, 'ai-search')
    assert.deepEqual(options.body, { query: '간식' })
    return { data: { conditions: {} }, error: null }
  } } }
  await assert.rejects(requestAiConditions(client, '간식'), /해석하지/)
  const signal = AbortSignal.abort()
  await assert.rejects(requestAiConditions(client, '간식', signal), { name: 'AbortError' })
})
