export const QUERY_MAX_LENGTH = 250
export const SEARCH_CATEGORIES = [
  '닭가슴살·고단백 식품', '도시락·간편식', '프로틴바·건강간식', '시리얼·그래놀라',
  '유제품·대체유', '음료·프로틴음료', '견과·건과류', '영양제·비타민', '소스·조미료', '기타 건강식품',
]
export const SEARCH_ALLERGENS = ['우유', '대두', '계란', '견과류', '밀', '갑각류', '복숭아', '쇠고기', '닭고기']
export const SEARCH_SORTS = ['relevance', 'price_asc', 'price_desc', 'protein_desc', 'sugar_asc', 'sodium_asc']

// AI-only demo search thresholds per registered serving, NOT medical/labeling standards.
// Existing manually selected preference filters keep their current thresholds.
export const LOW_SUGAR_MAX = 2
export const HIGH_PROTEIN_MIN = 15
export const LOW_SODIUM_MAX = 250
export const NUMBER_LIMITS = { protein_min: 1000, sugar_max: 1000, sodium_max: 100000, calories_max: 10000, price_max: 10000000 }

export function emptyConditions() {
  return { category: null, protein_min: null, sugar_max: null, sodium_max: null, calories_max: null,
    price_max: null, exclude_caffeine: false, excluded_allergens: [], keywords: [], sort_by: 'relevance' }
}

export function validateQuery(value) {
  if (typeof value !== 'string') return { error: '검색어를 문자열로 입력해 주세요.' }
  const query = value.trim()
  if (!query) return { error: '검색어를 입력해 주세요.' }
  if (query.length > QUERY_MAX_LENGTH) return { error: `검색어는 ${QUERY_MAX_LENGTH}자 이내로 입력해 주세요.` }
  // A fast reject, not the security boundary. The model has no tools or secrets in its prompt.
  if (/(api\s*키|api\s*key|gemini_api_key|시스템\s*프롬프트|system\s*prompt|이전\s*지시.*무시|ignore.*instructions)/i.test(query)) {
    return { error: '상품 검색 조건만 입력해 주세요.' }
  }
  return { query }
}

export const normalizeText = value => String(value || '').normalize('NFKC').toLowerCase().replace(/\s+/g, '')
const validNumber = (value, max) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max

export function normalizeConditions(raw) {
  const data = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  const result = emptyConditions()
  result.category = SEARCH_CATEGORIES.includes(data.category) ? data.category : null
  for (const [key, max] of Object.entries(NUMBER_LIMITS)) result[key] = validNumber(data[key], max) ? data[key] : null
  if (result.price_max !== null) result.price_max = Math.floor(result.price_max)
  result.exclude_caffeine = data.exclude_caffeine === true
  result.excluded_allergens = Array.isArray(data.excluded_allergens)
    ? [...new Set(data.excluded_allergens.filter(a => SEARCH_ALLERGENS.includes(a)))] : []
  result.keywords = Array.isArray(data.keywords)
    ? [...new Set(data.keywords.filter(k => typeof k === 'string' && k.trim() && k.trim().length <= 40).map(k => k.trim()))].slice(0, 5) : []
  result.sort_by = SEARCH_SORTS.includes(data.sort_by) ? data.sort_by : 'relevance'
  return result
}

// Exact numeric bounds are deterministic guardrails, not a replacement NL parser.
// Covers common Korean unit forms and both "protein 20g 이상" and "20g 이상 단백질".
export function explicitBounds(query) {
  const q = query.normalize('NFKC').replaceAll(',', '')
  const definitions = {
    protein_min: ['(?:단백질|protein)', '(?:g|그램)', '(?:이상|넘는|넘게|최소)'],
    sugar_max: ['(?:당류|당|sugar)', '(?:g|그램)', '(?:이하|미만|최대)'],
    sodium_max: ['(?:나트륨|sodium)', '(?:mg|밀리그램|g|그램)', '(?:이하|미만|최대)'],
    calories_max: ['(?:칼로리|열량|calories)', '(?:kcal|칼로리)', '(?:이하|미만|최대)'],
    price_max: ['(?:가격|금액)?', '(?:만원|천원|원)', '(?:이하|미만|최대)'],
  }
  const found = {}
  for (const [key, [label, unit, bound]] of Object.entries(definitions)) {
    const number = '(-?\\d+(?:\\.\\d+)?)'
    const space = '\\s*'
    const forward = new RegExp(`${label}${space}(?:은|이|을|는)?${space}${number}${space}(${unit})${space}${bound}`, 'i')
    const reverse = new RegExp(`${number}${space}(${unit})${space}${bound}(?:의)?${space}${label}`, 'i')
    const match = q.match(forward) || q.match(reverse)
    if (!match) continue
    let value = Number(match[1])
    if (match[2] === '만원') value *= 10000
    if (match[2] === '천원') value *= 1000
    if (key === 'sodium_max' && /^(g|그램)$/i.test(match[2])) value *= 1000
    found[key] = validNumber(value, NUMBER_LIMITS[key]) ? value : null
  }
  return found
}

export function finalizeConditions(raw, query) {
  const result = normalizeConditions(raw)
  const explicit = explicitBounds(query)
  // Reject invented numeric values: a model-only number must be grounded in the input.
  const inputNumbers = [...query.replaceAll(',', '').matchAll(/-?\d+(?:\.\d+)?\s*(만원|천원|mg|g|원|그램|밀리그램|kcal)?/gi)]
    .flatMap(m => { const n = Number(m[0].match(/-?\d+(?:\.\d+)?/)[0]); return m[1] === '만원' ? [n * 10000] : m[1] === '천원' ? [n * 1000] : /^(g|그램)$/i.test(m[1] || '') ? [n, n * 1000] : [n] })
  for (const key of Object.keys(NUMBER_LIMITS)) {
    if (Object.hasOwn(explicit, key)) result[key] = explicit[key]
    else if (!inputNumbers.includes(result[key])) result[key] = null
  }
  const flags = Array.isArray(raw.qualitative_filters) ? raw.qualitative_filters : []
  for (const [flag, key, value] of [
    ['low_sugar', 'sugar_max', LOW_SUGAR_MAX], ['high_protein', 'protein_min', HIGH_PROTEIN_MIN], ['low_sodium', 'sodium_max', LOW_SODIUM_MAX],
  ]) {
    if (flags.includes(flag) && result[key] === null && !Object.hasOwn(explicit, key)) result[key] = value
  }
  // Model keywords may only select text actually supplied by the shopper.
  result.keywords = result.keywords.filter(k => normalizeText(query).includes(normalizeText(k)))
  return result
}

const properties = {
  category: { type: ['string', 'null'], enum: [...SEARCH_CATEGORIES, null] },
  ...Object.fromEntries(Object.entries(NUMBER_LIMITS).map(([key, max]) => [key, {
    type: ['number', 'null'], minimum: 0, maximum: max, description: 'Only a numeric bound explicitly stated by the shopper, otherwise null.',
  }])),
  exclude_caffeine: { type: 'boolean' },
  excluded_allergens: { type: 'array', items: { type: 'string', enum: SEARCH_ALLERGENS }, maxItems: 9 },
  keywords: { type: 'array', items: { type: 'string' }, maxItems: 5 },
  sort_by: { type: 'string', enum: SEARCH_SORTS },
  qualitative_filters: { type: 'array', items: { type: 'string', enum: ['low_sugar', 'high_protein', 'low_sodium'] }, maxItems: 3 },
}
// qualitative_filters is private parser metadata; the API returns only the ten public fields.
export const GEMINI_SEARCH_SCHEMA = { type: 'object', properties, required: Object.keys(properties), additionalProperties: false }
