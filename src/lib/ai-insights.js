import { supabase } from './supabase'
import { validateInsightInput } from '../../supabase/functions/_shared/ai-insights-contract.js'

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
    console.error('AI insights request failed:', { code: code || 'FUNCTION_UNAVAILABLE', status: error.context?.status })
    throw new Error(ERROR_MESSAGES[code] || 'AI 분석에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.')
  }
  if (!data?.insight || typeof data.insight !== 'object' || Array.isArray(data.insight)) {
    throw new Error(ERROR_MESSAGES.INVALID_RESPONSE)
  }
  return data.insight
}

export const requestProductComparison = (productIds, signal) => (
  invoke({ mode: 'compare', product_ids: productIds }, signal)
)

export const requestCartSummary = (signal) => invoke({ mode: 'cart_summary' }, signal)
