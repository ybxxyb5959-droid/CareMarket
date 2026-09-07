import { catalogDemoActivesFor } from './catalog-demo-actives.js'
// DB categories shared by the browser and Edge Functions.
export const SUPPLEMENT_CATEGORY = '영양제·비타민'
export const categoryKey = value => String(value || '').normalize('NFKC').toLowerCase().replace(/\s+/g, '').replace(/[ㆍᆞ・]/g, '·')
export const isSupplement = product => categoryKey(product?.category) === categoryKey(SUPPLEMENT_CATEGORY)
export const productType = product => isSupplement(product) ? 'supplement' : 'food'

// Parse only an explicit terminal measurement. Keep the entire ingredient name,
// including source/compound qualifiers: an oil amount is not an EPA/DHA amount.
export function registeredSupplementIngredients(product) {
  if (!isSupplement(product)) return []
  const values = product.mainIngredients ?? product.main_ingredients
  const result = new Map()
  for (const raw of Array.isArray(values) ? values : []) {
    if (typeof raw !== 'string' || !raw.trim()) continue
    const text = raw.trim()
    const match = text.match(/\s+(\d+(?:,\d{3})*(?:\.\d+)?)\s*(μg|µg|mcg|mg|kg|g|mL|ml|L|IU|CFU|억)(\)?)$/)
    const name = match ? text.slice(0, match.index).trim() + match[3] : text
    const key = categoryKey(name)
    if (!result.has(key)) result.set(key, { key, name, raw: text, amount: match ? match[1] + match[2] : null })
  }
  return [...result.values()]
}

export const usesCatalogDemoActives = product => isSupplement(product)
  && Boolean(catalogDemoActivesFor(product))
  && !registeredSupplementIngredients(product).some(item => item.amount)

export function supplementIngredients(product) {
  return usesCatalogDemoActives(product)
    ? registeredSupplementIngredients({ ...product, mainIngredients: catalogDemoActivesFor(product) })
    : registeredSupplementIngredients(product)
}

export const registeredServing = product => product.serving_size || product.nutrition?.servingSize || '정보 없음'
export const measuredSupplementIngredients = product => supplementIngredients(product).filter(item => item.amount)
export const ingredientDescription = product => measuredSupplementIngredients(product).map(item => item.raw).join(' · ') || '등록된 주요 성분 정보 없음'
export const supplementCardDescription = product => measuredSupplementIngredients(product).slice(0, 2).map(item => `${item.name} ${item.amount}`).join(' · ') || '주요 성분 정보 확인'
// Portfolio association only; no efficacy or individual nutritional need is inferred.
export const supplementGoalMatch = (product, goal) => isSupplement(product) && Boolean(({ '근육량 증가': /크레아틴/, '체중 관리': /카테킨/, '식단 영양 관리': /바나바/ })[goalLabel(goal)]?.test(supplementIngredients(product).map(item => item.name).join(' ')))

export function supplementComparisonRows(products) {
  const keys = new Map(products.flatMap(product => measuredSupplementIngredients(product).map(item => [item.key, item.name])))
  return [...keys].map(([key, name]) => [name, product => {
    const ingredient = supplementIngredients(product).find(item => item.key === key)
    return ingredient?.amount || '-'
  }])
}

export const goalLabel = goal => ({ muscle_gain: '근육량 증가', weight_control: '체중 관리', nutrition_management: '식단 영양 관리', supplement_search: '영양제 탐색' })[goal] || goal

export function comparisonPolicy(products, goal) {
  const supplements = products.filter(isSupplement)
  const allSupplements = supplements.length === products.length
  const sets = supplements.map(product => supplementIngredients(product).map(item => item.key).sort().join('|'))
  // Conservative: a shared excipient alone never establishes a shared role.
  const similar = allSupplements && Boolean(sets[0]) && sets.every(keys => keys === sets[0])
  const lowRelevance = allSupplements && ['근육량 증가', '체중 관리', '식단 영양 관리'].includes(goalLabel(goal))
  return { state: lowRelevance ? 'low_relevance' : supplements.length && !similar ? 'different_roles' : 'direct',
    ingredientsKnown: sets.every(Boolean),
    hasSupplements: supplements.length > 0, similar, allowWinner: supplements.length === 0 }
}

export function comparisonFallback(products, goal) {
  const policy = comparisonPolicy(products, goal)
  const mixed = products.some(isSupplement) && products.some(product => !isSupplement(product))
  const summary = mixed ? '두 유형은 구매 목적에서 역할이 다릅니다. 일반 식품과 주요 성분을 별도로 확인할 영양제를 같은 영양 기준으로 평가하지 않습니다.'
    : policy.hasSupplements ? !policy.ingredientsKnown
      ? '등록된 주요 성분 정보가 충분하지 않아 구성의 유사성과 우열을 판단하기 어렵습니다.'
      : policy.similar
      ? '등록된 주요 성분 구성이 같습니다. 함량을 우선한다면 동일한 성분·단위·섭취 기준을, 가격을 우선한다면 판매가를 비교해보세요.'
      : '주요 성분 구성이 서로 달라 동일한 기준으로 우열을 판단하기 어렵습니다. 상품별 등록 성분의 차이를 확인해보세요.'
      : '등록된 영양정보와 가격을 구매 목적에 맞게 비교해보세요.'
  return { comparison_state: policy.state, summary,
    highlights: products.map(product => ({ product_id: product.id ?? product.product_id,
      reason: isSupplement(product) ? ingredientDescription(product) : `${product.category} · 등록 제공량 ${registeredServing(product)}` })),
    goal_fit_summary: policy.state === 'low_relevance'
      ? goalLabel(goal) === '근육량 증가' ? '현재 비교 상품은 단백질 공급 목적의 식품이 아닌 보조 영양 상품입니다. 주요 성분을 별도로 확인해주세요.' : '현재 비교 상품은 일반 식품의 영양 기준으로 평가하지 않는 보조 영양 상품입니다. 주요 성분을 별도로 확인해주세요.'
      : policy.hasSupplements ? '성분 함량은 등록된 단위와 섭취 기준이 같을 때 비교할 수 있습니다. 함량이 높다는 이유만으로 더 좋은 상품은 아닙니다.' : '등록 제공량 기준 영양정보와 판매가를 함께 확인해주세요.',
    recommendation: null, aiExplanationAvailable: false }
}
