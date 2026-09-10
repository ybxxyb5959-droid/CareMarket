import { LOW_SUGAR_MAX, LOW_SODIUM_MAX, HIGH_PROTEIN_MIN } from './nutrition-policy.js'
import { isSupplement, ingredientDescription, supplementIngredients, registeredServing } from './product-type.js'
import { analyzeCartComposition } from './cart-composition.js'
export const CART_ANALYSIS_VERSION = 6

// Keep these thresholds aligned with the existing catalog quick filters.
export const CART_NUTRITION_THRESHOLDS = Object.freeze({
  highProteinMin: HIGH_PROTEIN_MIN,
  lowSugarMax: LOW_SUGAR_MAX,
  lowSodiumMax: LOW_SODIUM_MAX,
})

const GOAL_LABELS = Object.freeze({
  muscle_gain: '근육량 증가',
  weight_control: '체중 관리',
  nutrition_management: '식단 영양 관리',
  supplement_search: '영양제 탐색',
})
const CONDITION_LABELS = Object.freeze({
  low_sugar: '저당',
  low_sodium: '저염',
  high_protein: '고단백',
  exclude_caffeine: '카페인 제외',
})
const NUTRIENT_LABELS = Object.freeze({
  calories: '열량',
  protein: '단백질',
  sugar: '당류',
  sodium: '나트륨',
  caffeine: '카페인',
  allergens: '제외 성분',
  diversity: '상품 다양성',
})

const safeNumber = (value) => {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}

const safeStrings = (value, limit = 20) => (
  Array.isArray(value)
    ? value.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim()).slice(0, limit)
    : []
)


export function normalizeCartAnalysisContext({ primaryGoal = null, selectedConditions = [], excludedAllergens = [] } = {}) {
  return {
    primaryGoal: GOAL_LABELS[primaryGoal] || (Object.values(GOAL_LABELS).includes(primaryGoal) ? primaryGoal : null),
    selectedConditions: safeStrings(selectedConditions)
      .map((item) => CONDITION_LABELS[item] || item)
      .filter((item) => Object.values(CONDITION_LABELS).includes(item)),
    excludedAllergens: safeStrings(excludedAllergens),
  }
}

export function cartAnalysisBasis(context = {}) {
  if (context.compositionOnly) return { composition_only: true, personalized: false, primary_goal: null, selected_conditions: [], excluded_allergens: safeStrings(context.excludedAllergens) }
  const normalized = normalizeCartAnalysisContext(context)
  return {
    personalized: Boolean(normalized.primaryGoal || normalized.selectedConditions.length || normalized.excludedAllergens.length),
    primary_goal: normalized.primaryGoal,
    selected_conditions: normalized.selectedConditions,
    excluded_allergens: normalized.excludedAllergens,
  }
}

// A SKU is counted once, regardless of purchased quantity or repeated rows.
function normalizeRows(rawRows) {
  const unique = new Map()
  for (const entry of Array.isArray(rawRows) ? rawRows : []) {
    const p = entry?.product
    if (!p || !(safeNumber(entry.quantity) >= 1)) continue
    const id = p.id ?? p.product_id
    if (id == null || unique.has(String(id))) continue
    const n = p.nutrition || p
    unique.set(String(id), {
      id, name: String(p.name || '상품'), category: p.category,
      mainIngredients: safeStrings(p.mainIngredients ?? p.main_ingredients),
      supplement: isSupplement(p), ingredients: supplementIngredients(p), ingredientDescription: ingredientDescription(p), serving: registeredServing(p),
      allergens: safeStrings(p.allergens), caffeine: p.caffeine === true || p.contains_caffeine === true,
      nutrition: Object.fromEntries(['protein', 'sugar', 'sodium', 'calories', 'carbs', 'fat'].map(key => [key, isSupplement(p) ? null : safeNumber(n[key])])),
    })
  }
  return [...unique.values()]
}

export function analyzeCartNutrition(rawRows, rawContext = {}) {
  if (rawContext.compositionOnly) return analyzeCurrentCart(rawRows, rawContext)
  const rows = normalizeRows(rawRows)
  const context = normalizeCartAnalysisContext(rawContext)
  const goal = context.primaryGoal
  const supplements = rows.filter(row => row.supplement)
  const foods = rows.filter(row => !row.supplement)
  const composition = analyzeCartComposition(rows)
  const selected = new Set(context.selectedConditions)
  const keys = new Set(!goal && (selected.has('저당') || selected.has('저염')) ? [] : goal === '근육량 증가' ? ['protein', 'sugar']
    : goal === '체중 관리' ? ['sugar', 'protein', 'calories']
      : goal === '영양제 탐색' ? ['supplement'] : ['sugar', 'sodium'])
  if (selected.has('저당')) keys.add('sugar')
  if (selected.has('저염')) keys.add('sodium')
  if (selected.has('고단백')) keys.add('protein')
  if (selected.has('카페인 제외')) keys.add('caffeine')
  const calorieRows = rows.filter(row => row.nutrition.calories !== null)
  const calorieMean = calorieRows.length > 1 ? calorieRows.reduce((sum, row) => sum + row.nutrition.calories, 0) / calorieRows.length : null
  const labels = { protein: '고단백 상품', sugar: '저당 상품', sodium: '저염 상품', calories: '비교적 저열량 상품', supplement: '영양제 상품', caffeine: '카페인 미표시 상품' }
  const rules = {
    protein: value => value >= CART_NUTRITION_THRESHOLDS.highProteinMin,
    sugar: value => value <= CART_NUTRITION_THRESHOLDS.lowSugarMax,
    sodium: value => value <= CART_NUTRITION_THRESHOLDS.lowSodiumMax,
    calories: value => calorieMean !== null && value <= calorieMean,
  }
  const productReasons = rows.map(row => {
    const matches = [], reasons = [], checks = [], missing = []
    if (row.supplement) {
      const allergens = context.excludedAllergens.filter(a => row.allergens.includes(a))
      if (allergens.length) checks.push('설정하신 알레르기 성분(' + allergens.join(', ') + ')이 포함되어 있습니다. 원재료 정보를 확인해주세요.')
      if (selected.has('카페인 제외') && row.caffeine) checks.push('카페인 제외 조건과 다른 상품입니다.')
      const group = goal === '영양제 탐색' ? '영양제 구성' : '보조 영양 상품'
      return { id: row.id, name: row.name, group, ingredients: row.ingredients, serving: row.serving,
        matches: [...(goal === '영양제 탐색' ? ['supplement'] : []), ...(selected.has('카페인 제외') && !row.caffeine ? ['caffeine'] : [])], needsAttention: checks.length > 0,
        tags: [group, ...(checks.length ? ['확인 필요'] : [])],
        reasons: ['주요 성분: ' + row.ingredientDescription, '등록 섭취 기준: ' + row.serving, ...checks], checks }
    }
    if (goal === '영양제 탐색') {
      reasons.push('일반 식품 · 등록 제공량 기준 열량 ' + (row.nutrition.calories === null ? '정보 없음' : row.nutrition.calories + 'kcal') + '.')
    }
    for (const key of keys) {
      if (key === 'supplement') {
        // Product type is composition information, not a failed nutrition check.
        continue
      } else if (key === 'caffeine') {
        if (!row.caffeine) { matches.push(key); reasons.push('등록 정보에 카페인이 표시되지 않았습니다.') }
        else checks.push('카페인 제외 조건과 다른 상품입니다.')
      } else {
        const value = row.nutrition[key]
        if (value === null) { missing.push(key); continue }
        if (key === 'calories' && calorieMean === null) { reasons.push('열량을 비교할 다른 상품 종류가 없어 상대 비교를 보류했습니다.'); continue }
        if (rules[key](value)) {
          matches.push(key)
          reasons.push(key === 'calories' ? '등록 제공량 기준 열량이 현재 장바구니 상품 종류별 평균 이하입니다.' : NUTRIENT_LABELS[key] + ' ' + value + (key === 'sodium' ? 'mg' : 'g') + '으로 기존 ' + labels[key].replace(' 상품', '') + ' 탐색 기준에 해당합니다.')
        } else checks.push(key === 'calories' ? '등록 제공량 기준 열량이 현재 장바구니 상품 종류별 평균보다 높습니다.' : NUTRIENT_LABELS[key] + ' ' + value + (key === 'sodium' ? 'mg' : 'g') + '으로 기존 ' + labels[key].replace(' 상품', '') + ' 탐색 기준 밖입니다.')
      }
    }
    const allergens = context.excludedAllergens.filter(a => row.allergens.includes(a))
    if (allergens.length) checks.push('설정하신 알레르기 성분(' + allergens.join(', ') + ')이 포함되어 있습니다. 원재료 정보를 확인해주세요.')
    if (missing.length) checks.push(missing.map(k => NUTRIENT_LABELS[k]).join(' · ') + ' 비교 정보가 충분하지 않아 판정을 보류했습니다.')
    return { id: row.id, name: row.name, group: goal === '영양제 탐색' ? '일반 식품' : (goal === '근육량 증가' ? matches.includes('protein') : matches.some(key => key !== 'caffeine')) ? '직접 관련 상품' : '기타 식품', matches, needsAttention: checks.length > 0, tags: [...matches.map(k => labels[k].replace(' 상품', '')), ...(checks.length ? ['확인 필요'] : [])], reasons: [...reasons, ...checks], checks }
  })
  productReasons.sort((a, b) => (goal === '영양제 탐색' ? Number(b.group === '영양제 구성') - Number(a.group === '영양제 구성') : Number(b.group === '직접 관련 상품') - Number(a.group === '직접 관련 상품') || Number(a.group === '보조 영양 상품') - Number(b.group === '보조 영양 상품')))
  const balanceItems = [...keys].filter(key => (key === 'supplement' || key === 'caffeine' && rows.length > 0) || foods.length > 0).map(key => {
    const total = ['supplement', 'caffeine'].includes(key) ? rows.length : foods.length
    const count = productReasons.filter(p => p.matches.includes(key)).length
    return { key, label: labels[key], count, total, status: count ? 'good' : 'balance', text: count + ' / ' + total + '종', reason: key === 'calories' ? '상품 종류별 등록 제공량 열량의 평균과 비교합니다. 제공량이 다를 수 있으며 절대적인 저열량 기준이 아닙니다.' : '기존 CareMarket 탐색 기준으로 상품 종류를 셉니다.' }
  })
  if (foods.length && keys.has('protein') && goal === '근육량 증가') {
    const count = rows.filter(row => row.nutrition.protein !== null && !rules.protein(row.nutrition.protein)).length
    balanceItems.push({ key: 'protein_complement', label: '단백질 보완 살펴보기', status: count ? 'balance' : 'good', count, total: foods.length, text: count + ' / ' + foods.length + '종', reason: '고단백 탐색 기준 밖인 상품 종류입니다.' })
  }
  const attentionCount = productReasons.filter(p => p.needsAttention).length
  balanceItems.push({ key: 'attention', label: '확인 필요 상품', status: attentionCount ? 'attention' : 'good', count: attentionCount, total: rows.length, text: attentionCount + ' / ' + rows.length + '종', reason: '목적별 기준 밖, 비교 정보 미비 또는 설정한 알레르기 성분이 포함된 상품입니다.' })
  const goodPoints = balanceItems.filter(item => item.key !== 'attention' && item.key !== 'protein_complement' && item.count > 0).map(item => item.label + '이 ' + item.text + '입니다.')
  const attentionPoints = productReasons.filter(p => p.needsAttention).map(p => p.name + ': ' + p.checks.join(' '))
  if (composition.goodPoint) goodPoints.push(composition.goodPoint)
  if (composition.attention) attentionPoints.unshift(composition.attention)
  const scope = goal || (selected.size ? [...selected].join(' · ') : '식단 영양 관리')
  const foodSummary = scope + ' 기준으로 ' + rows.length + '종을 살펴봤습니다. ' + (goodPoints.join(' ') || '해당 기준으로 비교할 상품 정보를 확인해주세요.') + (attentionCount ? ' 확인할 상품은 ' + attentionCount + '종입니다.' : '')
  const directCount = productReasons.filter(p => p.group === '직접 관련 상품').length
  const summary = supplements.length ? goal === '영양제 탐색'
    ? '현재 장바구니에는 영양제 ' + supplements.length + '종' + (foods.length ? '과 일반 식품 ' + foods.length + '종' : '') + '이 포함되어 있습니다. ' + (foods.length ? '영양제는 주요 성분과 함량, 일반 식품은 등록 영양정보를 확인합니다.' : '등록된 주요 성분 종류와 함량을 확인해보세요.')
    : '현재 장바구니에는 ' + scope + ' 목적에서 직접 관련 상품 ' + directCount + '종과 주요 성분을 별도로 확인할 보조 영양 상품 ' + supplements.length + '종이 포함되어 있습니다.' + (foods.length > directCount ? ' 기타 식품 ' + (foods.length - directCount) + '종도 함께 확인해주세요.' : '')
    : foodSummary
  const filterLabel = goal === '근육량 증가' ? '고단백' : selected.has('저염') || (!goal && !selected.has('저당')) || goal === '식단 영양 관리' ? '저염' : goal === '영양제 탐색' ? null : '저당'
  const actionDirections = [{ key: filterLabel || 'review_product_labels', fallbackText: '현재 구매 목적에 맞는 상품을 함께 비교하고 상품별 표시 정보를 확인해보세요.' }]
  return {
    composition,
    hasSupplements: supplements.length > 0,
    groups: [...new Set(productReasons.map(p => p.group))].map(label => ({ label, productIds: productReasons.filter(p => p.group === label).map(p => p.id) })),
    version: CART_ANALYSIS_VERSION, itemCount: rows.length, singleProduct: rows.length === 1,
    availableNutrients: [...keys].filter(key => rows.some(row => row.nutrition[key] != null)),
    dominant: balanceItems.filter(item => item.key !== 'attention' && item.count > 0).map(item => item.key),
    good: balanceItems.filter(item => item.status === 'good' && item.key !== 'attention').map(item => item.key),
    needsAttention: attentionCount ? ['attention'] : [], needsBalance: [], compositionSignals: [composition.decision],
    balanceItems, productReasons, goodPoints, attentionPoints, observations: goodPoints,
    actionDirections,
    recommendation: { filterLabel, label: (filterLabel || scope) + ' 상품 더 보기' },
    fallback: { headline: scope + ' 기준 장바구니 분석', summary: composition.detailSummary + ' ' + (supplements.length ? summary : scope + ' 구매 목적과 기존 탐색 기준으로 확인했습니다.'), actions: actionDirections.map(a => a.fallbackText) },
  }
}

export function cartAnalysisForGemini(analysis, basis) {
  return {
    ...(basis.composition_only ? { excluded_allergens: basis.excluded_allergens } : { goal: basis.primary_goal, selected_conditions: basis.selected_conditions }),
    cart_scope: { item_count: analysis.itemCount, single_product: analysis.singleProduct },
    cart_composition: analysis.composition,
    products: analysis.composition.products,
    allowed_summaries: cartNarrativeSummaries(analysis),
    allowed_actions: analysis.fallback.actions,
    analysis: { dominant: analysis.dominant, good: analysis.good, needs_attention: analysis.needsAttention,
      needs_balance: analysis.needsBalance, composition_signals: analysis.compositionSignals,
      groups: analysis.groups, supplement_products: analysis.productReasons.filter(p => p.ingredients),
      balance_items: analysis.balanceItems, confirmed_facts: [...analysis.goodPoints, ...analysis.attentionPoints],
      allowed_action_directions: analysis.actionDirections.map(({ key }) => key) },
  }
}

// AI may select an evidence expansion, but cannot rewrite the factual conclusion.
export function cartNarrativeSummaries(analysis) {
  return [analysis.fallback.summary, analysis.composition.detailSummary]
}

export function isGroundedCartNarrative(analysis, narrative) {
  return Boolean(narrative && cartNarrativeSummaries(analysis).includes(narrative.summary)
    && Array.isArray(narrative.actions) && narrative.actions.length > 0
    && narrative.actions.every(action => analysis.fallback.actions.includes(action)))
}

// Keep the existing response envelope compatible with the deployed storefront.
// New clients require compositionVersion to reject quantity-based cached results.
export function composeCartInsight(analysis, basis, narrative = null, aiExplanationAvailable = false) {
  aiExplanationAvailable = aiExplanationAvailable && !analysis.hasSupplements && isGroundedCartNarrative(analysis, narrative)
  const copy = aiExplanationAvailable ? narrative : analysis.fallback
  return {
    headline: analysis.fallback.headline, summary: copy.summary, balanceItems: analysis.balanceItems,
    composition: analysis.composition, shortSummary: analysis.composition.shortSummary,
    currentFeatures: analysis.observations, goodPoints: analysis.goodPoints, attentionPoints: analysis.attentionPoints,
    groups: analysis.groups, productReasons: analysis.productReasons, actionTitle: '이렇게 보완해보세요', actions: copy.actions,
    recommendation: analysis.recommendation, basis, analysisVersion: 2, compositionVersion: analysis.version, aiExplanationAvailable,
    ...(!aiExplanationAvailable ? { explanationNotice: '등록된 상품 정보로 계산한 기본 분석입니다.' } : {}),
  }
}

export function isCartInsight(value) {
  const text = item => typeof item === 'string' && item.trim().length > 0
  return Boolean(value && value.analysisVersion === 2 && value.compositionVersion === CART_ANALYSIS_VERSION
    && text(value.headline) && text(value.summary)
    && Array.isArray(value.actions) && value.actions.length > 0 && value.actions.every(text)
    && Array.isArray(value.currentFeatures) && value.currentFeatures.every(text)
    && Array.isArray(value.goodPoints) && Array.isArray(value.attentionPoints)
    && Array.isArray(value.productReasons)
    && Array.isArray(value.balanceItems) && value.balanceItems.every(item => item && text(item.key) && text(item.label) && text(item.text)))
}

// Accept known deployed envelopes without trusting their older classifications.
export function isCompatibleCartInsight(value) {
  return [3, 4, 5, CART_ANALYSIS_VERSION].includes(value?.compositionVersion)
    && isCartInsight({ ...value, compositionVersion: CART_ANALYSIS_VERSION })
}

export function reconcileCartInsight(response, current) {
  if (!isCompatibleCartInsight(response) || !isCartInsight(current)) return null
  const basis = value => JSON.stringify([Boolean(value?.composition_only), value?.primary_goal || null,
    [...(value?.selected_conditions || [])].sort(), [...(value?.excluded_allergens || [])].sort()])
  const facts = value => JSON.stringify([
    value.balanceItems.map(item => [item.key, item.count, item.total]).sort(),
    value.productReasons.map(item => [String(item.id), item.needsAttention, [...(item.checks || [])].sort()]).sort(),
  ])
  // Keep AI wording only when the server analyzed the same criteria and findings.
  // All rendered counts, groups and per-product reasons come from current rules.
  if (basis(response.basis) !== basis(current.basis) || facts(response) !== facts(current)
    || response.compositionVersion !== current.compositionVersion
    || JSON.stringify(response.composition) !== JSON.stringify(current.composition)
    || ![current.summary, current.composition.detailSummary].includes(response.summary)
    || !response.actions.every(action => current.actions.includes(action))
    || response.aiExplanationAvailable !== true) return current
  const { explanationNotice: _notice, ...result } = current
  return { ...result, summary: response.summary, actions: response.actions, aiExplanationAvailable: true }
}

// Composition-only cart mode: reuse registered nutrient rules, never goal suitability.
function analyzeCurrentCart(rawRows, context) {
  const analysis = analyzeCartNutrition(rawRows, { selectedConditions: ['고단백', '저당', '저염'], excludedAllergens: context.excludedAllergens })
  const rows = normalizeRows(rawRows)
  const quantities = new Map()
  for (const item of Array.isArray(rawRows) ? rawRows : []) {
    const id = String(item?.product?.id ?? item?.product?.product_id)
    const quantity = safeNumber(item?.quantity)
    if (quantity >= 1) quantities.set(id, (quantities.get(id) || 0) + quantity)
  }
  analysis.composition.products = analysis.composition.products.map(product => ({ ...product, quantity: quantities.get(String(product.id)) }))
  if (analysis.composition.decision === 'limited' && rows.length > 1) {
    const categories = [...new Set(rows.map(row => row.category).filter(Boolean))]
    if (categories.length && rows.every(row => row.category)) {
      const concentrated = categories.length === 1
      const summary = concentrated
        ? `현재 담긴 ${rows.length}종은 ${categories[0]} 카테고리에 집중되어 있어요.`
        : `현재 장바구니에는 ${categories.join(' · ')} 등 ${categories.length}개 카테고리 상품이 함께 담겨 있어요.`
      analysis.composition = { ...analysis.composition,
        decision: concentrated ? 'category_centered' : 'category_variety', shortSummary: summary,
        detailSummary: summary + ' 구매 상품 구성에 대한 설명이며 한 끼나 하루 섭취량을 의미하지 않습니다.',
        goodPoint: concentrated ? null : summary,
        attention: concentrated ? '다양한 상품 구성을 원한다면 다른 카테고리도 함께 살펴볼 수 있습니다.' : null }
    }
  }
  analysis.compositionSignals = [analysis.composition.decision]
  analysis.productReasons = analysis.productReasons.map(product => {
    const row = rows.find(row => String(row.id) === String(product.id))
    const allergyMatches = safeStrings(context.excludedAllergens).filter(a => row.allergens.includes(a))
    const allergyChecks = allergyMatches.length ? [`사용자가 설정한 알레르기 성분 '${allergyMatches.join(' · ')}'가 포함되어 있습니다. 구매 전 실제 상품의 알레르기 표시사항을 확인해주세요.`] : []
    const missing = product.checks.filter(check => check.includes('정보가 충분하지'))
    const checks = [...allergyChecks, ...missing]
    return { ...product, quantity: quantities.get(String(product.id)), group: row.supplement ? '보조 영양 상품' : '일반 식품',
      allergyMatches, checks, needsAttention: checks.length > 0,
      tags: [...product.tags.filter(tag => !['확인 필요', '직접 관련 상품', '기타 식품'].includes(tag)), ...(checks.length ? ['확인 필요'] : [])],
      reasons: [...product.reasons.filter(reason => !product.checks.includes(reason)), ...checks] }
  }).sort((a,b) => b.allergyMatches.length - a.allergyMatches.length)
  const attention = analysis.balanceItems.find(item => item.key === 'attention')
  attention.count = analysis.productReasons.filter(p => p.needsAttention).length
  attention.text = `${attention.count} / ${rows.length}종`
  attention.status = attention.count ? 'attention' : 'good'
  attention.reason = '등록 알레르기 일치 또는 영양정보 미비를 확인합니다.'
  analysis.attentionPoints = analysis.productReasons.filter(p => p.needsAttention).map(p => `${p.name}: ${p.checks.join(' ')}`)
  if (analysis.composition.attention) analysis.attentionPoints.push(analysis.composition.attention)
  analysis.goodPoints = [...new Set([...(analysis.composition.goodPoint ? [analysis.composition.goodPoint] : []), ...analysis.goodPoints.filter(p => !p.includes('보완'))])]
  analysis.observations = analysis.goodPoints
  analysis.groups = [...new Set(analysis.productReasons.map(p => p.group))].map(label => ({ label, productIds: analysis.productReasons.filter(p => p.group === label).map(p => p.id) }))
  analysis.needsAttention = attention.count ? ['attention'] : []
  const action = analysis.composition.attention || '현재 담긴 상품의 카테고리와 표시 정보를 비교하며 다른 상품 유형도 함께 살펴보세요.'
  analysis.actionDirections = [{ key: 'review_cart_composition', fallbackText: action }]
  analysis.recommendation = { filterLabel: null, label: '다른 상품 유형 살펴보기' }
  analysis.fallback = { headline: '현재 장바구니 구성', summary: analysis.composition.detailSummary, actions: [action] }
  return analysis
}
