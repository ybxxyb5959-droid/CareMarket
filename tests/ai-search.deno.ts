import { createAiSearchHandler } from '../supabase/functions/ai-search/handler.js'

Deno.test('local Edge HTTP: preflight, validation and missing-secret response', async () => {
  const origin = 'http://127.0.0.1:5173'
  const server = Deno.serve({ hostname: '127.0.0.1', port: 0, onListen() {} }, createAiSearchHandler({
    getApiKey: () => undefined,
    allowedOrigins: [origin],
    fetchImpl: () => { throw new Error('Unconfigured Edge must not call Gemini') },
  }))
  try {
    const url = `http://127.0.0.1:${server.addr.port}/`
    const preflight = await fetch(url, { method: 'OPTIONS', headers: { origin } })
    if (preflight.status !== 204 || preflight.headers.get('access-control-allow-origin') !== origin) throw new Error('CORS preflight failed')
    await preflight.body?.cancel()
    for (const [query, status, code] of [
      ['', 400, 'INVALID_INPUT'],
      ['간식', 503, 'NOT_CONFIGURED'],
    ] as const) {
      const response = await fetch(url, { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) })
      const data = await response.json()
      if (response.status !== status || data.error?.code !== code) throw new Error('Unexpected Edge response')
    }
  } finally { await server.shutdown() }
})
