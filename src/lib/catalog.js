import {
  canonicalProductCategory,
  matchCategory,
  PRODUCT_CATEGORY,
} from '../data/mock.js'

const DEFAULT_GOAL = '식단 영양 관리'
const CATEGORY_SCORE_UNIT = 1000
const RELIABLE_NUTRITION_BONUS = 100
const DIVERSITY_WINDOW = 12
const DIVERSITY_MIN_CATEGORY_FIT = 3
const DIVERSITY_MAX_PER_CATEGORY = 3

// 실제 DB category 10개를 구매 목적별로 해석한다. 숫자가 클수록 목적의 주된 상품군이다.
const GOAL_CATEGORY_FIT = Object.freeze({
  '근육량 증가': Object.freeze({
    [PRODUCT_CATEGORY.HIGH_PROTEIN_FOOD]: 5,
    [PRODUCT_CATEGORY.MEAL]: 4.5,
    [PRODUCT_CATEGORY.PROTEIN_SNACK]: 4,
    [PRODUCT_CATEGORY.DRINK]: 3.5,
    [PRODUCT_CATEGORY.DAIRY_ALTERNATIVE]: 3.5,
    [PRODUCT_CATEGORY.CEREAL]: 2.5,
    [PRODUCT_CATEGORY.NUTS]: 2,
    [PRODUCT_CATEGORY.HEALTH_FOOD]: 1.5,
    [PRODUCT_CATEGORY.SUPPLEMENT]: 1,
    [PRODUCT_CATEGORY.SAUCE]: 0.5,
  }),
  '체중 관리': Object.freeze({
    [PRODUCT_CATEGORY.MEAL]: 5,
    [PRODUCT_CATEGORY.HIGH_PROTEIN_FOOD]: 4.75,
    [PRODUCT_CATEGORY.PROTEIN_SNACK]: 4,
    [PRODUCT_CATEGORY.CEREAL]: 4,
    [PRODUCT_CATEGORY.DAIRY_ALTERNATIVE]: 3.5,
    [PRODUCT_CATEGORY.DRINK]: 3.5,
    [PRODUCT_CATEGORY.NUTS]: 3,
    [PRODUCT_CATEGORY.HEALTH_FOOD]: 1.5,
    [PRODUCT_CATEGORY.SAUCE]: 1,
    [PRODUCT_CATEGORY.SUPPLEMENT]: 0.5,
  }),
  '식단 영양 관리': Object.freeze({
    [PRODUCT_CATEGORY.MEAL]: 5,
    [PRODUCT_CATEGORY.HIGH_PROTEIN_FOOD]: 4.5,
    [PRODUCT_CATEGORY.PROTEIN_SNACK]: 4,
    [PRODUCT_CATEGORY.CEREAL]: 4,
    [PRODUCT_CATEGORY.DAIRY_ALTERNATIVE]: 3.5,
    [PRODUCT_CATEGORY.NUTS]: 3.5,
    [PRODUCT_CATEGORY.DRINK]: 3.25,
    [PRODUCT_CATEGORY.SAUCE]: 2,
    [PRODUCT_CATEGORY.HEALTH_FOOD]: 1.5,
    [PRODUCT_CATEGORY.SUPPLEMENT]: 0.5,
  }),
  '영양제 탐색': Object.freeze({
    [PRODUCT_CATEGORY.SUPPLEMENT]: 5,
    [PRODUCT_CATEGORY.HEALTH_FOOD]: 2,
    [PRODUCT_CATEGORY.DRINK]: 1.5,
    [PRODUCT_CATEGORY.DAIRY_ALTERNATIVE]: 1,
    [PRODUCT_CATEGORY.NUTS]: 0.75,
    [PRODUCT_CATEGORY.PROTEIN_SNACK]: 0.5,
    [PRODUCT_CATEGORY.CEREAL]: 0.5,
    [PRODUCT_CATEGORY.HIGH_PROTEIN_FOOD]: 0.25,
    [PRODUCT_CATEGORY.MEAL]: 0.25,
    [PRODUCT_CATEGORY.SAUCE]: 0.25,
  }),
})

const GOAL_NUTRIENT_KEYS = Object.freeze({
  '근육량 증가': ['protein', 'sugar'],
  '체중 관리': ['calories', 'sugar'],
  '식단 영양 관리': ['sodium', 'sugar'],
  '영양제 탐색': [],
})

function resolvedGoal(goal) {
  return GOAL_CATEGORY_FIT[goal] ? goal : DEFAULT_GOAL
}

function categoryFit(product, goal) {
  const category = canonicalProductCategory(product.category)
  return GOAL_CATEGORY_FIT[resolvedGoal(goal)][category] || 0
}

// DB는 영양값을 NOT NULL DEFAULT 0으로 저장하므로 숫자 0만으로 실제 0과 해당 없음을
// 구분할 수 없다. 식품 목표에서는 영양제의 식품 영양표를 비교 불가로 보고 중립 처리한다.
export function hasComparableNutrition(product, goal) {
  const effectiveGoal = resolvedGoal(goal)
  if (effectiveGoal !== '영양제 탐색'
    && canonicalProductCategory(product.category) === PRODUCT_CATEGORY.SUPPLEMENT) return false

  return GOAL_NUTRIENT_KEYS[effectiveGoal].every((key) => {
    const value = product.nutrition?.[key]
    return value !== null && value !== '' && Number.isFinite(Number(value))
  })
}

function nutritionFit(product, goal) {
  const effectiveGoal = resolvedGoal(goal)
  if (effectiveGoal === '영양제 탐색' || !hasComparableNutrition(product, effectiveGoal)) return 0

  const n = product.nutrition
  if (effectiveGoal === '근육량 증가') return n.protein * 20 - n.sugar
  if (effectiveGoal === '체중 관리') return 1000 - n.calories - n.sugar * 20
  return 1000 - n.sodium - n.sugar * 5
}

export function goalScoreDetails(product, goal) {
  const effectiveGoal = resolvedGoal(goal)
  const category = categoryFit(product, effectiveGoal) * CATEGORY_SCORE_UNIT
  const nutrition = nutritionFit(product, effectiveGoal)
  const dataReliability = hasComparableNutrition(product, effectiveGoal)
    ? RELIABLE_NUTRITION_BONUS
    : 0

  return {
    category,
    nutrition,
    dataReliability,
    total: category + nutrition + dataReliability,
  }
}

// 기존 영양 산식은 유지하고, 목표별 category와 데이터 비교 가능성을 앞단 점수로 더한다.
export function goalScore(product, goal) {
  return goalScoreDetails(product, goal).total
}

function compareRecommendation(a, b, goal) {
  return goalScore(b, goal) - goalScore(a, goal) || a.id - b.id
}

function diversifyTopRecommendations(sortedProducts, goal) {
  const effectiveGoal = resolvedGoal(goal)
  if (effectiveGoal === '영양제 탐색') return sortedProducts

  const pool = [...sortedProducts]
  const top = []
  const categoryCounts = new Map()

  while (pool.length && top.length < DIVERSITY_WINDOW) {
    const repeatedCategory = top.length >= 2
      && canonicalProductCategory(top.at(-1).category) === canonicalProductCategory(top.at(-2).category)
      ? canonicalProductCategory(top.at(-1).category)
      : null

    let nextIndex = pool.findIndex((product) => {
      const category = canonicalProductCategory(product.category)
      return categoryFit(product, effectiveGoal) >= DIVERSITY_MIN_CATEGORY_FIT
        && (categoryCounts.get(category) || 0) < DIVERSITY_MAX_PER_CATEGORY
        && category !== repeatedCategory
    })
    if (nextIndex < 0) nextIndex = 0

    const [next] = pool.splice(nextIndex, 1)
    const category = canonicalProductCategory(next.category)
    categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1)
    top.push(next)
  }

  return [...top, ...pool]
}

function isSellable(product) {
  return product.isActive !== false && (product.stock == null || product.stock > 0)
}

// 상품 목록 필터 + 정렬 (Home 프리뷰 / 맞춤 상품 / 전체상품 페이지 공용)
export function filterAndSort(products, { search, subFilters, allergies, sortBy, goal, shopCategory, shopSub, dealsOnly = false }) {
  let list = products.filter((p) => {
    if (!isSellable(p)) return false
    if (dealsOnly && !(p.originalPrice > p.price)) return false
    if (!matchCategory(p, shopCategory, shopSub)) return false
    if (search) {
      const q = search.toLowerCase()
      if (!p.name.toLowerCase().includes(q) && !p.brand.toLowerCase().includes(q) && !p.category.toLowerCase().includes(q)) return false
    }
    for (const tag of subFilters) {
      if (tag === '고단백' && p.nutrition.protein < 15) return false
      if (tag === '저당' && p.nutrition.sugar > 5) return false
      if (tag === '저염' && p.nutrition.sodium > 250) return false
      if (tag === '카페인 제외' && p.caffeine) return false
    }
    // 알레르기: 선택된 개별 성분 기준으로 항상 제외
    if (allergies.length && p.allergens.some((a) => allergies.includes(a))) return false
    return true
  })
  if (sortBy === 'lowPrice') list = [...list].sort((a, b) => a.price - b.price || a.id - b.id)
  else if (sortBy === 'highPrice') list = [...list].sort((a, b) => b.price - a.price || a.id - b.id)
  else list = diversifyTopRecommendations([...list].sort((a, b) => compareRecommendation(a, b, goal)), goal)
  return list
}
