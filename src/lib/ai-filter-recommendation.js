import {
  validateRecommendationInput,
  validateRecommendationResult,
} from '../../supabase/functions/_shared/ai-filter-recommendation-contract.js'

const recommendationCache = new Map()

const ERROR_MESSAGES = {
  NOT_CONFIGURED: 'AI 조건 추천이 아직 준비되지 않았습니다. 잠시 후 다시 이용해 주세요.',
  RATE_LIMITED: '조건 추천 요청이 많습니다. 잠시 후 다시 시도해 주세요.',
  TIMEOUT: '조건 추천 시간이 초과되었습니다. 다시 시도해 주세요.',
  INVALID_RESPONSE: '추천 조건을 해석하지 못했습니다. 다시 시도해 주세요.',
}

function copyRecommendation(recommendation) {
  return { ...recommendation, recommendedFilters: [...recommendation.recommendedFilters] }
}

export async function requestAiFilterRecommendation(client, input, signal) {
  const checked = validateRecommendationInput(input)
  if (checked.error) throw new Error(checked.error)
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

  const cacheKey = JSON.stringify(checked.value)
  const cached = recommendationCache.get(cacheKey)
  if (cached) return copyRecommendation(cached)

  const { data, error } = await client.functions.invoke('ai-filter-recommendation', {
    body: checked.value,
    signal,
    timeout: 18000,
  })
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  if (error) {
    let code
    try { code = (await error.context?.json())?.error?.code } catch { /* Gateway errors need not be JSON. */ }
    console.error('AI filter recommendation request failed:', {
      code: code || 'FUNCTION_UNAVAILABLE',
      status: error.context?.status,
    })
    throw new Error(ERROR_MESSAGES[code] || '조건 추천을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.')
  }

  const validated = validateRecommendationResult(data?.recommendation, checked.value.availableFilters)
  if (validated.error) throw new Error(ERROR_MESSAGES.INVALID_RESPONSE)
  recommendationCache.set(cacheKey, copyRecommendation(validated.value))
  return copyRecommendation(validated.value)
}

export function clearAiFilterRecommendationCache() {
  recommendationCache.clear()
}
