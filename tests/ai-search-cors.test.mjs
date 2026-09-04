import test from 'node:test'
import assert from 'node:assert/strict'
import { isAllowedOrigin } from '../supabase/functions/ai-search/cors.js'
import { createAiSearchHandler } from '../supabase/functions/ai-search/handler.js'
import { geminiResponse } from './ai-search-cases.mjs'

test('local HTTP origins accept valid dynamic ports without listing them', () => {
  for (const hostname of ['localhost', '127.0.0.1']) {
    for (const port of ['', ':1', ':80', ':5173', ':5174', ':5175', ':59217', ':65535']) {
      assert.equal(isAllowedOrigin(`http://${hostname}${port}`, []), true)
    }
  }
})

test('nonlocal, malformed and lookalike origins are rejected; HTTPS production is exact', () => {
  for (const origin of ['', 'null', '*', 'https://localhost:5175', 'http://localhost:0',
    'http://localhost:65536', 'http://localhost:-1', 'http://localhost:abc',
    'http://localhost:5175/path', 'http://localhost:5175/', 'http://localhost:5175?x=1',
    'http://localhost:5175#x', 'http://user@localhost:5175', 'http://localhost.evil.test:5175',
    'http://127.0.0.1.evil.test:5175', 'http://127.1:5175', 'http://2130706433:5175',
    'http://[::1]:5175', 'http://192.168.0.1:5175', 'http://evil.test:5175']) {
    assert.equal(isAllowedOrigin(origin, ['*']), false, origin)
  }
  const list = ['https://caremarket.vercel.app']
  assert.equal(isAllowedOrigin(list[0], list), true)
  assert.equal(isAllowedOrigin('https://other.vercel.app', list), false)
  assert.equal(isAllowedOrigin('https://caremarket.vercel.app.evil.test', list), false)
  assert.equal(isAllowedOrigin('https://caremarket.vercel.app/path', list), false)
  assert.equal(isAllowedOrigin('http://caremarket.vercel.app', list), false)
})

test('OPTIONS, successful POST and every error response share CORS headers', async () => {
  for (const origin of ['http://localhost:5175', 'http://127.0.0.1:59217', 'https://caremarket.vercel.app']) {
    let calls = 0, mode = 'success', key = 'test-only'
    const handler = createAiSearchHandler({
      allowedOrigins: ['https://caremarket.vercel.app'], getApiKey: () => key,
      logger: { error() {} }, fetchImpl: async () => {
        calls += 1
        if (mode === 'upstream') return new Response(null, { status: 500 })
        return Response.json(geminiResponse({ category: '프로틴바·건강간식' }))
      },
    })
    const call = (method, body) => handler(new Request('http://example.test', {
      method, headers: { origin, 'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }))
    const check = async (response, status) => {
      assert.equal(response.status, status)
      assert.equal(response.headers.get('access-control-allow-origin'), origin)
      assert.equal(response.headers.get('access-control-allow-methods'), 'POST, OPTIONS')
      assert.equal(response.headers.get('access-control-allow-headers'), 'authorization, x-client-info, apikey, content-type')
      assert.equal(response.headers.get('vary'), 'Origin')
      await response.body?.cancel()
    }
    await check(await call('OPTIONS'), 204)
    assert.equal(calls, 0)
    await check(await call('POST', { query: '간식' }), 200)
    assert.equal(calls, 1)
    await check(await call('POST', { query: '' }), 400)
    await check(await call('GET'), 405)
    mode = 'upstream'
    await check(await call('POST', { query: '간식' }), 502)
    key = undefined
    await check(await call('POST', { query: '간식' }), 503)
    const blocked = await handler(new Request('http://example.test', { method: 'OPTIONS', headers: { origin: 'https://evil.test' } }))
    assert.equal(blocked.status, 403)
    assert.equal(blocked.headers.get('access-control-allow-origin'), null)
    assert.equal(blocked.headers.get('vary'), 'Origin')
  }
})
