import { normalizeConditions, normalizeText, validateQuery } from '../../supabase/functions/_shared/ai-search-contract.js'

const ERROR_MESSAGES = {
  NOT_CONFIGURED: 'AI 검색이 아직 준비되지 않았습니다. 잠시 후 다시 이용해 주세요.',
  RATE_LIMITED: '검색 요청이 많습니다. 잠시 후 다시 시도해 주세요.',
  TIMEOUT: 'AI 검색 시간이 초과되었습니다. 다시 시도해 주세요.',
  INVALID_RESPONSE: 'AI 검색 조건을 해석하지 못했습니다. 검색어를 바꿔 다시 시도해 주세요.',
}

export async function requestAiConditions(client, input, signal) {
  const checked = validateQuery(input)
  if (checked.error) throw new Error(checked.error)
  const { data, error } = await client.functions.invoke('ai-search', {
    body: { query: checked.query }, signal, timeout: 18000,
  })
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  if (error) {
    let code
    try { code = (await error.context?.json())?.error?.code } catch { /* Gateway errors need not be JSON. */ }
    console.error('AI search request failed:', { code: code || 'FUNCTION_UNAVAILABLE', status: error.context?.status })
    throw new Error(ERROR_MESSAGES[code] || 'AI 검색에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.')
  }
  if (!data?.conditions || typeof data.conditions !== 'object' || Array.isArray(data.conditions)
    || Object.keys(normalizeConditions({})).some(key => !Object.hasOwn(data.conditions, key))) {
    throw new Error(ERROR_MESSAGES.INVALID_RESPONSE)
  }
  return normalizeConditions(data.conditions)
}

export const AI_SORT_TO_UI = {
  relevance: 'recommend', price_asc: 'lowPrice', price_desc: 'highPrice',
  protein_desc: 'protein', sugar_asc: 'sugar', sodium_asc: 'sodium',
}

export function conditionLabels(c) {
  const labels = []
  if (c.category) labels.push(c.category)
  for (const [field, label, unit, comparison] of [
    ['protein_min', '단백질', 'g', '이상'], ['sugar_max', '당류', 'g', '이하'],
    ['sodium_max', '나트륨', 'mg', '이하'], ['calories_max', '열량', 'kcal', '이하'], ['price_max', '가격', '원', '이하'],
  ]) if (c[field] !== null) labels.push(`${label} ${c[field].toLocaleString('ko-KR')}${unit} ${comparison}`)
  if (c.exclude_caffeine) labels.push('카페인 제외')
  if (c.excluded_allergens.length) labels.push(`${c.excluded_allergens.join(' · ')} 제외`)
  labels.push(...c.keywords)
  return labels.length ? labels : ['전체 상품']
}

export function filterAiProducts(products, raw, sort = null) {
  const c = normalizeConditions(raw)
  const fields = [
    ['protein_min', 'protein', true], ['sugar_max', 'sugar', false],
    ['sodium_max', 'sodium', false], ['calories_max', 'calories', false],
  ]
  const haystack = p => normalizeText([p.name, p.brand, p.category, p.summary, ...(p.mainIngredients || [])].join(' '))
  const list = products.filter(p => {
    if (!p.isActive || (c.category && p.category !== c.category)) return false
    if (c.price_max !== null && p.price > c.price_max) return false
    for (const [key, nutrient, minimum] of fields) {
      if (c[key] === null) continue
      const value = p.nutrition?.[nutrient]
      if (!Number.isFinite(value) || (minimum ? value < c[key] : value > c[key])) return false
    }
    if (c.exclude_caffeine && p.caffeine) return false
    if (c.excluded_allergens.some(a => p.allergens.includes(a))) return false
    return c.keywords.every(k => haystack(p).includes(normalizeText(k)))
  })
  const score = p => c.keywords.reduce((total, k) => total + (normalizeText(p.name).includes(normalizeText(k)) ? 2 : 1), 0)
  const comparisons = {
    relevance: (a, b) => score(b) - score(a),
    price_asc: (a, b) => a.price - b.price, price_desc: (a, b) => b.price - a.price,
    protein_desc: (a, b) => b.nutrition.protein - a.nutrition.protein,
    sugar_asc: (a, b) => a.nutrition.sugar - b.nutrition.sugar,
    sodium_asc: (a, b) => a.nutrition.sodium - b.nutrition.sodium,
    review: (a, b) => b.reviewCount - a.reviewCount,
  }
  const compare = comparisons[sort || c.sort_by] || comparisons.relevance
  return list.sort((a, b) => compare(a, b) || a.id - b.id)
}
