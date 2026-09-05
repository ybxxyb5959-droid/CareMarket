import { supabase } from './supabase'
import { validateInsightInput } from '../../supabase/functions/_shared/ai-insights-contract.js'
import { isCartInsight } from '../../supabase/functions/_shared/cart-nutrition-analysis.js'

const ERROR_MESSAGES = {
  AUTH_REQUIRED: '로그인 후 AI 기능을 이용해 주세요.',
  AUTH_INVALID: '로그인 정보를 확인할 수 없습니다. 다시 로그인해 주세요.',
  INVALID_INPUT: '요청할 상품을 다시 선택해 주세요.',
  PRODUCT_NOT_FOUND: '선택한 상품 중 현재 비교할 수 없는 상품이 있습니다.',
  EMPTY_CART: '분석할 장바구니 상품이 없습니다.',
  CART_TOO_LARGE: '장바구니 상품 수를 줄인 뒤 다시 시도해 주세요.',
  NOT_CONFIGURED: 'AI 분석이 아직 준비되지 않았습니다.',
  RATE_LIMITED: 'AI 요청이 많습니다. 잠시 후 다시 시도해 주세요.',
  TIMEOUT: 'AI 분석 시간이 초과되었습니다. 다시 시도해 주세요.',
  INVALID_RESPONSE: 'AI 분석 결과를 안전하게 확인하지 못했습니다. 다시 시도해 주세요.',
  FUNCTION_NOT_FOUND: 'AI 분석 기능이 아직 연결되지 않았어요.',
  UPSTREAM_ERROR: 'AI 서비스 응답이 원활하지 않아요. 잠시 후 다시 시도해 주세요.',
  INTERNAL_ERROR: 'AI 분석 처리 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.',
}

async function invoke(body, signal) {
  const checked = validateInsightInput(body)
  if (checked.error) throw new Error(ERROR_MESSAGES.INVALID_INPUT)
  const { data, error } = await supabase.functions.invoke('ai-insights', {
    body,
    signal,
    timeout: 18000,
  })
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  if (error) {
    let code
    try { code = (await error.context?.json())?.error?.code } catch { /* A gateway response may not contain JSON. */ }
    if (!code && error.context?.status === 404) code = 'FUNCTION_NOT_FOUND'
    if (!code && error.name === 'FunctionsFetchError') code = 'UPSTREAM_ERROR'
    console.error('AI insights request failed:', { code: code || 'FUNCTION_UNAVAILABLE', status: error.context?.status })
    throw new Error(ERROR_MESSAGES[code] || '잠시 후 다시 시도해 주세요.')
  }
  if (!data?.insight || typeof data.insight !== 'object' || Array.isArray(data.insight)) {
    throw new Error(ERROR_MESSAGES.INVALID_RESPONSE)
  }
  if (body.mode === 'cart_summary' && !isCartInsight(data.insight)) {
    throw new Error(ERROR_MESSAGES.INVALID_RESPONSE)
  }
  return data.insight
}

export const requestProductComparison = (productIds, signal) => (
  invoke({ mode: 'compare', product_ids: productIds }, signal)
)

let cartSummaryRequest = null
const cartSummaryCache = new Map()
const CART_SUMMARY_CACHE_MAX = 8

export const getCachedCartSummary = (cartSignature) => (
  cartSummaryCache.get(cartSignature) || null
)

export const setCachedCartSummary = (cartSignature, insight) => {
  if (!cartSignature || !isCartInsight(insight)) return
  cartSummaryCache.delete(cartSignature)
  cartSummaryCache.set(cartSignature, insight)
  if (cartSummaryCache.size > CART_SUMMARY_CACHE_MAX) {
    cartSummaryCache.delete(cartSummaryCache.keys().next().value)
  }
}

export const requestCartSummary = (cartSignature) => {
  if (cartSummaryRequest?.cartSignature === cartSignature) return cartSummaryRequest.promise
  cartSummaryRequest?.controller.abort()

  const controller = new AbortController()
  const request = {
    cartSignature,
    controller,
    promise: null,
  }
  request.promise = invoke({ mode: 'cart_summary' }, controller.signal)
    .then((insight) => {
      setCachedCartSummary(cartSignature, insight)
      return insight
    })
    .finally(() => {
      if (cartSummaryRequest === request) cartSummaryRequest = null
    })
  cartSummaryRequest = request
  return request.promise
}
