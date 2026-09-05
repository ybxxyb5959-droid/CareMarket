export const CART_ANALYSIS_VERSION = 2

// Keep these thresholds aligned with the existing catalog quick filters.
export const CART_NUTRITION_THRESHOLDS = Object.freeze({
  highProteinMin: 15,
  lowSugarMax: 5,
  lowSodiumMax: 250,
})

const SUPPLEMENT_CATEGORY = '영양제·비타민'
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

const ratio = (matching, total) => total > 0 ? matching / total : 0

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
  const normalized = normalizeCartAnalysisContext(context)
  return {
    personalized: Boolean(normalized.primaryGoal || normalized.selectedConditions.length || normalized.excludedAllergens.length),
    primary_goal: normalized.primaryGoal,
    selected_conditions: normalized.selectedConditions,
    excluded_allergens: normalized.excludedAllergens,
  }
}

function normalizeRows(rows) {
  return (Array.isArray(rows) ? rows : []).flatMap((entry) => {
    const product = entry?.product || {}
    const nutrition = product.nutrition || product
    const quantityValue = safeNumber(entry?.quantity)
    if (!quantityValue || quantityValue < 1) return []
    const quantity = Math.floor(quantityValue)
    return [{
      quantity,
      category: String(product.category || ''),
      allergens: safeStrings(product.allergens),
      caffeine: product.contains_caffeine === true || product.caffeine === true,
      nutrition: {
        calories: safeNumber(nutrition.calories),
        protein: safeNumber(nutrition.protein),
        sugar: safeNumber(nutrition.sugar),
        sodium: safeNumber(nutrition.sodium),
      },
    }]
  })
}

function nutrientStats(rows, key, matches) {
  const comparable = rows.filter((row) => row.nutrition[key] !== null)
  const totalQuantity = comparable.reduce((sum, row) => sum + row.quantity, 0)
  const matchingQuantity = comparable.reduce((sum, row) => (
    matches(row.nutrition[key]) ? sum + row.quantity : sum
  ), 0)
  return {
    available: totalQuantity > 0,
    totalQuantity,
    matchingQuantity,
    matchingRatio: ratio(matchingQuantity, totalQuantity),
    total: comparable.reduce((sum, row) => sum + row.nutrition[key] * row.quantity, 0),
  }
}

function makeItem(key, status, text, reason, priority) {
  return { key, label: NUTRIENT_LABELS[key], status, text, reason, priority }
}

function fallbackCopy({ singleProduct, repeatedProtein, dominant, needsAttention, needsBalance, observations, actionDirections }) {
  let headline
  if (repeatedProtein) {
    headline = '한 종류의 단백질 식품에 구성이 집중되어 있어요.'
  } else if (singleProduct) {
    headline = dominant.includes('protein')
      ? '단백질 함량이 높은 상품이에요.'
      : '현재 담긴 상품의 영양 특징을 살펴봤어요.'
  } else if (dominant.includes('protein')) {
    headline = '단백질 식품의 비중이 높은 편이에요.'
  } else if (needsAttention.includes('sodium')) {
    headline = '나트륨 구성을 한 번 확인해보세요.'
  } else if (needsAttention.includes('sugar')) {
    headline = '당류 구성을 한 번 확인해보세요.'
  } else if (needsBalance.includes('protein')) {
    headline = '단백질 상품을 함께 살펴볼 수 있어요.'
  } else {
    headline = '현재 장바구니의 영양 구성을 살펴봤어요.'
  }

  const summary = observations.slice(0, 2).join(' ') || '등록된 상품 영양정보를 수량까지 반영해 확인했어요.'
  const actions = actionDirections.slice(0, 2).map((direction) => direction.fallbackText)
  return {
    headline,
    summary,
    actions: actions.length ? actions : ['현재 구성을 유지하면서 상품별 영양정보를 함께 확인해보세요.'],
  }
}

export function analyzeCartNutrition(rawRows, rawContext = {}) {
  const rows = normalizeRows(rawRows)
  const context = normalizeCartAnalysisContext(rawContext)
  const foodRows = rows.filter((row) => row.category !== SUPPLEMENT_CATEGORY)
  const totalQuantity = rows.reduce((sum, row) => sum + row.quantity, 0)
  const singleProduct = rows.length === 1
  const selected = new Set(context.selectedConditions)
  const protein = nutrientStats(foodRows, 'protein', (value) => value >= CART_NUTRITION_THRESHOLDS.highProteinMin)
  const sugar = nutrientStats(foodRows, 'sugar', (value) => value <= CART_NUTRITION_THRESHOLDS.lowSugarMax)
  const sodium = nutrientStats(foodRows, 'sodium', (value) => value <= CART_NUTRITION_THRESHOLDS.lowSodiumMax)
  const calories = nutrientStats(foodRows, 'calories', () => true)

  const dominant = []
  const good = []
  const needsAttention = []
  const needsBalance = []
  const candidates = []

  if (protein.available) {
    if (protein.matchingRatio >= 0.6) {
      good.push('protein')
      dominant.push('protein')
      candidates.push(makeItem('protein', 'good', '비중 높음', '고단백 기준 상품의 비중이 높아요.', context.primaryGoal === '근육량 증가' ? 1 : 4))
    } else if (context.primaryGoal === '근육량 증가' || selected.has('고단백')) {
      needsBalance.push('protein')
      candidates.push(makeItem('protein', 'balance', '보완 살펴보기', '구매 목적에 비해 고단백 기준 상품의 비중이 적어요.', 1))
    }
  }

  if (sugar.available) {
    if (sugar.matchingRatio >= 0.6) {
      good.push('sugar')
      candidates.push(makeItem('sugar', 'good', '저당 위주', '저당 기준 상품이 주로 담겨 있어요.', context.primaryGoal === '체중 관리' || selected.has('저당') ? 2 : 6))
    } else {
      needsAttention.push('sugar')
      candidates.push(makeItem('sugar', 'attention', '확인 필요', '저당 기준 밖 상품의 비중을 확인해보세요.', 2))
    }
  }

  if (sodium.available) {
    if (sodium.matchingRatio >= 0.6) {
      good.push('sodium')
      candidates.push(makeItem('sodium', 'good', '저염 위주', '저염 기준 상품이 주로 담겨 있어요.', context.primaryGoal === '식단 영양 관리' || selected.has('저염') ? 2 : 5))
    } else {
      needsAttention.push('sodium')
      candidates.push(makeItem('sodium', 'attention', '확인 필요', '저염 기준 밖 상품의 비중을 확인해보세요.', 2))
    }
  }

  const caffeinatedQuantity = rows.reduce((sum, row) => row.caffeine ? sum + row.quantity : sum, 0)
  if (selected.has('카페인 제외')) {
    if (caffeinatedQuantity > 0) {
      needsAttention.push('caffeine')
      candidates.push(makeItem('caffeine', 'attention', '확인 필요', '카페인 제외 조건과 다른 상품이 포함돼 있어요.', 0))
    } else {
      good.push('caffeine')
      candidates.push(makeItem('caffeine', 'good', '미포함', '현재 담긴 상품에는 카페인이 표시되지 않았어요.', 3))
    }
  }

  const allergenHit = context.excludedAllergens.some((allergen) => (
    rows.some((row) => row.allergens.includes(allergen))
  ))
  if (allergenHit) {
    needsAttention.push('allergens')
    candidates.push(makeItem('allergens', 'attention', '확인 필요', '설정한 제외 성분이 표시된 상품이 포함돼 있어요.', 0))
  }

  const categories = new Map()
  for (const row of rows) categories.set(row.category, (categories.get(row.category) || 0) + row.quantity)
  const largestCategoryQuantity = Math.max(0, ...categories.values())
  const categoryConcentrated = !singleProduct && rows.length > 1 && ratio(largestCategoryQuantity, totalQuantity) >= 0.6
  const repeatedProtein = singleProduct && totalQuantity > 1 && dominant.includes('protein')
  if (repeatedProtein) {
    needsBalance.push('diversity')
    candidates.push(makeItem('diversity', 'balance', '낮음', '한 종류의 단백질 식품이 반복되어 있어요.', 1))
  }

  let calorieConcentrated = false
  if (!singleProduct && rows.length > 1 && context.primaryGoal === '체중 관리' && calories.total > 0) {
    calorieConcentrated = foodRows.some((row) => (
      row.nutrition.calories !== null && (row.nutrition.calories * row.quantity) / calories.total >= 0.6
    ))
    if (calorieConcentrated) {
      needsAttention.push('calories')
      candidates.push(makeItem('calories', 'attention', '비중 확인', '특정 상품이 열량 합계에 미치는 비중이 큰 편이에요.', 1))
    }
  }

  const observations = []
  if (repeatedProtein) {
    observations.push('비슷한 특성의 상품이 반복되어 있어 상품 다양성이 낮은 구성이에요.')
    observations.push('식이섬유를 보완할 수 있는 식품군을 함께 살펴보세요.')
  } else if (singleProduct) observations.push('현재 담긴 한 종류 상품의 영양 특징을 살펴봤어요.')
  if (allergenHit) observations.push('설정한 제외 성분이 표시된 상품이 있어 원재료 표시를 확인해보는 것이 좋아요.')
  if (dominant.includes('protein')) observations.push(singleProduct
    ? '등록 정보 기준으로 고단백 기준에 해당하는 상품이에요.'
    : '현재 장바구니는 고단백 기준 상품의 비중이 높은 편이에요.')
  if (needsBalance.includes('protein')) observations.push('구매 목적을 기준으로 볼 때 고단백 상품 구성은 상대적으로 적은 편이에요.')
  if (needsAttention.includes('sodium')) observations.push(singleProduct
    ? '이 상품은 저염 기준 밖이어서 나트륨 정보를 확인해볼 수 있어요.'
    : '저염 기준 밖 상품이 여러 개 담겨 있어 나트륨 정보를 확인해보는 것이 좋아요.')
  if (needsAttention.includes('sugar')) observations.push(singleProduct
    ? '이 상품은 저당 기준 밖이어서 당류 정보를 확인해볼 수 있어요.'
    : '저당 기준 밖 상품이 여러 개 담겨 있어 당류 정보를 확인해보는 것이 좋아요.')
  if (caffeinatedQuantity > 0 && selected.has('카페인 제외')) observations.push('카페인 제외 조건과 다른 상품이 함께 담겨 있어요.')
  if (calorieConcentrated) observations.push('특정 상품이 장바구니 열량 합계에 미치는 비중이 큰 편이에요.')
  if (categoryConcentrated) observations.push('비슷한 상품군이 여러 개 담겨 있어요.')
  if (observations.length === (singleProduct ? 1 : 0) && good.includes('sugar') && good.includes('sodium')) {
    observations.push('저당·저염 기준 상품이 주로 포함된 구성이에요.')
  }

  const actionDirections = []
  if (allergenHit) actionDirections.push({ key: 'check_allergens', fallbackText: '구매 전 상품의 알레르기 및 원재료 표시를 다시 확인해보세요.' })
  if (repeatedProtein) actionDirections.push({ key: 'vary_fiber_food_groups', fallbackText: '채소·통곡물·견과류 계열 상품을 함께 구성해보세요.' })
  if (needsAttention.includes('sodium')) actionDirections.push({ key: 'low_sodium', filterLabel: '저염', ctaLabel: '저염 상품 살펴보기', fallbackText: '나트륨을 확인할 상품이 여러 개라면 저염 상품으로 하나를 바꾸어보세요.' })
  if (needsAttention.includes('sugar')) actionDirections.push({ key: 'low_sugar', filterLabel: '저당', ctaLabel: '저당 상품 살펴보기', fallbackText: '저당 상품으로 바꿀 수 있는 항목이 있는지 살펴보세요.' })
  if (needsBalance.includes('protein')) actionDirections.push({ key: 'high_protein', filterLabel: '고단백', ctaLabel: '고단백 상품 살펴보기', fallbackText: '고단백 상품을 함께 살펴보세요.' })
  if (needsAttention.includes('caffeine')) actionDirections.push({ key: 'exclude_caffeine', filterLabel: '카페인 제외', ctaLabel: '카페인 제외 상품 살펴보기', fallbackText: '카페인 제외 조건으로 대체 상품을 확인해보세요.' })
  if (calorieConcentrated) actionDirections.push({ key: 'review_quantity', fallbackText: '상품별 열량을 비교하고 장바구니 수량을 조정해보세요.' })
  if (categoryConcentrated) actionDirections.push({ key: 'vary_categories', fallbackText: '다른 상품군을 하나 더해 구성을 다양하게 살펴보세요.' })
  if (!actionDirections.length) actionDirections.push({ key: 'review_product_labels', fallbackText: '현재 구성을 유지하면서 상품별 영양정보를 함께 확인해보세요.' })

  const balanceItems = candidates
    .sort((a, b) => a.priority - b.priority || a.key.localeCompare(b.key))
    .slice(0, 3)
    .map(({ priority: _priority, ...item }) => item)
  const compositionSignals = [
    ...(repeatedProtein ? ['repeated_protein_product'] : []),
    ...(categoryConcentrated ? ['category_concentrated'] : []),
    ...(calorieConcentrated ? ['calorie_concentrated'] : []),
    ...(allergenHit ? ['excluded_allergen_present'] : []),
  ]
  const fallback = fallbackCopy({ singleProduct, repeatedProtein, dominant, needsAttention, needsBalance, observations, actionDirections })
  const totals = Object.fromEntries(['calories', 'protein', 'sugar', 'sodium']
    .map((key) => [key, { calories, protein, sugar, sodium }[key]])
    .filter(([, stats]) => stats.available)
    .map(([key, stats]) => [key, stats.total]))

  return {
    version: CART_ANALYSIS_VERSION,
    itemCount: rows.length,
    totalQuantity,
    singleProduct,
    totals,
    availableNutrients: Object.keys(totals),
    dominant: [...new Set(dominant)],
    good: [...new Set(good)],
    needsAttention: [...new Set(needsAttention)],
    needsBalance: [...new Set(needsBalance)],
    compositionSignals,
    balanceItems,
    observations: observations.slice(0, 4),
    actionDirections: actionDirections.slice(0, 4),
    recommendation: actionDirections.find((item) => item.filterLabel)
      ? (() => {
          const item = actionDirections.find((direction) => direction.filterLabel)
          return { filterLabel: item.filterLabel, label: item.ctaLabel }
        })()
      : null,
    fallback,
  }
}

export function cartAnalysisForGemini(analysis, basis) {
  return {
    goal: basis.primary_goal,
    selected_conditions: basis.selected_conditions,
    cart_scope: {
      item_count: analysis.itemCount,
      total_quantity: analysis.totalQuantity,
      single_product: analysis.singleProduct,
    },
    analysis: {
      dominant: analysis.dominant,
      good: analysis.good,
      needs_attention: analysis.needsAttention,
      needs_balance: analysis.needsBalance,
      composition_signals: analysis.compositionSignals,
      balance_items: analysis.balanceItems.map(({ key, label, status, text }) => ({ key, label, status, text })),
      confirmed_facts: analysis.observations,
      allowed_action_directions: analysis.actionDirections.map(({ key }) => key),
    },
  }
}

export function composeCartInsight(analysis, basis, narrative = null, aiExplanationAvailable = false) {
  const copy = narrative || analysis.fallback
  const foodGroupAction = analysis.actionDirections.find((item) => item.key === 'vary_fiber_food_groups')
  // Keep the concrete deterministic suggestion if Gemini only gives a broad direction.
  const actions = foodGroupAction && !copy.actions.some((action) => (
    ['채소', '통곡물', '견과류'].every((group) => action.includes(group))
  )) ? [...copy.actions.slice(0, 1), foodGroupAction.fallbackText] : copy.actions
  return {
    headline: copy.headline,
    summary: copy.summary,
    balanceItems: analysis.balanceItems,
    currentFeatures: analysis.observations,
    actionTitle: '이렇게 보완해보세요',
    actions,
    recommendation: analysis.recommendation,
    basis,
    analysisVersion: analysis.version,
    aiExplanationAvailable,
    ...(!aiExplanationAvailable ? { explanationNotice: '상세 설명을 불러오지 못했어요. 계산된 분석 결과를 보여드려요.' } : {}),
  }
}

// Reject older deployments and partial responses before they enter the UI cache.
export function isCartInsight(value) {
  const text = (item) => typeof item === 'string' && item.trim().length > 0
  return Boolean(value && value.analysisVersion === CART_ANALYSIS_VERSION
    && text(value.headline) && text(value.summary)
    && Array.isArray(value.actions) && value.actions.length > 0 && value.actions.every(text)
    && Array.isArray(value.currentFeatures) && value.currentFeatures.every(text)
    && Array.isArray(value.balanceItems) && value.balanceItems.every((item) => (
      item && text(item.key) && text(item.label) && text(item.text)
      && ['good', 'attention', 'balance'].includes(item.status)
    )))
}
