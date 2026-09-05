import {
  GEMINI_CART_SCHEMA,
  GEMINI_COMPARE_SCHEMA,
  validateInsightInput,
} from '../_shared/ai-insights-contract.js'
import {
  analyzeCartNutrition,
  cartAnalysisBasis,
  cartAnalysisForGemini,
  composeCartInsight,
} from '../_shared/cart-nutrition-analysis.js'

export const GEMINI_MODEL = 'gemini-3.5-flash-lite'
const MAX_BODY_BYTES = 4096
const MAX_CART_ITEMS = 50
const FORBIDDEN_LANGUAGE = /(질병|질환|진단|처방|치료|완치|예방|효능|의학적|의료적)/
const FORBIDDEN_CART_LANGUAGE = /(권장\s*섭취량|과다|부족|위험|초과|불균형|반드시|하루\s*섭취)/
const SYSTEM_PROMPT = `너는 CareMarket의 상품 비교 및 장바구니 영양 구성 분석 도우미다.
제공된 상품 데이터만 사용한다.
없는 사실이나 수치를 만들지 않는다.
질병 진단·치료·효능을 언급하지 않는다.
사용자의 구매 목적은 쇼핑 기준일 뿐 의료정보로 해석하지 않는다.
점수, 등급, 최적도 같은 근거 없는 평가 수치를 만들지 않는다.
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
    serving_size: row.serving_size ? String(row.serving_size).slice(0, 80) : null,
    allergens: safeStrings(row.allergens),
    main_ingredients: safeStrings(row.main_ingredients),
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
    || value.highlights.length !== productIds.length
    || !value.recommendation
    || typeof value.recommendation !== 'object'
    || Array.isArray(value.recommendation)
    || !productIds.includes(value.recommendation.product_id)
    || !validNarrative(value.recommendation.reason, 140)) throw new InsightError('INVALID_RESPONSE', 502)

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
    recommendation: {
      product_id: value.recommendation.product_id,
      reason: value.recommendation.reason.trim(),
    },
  }
}

function validateCartOutput(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || !validNarrative(value.headline, 90)
    || FORBIDDEN_CART_LANGUAGE.test(value.headline)
    || !validNarrative(value.summary, 180)
    || FORBIDDEN_CART_LANGUAGE.test(value.summary)
    || !Array.isArray(value.actions)
    || value.actions.length < 1
    || value.actions.length > 2
    || !value.actions.every((item) => validNarrative(item, 140) && !FORBIDDEN_CART_LANGUAGE.test(item))) throw new InsightError('INVALID_RESPONSE', 502)
  return {
    headline: value.headline.trim(),
    summary: value.summary.trim(),
    actions: value.actions.map((item) => item.trim()),
  }
}

async function callGemini({ apiKey, input, mode, fetchImpl, timeoutMs }) {
  const schema = mode === 'compare' ? GEMINI_COMPARE_SCHEMA : GEMINI_CART_SCHEMA
  const instruction = mode === 'compare'
    ? '선택된 각 상품을 빠짐없이 해석하되 숫자는 되풀이하지 말고 상대적 특징만 설명해라. 비교 상품 중 현재 구매 목적에 가장 잘 맞는 상품 한 가지만 recommendation으로 선택하고, 제공된 상품 정보에 근거해 이유를 설명해라. 구매 목적이 없으면 영양 구성과 가격을 함께 고려해 한 가지를 선택해라.'
    : `입력은 이미 코드가 수량까지 반영해 판정한 장바구니 분석 결과다.
analysis의 dominant, good, needs_attention, needs_balance, composition_signals, balance_items, confirmed_facts를 변경하거나 새로 판정하지 말고 쉽게 문장화해라.
제안은 allowed_action_directions 범위 안에서만 하고, 특정 상품이나 상품 ID를 만들지 마라.
single_product가 true여도 repeated_protein_product 신호가 있으면 한 종류의 단백질 식품에 구성이 집중된 점과 상품 다양성을 설명해라. 이 신호가 없으면 해당 상품의 특징만 보수적으로 설명해라.
vary_fiber_food_groups 방향이 있으면 식이섬유를 보완할 수 있는 식품군이라는 구성 관점으로 설명하고 채소·통곡물·견과류 계열 상품을 제안해라. 식이섬유 수치나 결핍 판정을 만들지 마라.
권장섭취량, 과다, 부족, 위험, 초과, 의무적 표현을 쓰지 마라.`
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

      let input
      let basis = null
      let cartAnalysis = null
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
        const selectedConditions = ['low_sugar', 'low_sodium', 'high_protein', 'exclude_caffeine']
          .filter((key) => snapshot?.preferences?.[key] === true)
        const context = {
          primaryGoal: snapshot?.profile?.primary_goal || null,
          selectedConditions,
          excludedAllergens: snapshot?.preferences?.excluded_allergens,
        }
        basis = cartAnalysisBasis(context)
        cartAnalysis = analyzeCartNutrition(rows, context)
        input = cartAnalysisForGemini(cartAnalysis, basis)
      }

      const apiKey = getApiKey()
      if (!apiKey) {
        if (cartAnalysis) return reply(200, { insight: composeCartInsight(cartAnalysis, basis) })
        throw new InsightError('NOT_CONFIGURED', 503)
      }

      try {
        const output = await callGemini({ apiKey, input, mode: checked.mode, fetchImpl, timeoutMs })
        if (checked.mode === 'compare') {
          return reply(200, { insight: validateCompareOutput(output, checked.productIds) })
        }
        return reply(200, { insight: composeCartInsight(cartAnalysis, basis, validateCartOutput(output), true) })
      } catch (error) {
        if (!cartAnalysis) throw error
        const safe = error instanceof InsightError ? error : new InsightError('INTERNAL_ERROR', 500)
        logger.error('ai-insights Gemini explanation failed; deterministic fallback returned', { code: safe.code, status: safe.status })
        return reply(200, { insight: composeCartInsight(cartAnalysis, basis) })
      }
    } catch (error) {
      const safe = error instanceof InsightError ? error : new InsightError('INTERNAL_ERROR', 500)
      logger.error('ai-insights request failed', { code: safe.code, status: safe.status })
      return reply(safe.status, { error: { code: safe.code } })
    }
  }
}
