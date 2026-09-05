export const AI_FILTER_IDS = Object.freeze([
  'low_sugar',
  'low_sodium',
  'high_protein',
  'no_caffeine',
])

export const AI_FILTER_GOALS = Object.freeze([
  '근육량 증가',
  '체중 관리',
  '식단 영양 관리',
  '영양제 탐색',
])

// Header/catalog category values are the source of truth. Keep category awareness in
// this shared contract so the browser and Edge Function cannot drift apart.
export const CATEGORY_AVAILABLE_FILTERS = Object.freeze({
  '전체상품': AI_FILTER_IDS,
  '프로틴': Object.freeze(['high_protein', 'low_sugar', 'low_sodium']),
  '간편식': Object.freeze(['high_protein', 'low_sugar', 'low_sodium']),
  '건강음료': Object.freeze(['low_sugar', 'no_caffeine']),
  '건강간식': Object.freeze(['low_sugar', 'high_protein', 'low_sodium']),
  '영양제': Object.freeze(['no_caffeine']),
  '소스·조미료': Object.freeze(['low_sugar', 'low_sodium']),
  '건강식품': Object.freeze(['low_sugar', 'no_caffeine']),
})

export const RECOMMENDATION_REQUEST_MAX_LENGTH = 200

export function availableFilterIds(category) {
  return [...(CATEGORY_AVAILABLE_FILTERS[category] || [])]
}

export function validateRecommendationInput(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { error: '추천 조건을 확인해 주세요.' }
  }

  const currentCategory = typeof raw.currentCategory === 'string' ? raw.currentCategory.trim() : ''
  if (!Object.hasOwn(CATEGORY_AVAILABLE_FILTERS, currentCategory)) {
    return { error: '현재 카테고리에서 추천 가능한 조건이 없습니다.' }
  }

  const availableFilters = availableFilterIds(currentCategory)
  if (!Array.isArray(raw.availableFilters)
    || raw.availableFilters.length !== availableFilters.length
    || raw.availableFilters.some((filter, index) => filter !== availableFilters[index])) {
    return { error: '현재 카테고리의 조건 정보가 올바르지 않습니다.' }
  }

  const goal = raw.goal === null ? null : (typeof raw.goal === 'string' ? raw.goal.trim() : '')
  if (goal !== null && !AI_FILTER_GOALS.includes(goal)) {
    return { error: '구매 목적을 확인해 주세요.' }
  }

  if (!Array.isArray(raw.currentlySelected)
    || raw.currentlySelected.some(filter => !availableFilters.includes(filter))) {
    return { error: '현재 선택 조건을 확인해 주세요.' }
  }
  const currentlySelected = [...new Set(raw.currentlySelected)]

  let naturalLanguageRequest = null
  if (raw.naturalLanguageRequest !== undefined && raw.naturalLanguageRequest !== null) {
    if (typeof raw.naturalLanguageRequest !== 'string') return { error: '조건 요청을 확인해 주세요.' }
    naturalLanguageRequest = raw.naturalLanguageRequest.trim() || null
    if (naturalLanguageRequest && naturalLanguageRequest.length > RECOMMENDATION_REQUEST_MAX_LENGTH) {
      return { error: `조건 요청은 ${RECOMMENDATION_REQUEST_MAX_LENGTH}자 이내로 입력해 주세요.` }
    }
  }

  return {
    value: { currentCategory, availableFilters, goal, currentlySelected, naturalLanguageRequest },
  }
}

export function recommendationSchema(availableFilters) {
  return {
    type: 'object',
    properties: {
      recommendedFilters: {
        type: 'array',
        items: { type: 'string', enum: availableFilters },
        maxItems: availableFilters.length,
      },
      reason: { type: 'string' },
    },
    required: ['recommendedFilters', 'reason'],
    additionalProperties: false,
  }
}

export function validateRecommendationResult(raw, availableFilters) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)
    || Object.keys(raw).some(key => !['recommendedFilters', 'reason'].includes(key))
    || !Array.isArray(raw.recommendedFilters)
    || raw.recommendedFilters.length > availableFilters.length
    || raw.recommendedFilters.some(filter => !availableFilters.includes(filter))) {
    return { error: '추천 조건 응답이 올바르지 않습니다.' }
  }

  const reason = typeof raw.reason === 'string' ? raw.reason.trim() : ''
  if (!reason || reason.length > 300) return { error: '추천 이유 응답이 올바르지 않습니다.' }

  return {
    value: {
      recommendedFilters: [...new Set(raw.recommendedFilters)],
      reason,
    },
  }
}
