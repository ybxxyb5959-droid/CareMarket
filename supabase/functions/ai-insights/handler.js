import {
  GEMINI_CART_SCHEMA,
  GEMINI_COMPARE_SCHEMA,
  validateInsightInput,
} from '../_shared/ai-insights-contract.js'

export const GEMINI_MODEL = 'gemini-3.5-flash-lite'
const MAX_BODY_BYTES = 4096
const MAX_CART_ITEMS = 50
const FORBIDDEN_LANGUAGE = /(질병|질환|진단|처방|치료|완치|예방|효능|의학적|의료적)/
const SYSTEM_PROMPT = `너는 CareMarket의 상품 비교 도우미다.
제공된 상품 데이터만 사용한다.
없는 사실이나 수치를 만들지 않는다.
질병 진단·치료·효능을 언급하지 않는다.
사용자의 구매 목적은 쇼핑 기준일 뿐 의료정보로 해석하지 않는다.
답변은 짧고 중립적인 한국어로 작성한다.
JSON 스키마의 설명 문장에는 숫자나 수치 단위를 쓰지 않는다.`

class InsightError extends Error {
  constructor(code, status) { super(code); this.code = code; this.status = status }
}

const safeNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

const safeStrings = (value, limit = 12) => (
  Array.isArray(value)
    ? value.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim().slice(0, 80)).slice(0, limit)
    : []
)

function productForPrompt(row) {
  return {
    product_id: safeNumber(row.product_id),
    name: String(row.name || '').slice(0, 120),
    category: String(row.category || '').slice(0, 80),
    price: safeNumber(row.price),
    calories: safeNumber(row.calories),
    protein: safeNumber(row.protein),
    carbs: safeNumber(row.carbs),
    fat: safeNumber(row.fat),
    sugar: safeNumber(row.sugar),
    sodium: safeNumber(row.sodium),
    allergens: safeStrings(row.allergens),
    contains_caffeine: row.contains_caffeine === true,
  }
}

async function readJson(request) {
  const reader = request.body?.getReader()
  if (!reader) throw new InsightError('INVALID_INPUT', 400)
  const chunks = []
  let size = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_BODY_BYTES) {
        void reader.cancel()
        throw new InsightError('INVALID_INPUT', 413)
      }
      chunks.push(value)
    }
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
    try { return JSON.parse(new TextDecoder().decode(bytes)) }
    catch { throw new InsightError('INVALID_INPUT', 400) }
  } finally {
    reader.releaseLock()
  }
}

function isAllowedOrigin(origin, productionOrigins) {
  if (!origin) return true
  try {
    const url = new URL(origin)
    if (url.protocol === 'http:'
      && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
      && /^http:\/\/(?:localhost|127\.0\.0\.1)(?::[0-9]+)?$/.test(origin)
      && url.port !== '0') return true
    return url.protocol === 'https:' && url.origin === origin && productionOrigins.includes(origin)
  } catch { return false }
}

function corsHeaders(origin) {
  return {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
    ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

const validNarrative = (value, maxLength) => (
  typeof value === 'string'
  && value.trim().length > 0
  && value.trim().length <= maxLength
  && !/[0-9０-９]/.test(value)
  && !FORBIDDEN_LANGUAGE.test(value)
)

function validateCompareOutput(value, productIds) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || !validNarrative(value.summary, 180)
    || !validNarrative(value.goal_fit_summary, 180)
    || !Array.isArray(value.highlights)
    || value.highlights.length !== productIds.length) throw new InsightError('INVALID_RESPONSE', 502)

  const ids = new Set()
  for (const highlight of value.highlights) {
    if (!highlight || typeof highlight !== 'object'
      || !productIds.includes(highlight.product_id)
      || ids.has(highlight.product_id)
      || !validNarrative(highlight.reason, 140)) throw new InsightError('INVALID_RESPONSE', 502)
    ids.add(highlight.product_id)
  }
  return {
    summary: value.summary.trim(),
    highlights: value.highlights.map(({ product_id, reason }) => ({ product_id, reason: reason.trim() })),
    goal_fit_summary: value.goal_fit_summary.trim(),
  }
}

function validateCartOutput(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || !validNarrative(value.summary, 180)
    || !validNarrative(value.goal_alignment, 180)
    || !Array.isArray(value.observations)
    || value.observations.length < 1
    || value.observations.length > 4
    || !value.observations.every((item) => validNarrative(item, 140))) throw new InsightError('INVALID_RESPONSE', 502)
  return {
    summary: value.summary.trim(),
    goal_alignment: value.goal_alignment.trim(),
    observations: value.observations.map((item) => item.trim()),
  }
}

async function callGemini({ apiKey, input, mode, fetchImpl, timeoutMs }) {
  const schema = mode === 'compare' ? GEMINI_COMPARE_SCHEMA : GEMINI_CART_SCHEMA
  const instruction = mode === 'compare'
    ? '선택된 각 상품을 빠짐없이 해석하되 숫자는 되풀이하지 말고 상대적 특징만 설명해라.'
    : '현재 장바구니의 구성, 구매목적과의 관련 특징, 카테고리 구성과 중복 유형만 설명해라.'
  let response
  try {
    response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: `${SYSTEM_PROMPT}\n${instruction}` }] },
        contents: [{ role: 'user', parts: [{ text: JSON.stringify(input) }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseJsonSchema: schema,
          candidateCount: 1,
          maxOutputTokens: mode === 'compare' ? 768 : 512,
          thinkingConfig: { thinkingLevel: 'minimal' },
        },
      }),
    })
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') throw new InsightError('TIMEOUT', 504)
    throw new InsightError('UPSTREAM_ERROR', 502)
  }
  if (!response.ok) throw new InsightError(response.status === 429 ? 'RATE_LIMITED' : 'UPSTREAM_ERROR', response.status === 429 ? 429 : 502)
  try {
    const payload = await response.json()
    const candidate = payload.candidates?.[0]
    if (candidate?.finishReason !== 'STOP') throw new Error('Incomplete response')
    const text = candidate.content?.parts?.filter((part) => !part.thought).map((part) => part.text || '').join('')
    if (!text || text.length > 8000) throw new Error('Invalid response')
    return JSON.parse(text)
  } catch {
    throw new InsightError('INVALID_RESPONSE', 502)
  }
}

export function createAiInsightsHandler({
  getApiKey,
  productionOrigins = [],
  getUser,
  getProfile,
  getProducts,
  getCartSnapshot,
  fetchImpl = fetch,
  logger = console,
  timeoutMs = 12000,
}) {
  return async (request) => {
    const origin = request.headers.get('origin') || ''
    const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) })
    try {
      if (!isAllowedOrigin(origin, productionOrigins)) throw new InsightError('ORIGIN_NOT_ALLOWED', 403)
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) })
      if (request.method !== 'POST') throw new InsightError('METHOD_NOT_ALLOWED', 405)
      if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) throw new InsightError('INVALID_INPUT', 415)
      const authorization = request.headers.get('authorization')
      if (!authorization?.startsWith('Bearer ')) throw new InsightError('AUTH_REQUIRED', 401)

      let user
      try { user = await getUser(authorization) }
      catch { throw new InsightError('AUTH_INVALID', 401) }
      if (!user?.id) throw new InsightError('AUTH_INVALID', 401)

      const checked = validateInsightInput(await readJson(request))
      if (checked.error) throw new InsightError(checked.error, 400)
      const apiKey = getApiKey()
      if (!apiKey) throw new InsightError('NOT_CONFIGURED', 503)

      let input
      if (checked.mode === 'compare') {
        const [profile, rows] = await Promise.all([getProfile(user.id), getProducts(checked.productIds)])
        const products = (rows || []).map(productForPrompt)
        if (products.length !== checked.productIds.length
          || products.some((product) => !checked.productIds.includes(product.product_id))) throw new InsightError('PRODUCT_NOT_FOUND', 404)
        products.sort((a, b) => checked.productIds.indexOf(a.product_id) - checked.productIds.indexOf(b.product_id))
        input = { mode: checked.mode, primary_goal: profile?.primary_goal || null, products }
      } else {
        const snapshot = await getCartSnapshot(user.id)
        const rows = snapshot?.items || []
        if (!rows.length) throw new InsightError('EMPTY_CART', 400)
        if (rows.length > MAX_CART_ITEMS) throw new InsightError('CART_TOO_LARGE', 400)
        input = {
          mode: checked.mode,
          primary_goal: snapshot.profile?.primary_goal || null,
          user_preferences: snapshot.preferences || null,
          cart_items: rows.map((row) => ({ quantity: safeNumber(row.quantity), product: productForPrompt(row.product || {}) })),
        }
      }

      const output = await callGemini({ apiKey, input, mode: checked.mode, fetchImpl, timeoutMs })
      const insight = checked.mode === 'compare'
        ? validateCompareOutput(output, checked.productIds)
        : validateCartOutput(output)
      return reply(200, { insight })
    } catch (error) {
      const safe = error instanceof InsightError ? error : new InsightError('INTERNAL_ERROR', 500)
      logger.error('ai-insights request failed', { code: safe.code, status: safe.status })
      return reply(safe.status, { error: { code: safe.code } })
    }
  }
}
