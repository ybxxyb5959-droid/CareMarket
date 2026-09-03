// 장바구니 영양 계산 (mock 데이터 기반, 단순 합산 · 의료 판정 없음)

export const NUTRIENT_META = {
  calories: { label: '열량', total: '총 열량', unit: 'kcal', decimals: 0 },
  protein: { label: '단백질', total: '총 단백질', unit: 'g', decimals: 1 },
  sugar: { label: '당류', total: '총 당류', unit: 'g', decimals: 1 },
  sodium: { label: '나트륨', total: '총 나트륨', unit: 'mg', decimals: 0 },
}

// 주목표별 강조 영양성분
export const GOAL_NUTRIENTS = {
  '근육량 증가': ['protein', 'calories'],
  '체중 관리': ['calories', 'sugar'],
  '식단 영양 관리': ['sodium', 'sugar'],
  '영양제 탐색': [], // 주요 성분/카테고리로 별도 표시
}

// 값 포맷 (1회 제공량 또는 합산 공용)
export const fmtNutrient = (key, value) => {
  const meta = NUTRIENT_META[key]
  const rounded = meta.decimals === 0
    ? Math.round(value)
    : Math.round(value * 10 ** meta.decimals) / 10 ** meta.decimals
  return `${rounded.toLocaleString('ko-KR')}${meta.unit}`
}

// 수량 반영 장바구니 전체 합산
export const cartNutritionTotals = (cart) =>
  cart.reduce(
    (acc, { product, quantity }) => {
      const n = product.nutrition
      acc.calories += (n.calories || 0) * quantity
      acc.protein += (n.protein || 0) * quantity
      acc.sugar += (n.sugar || 0) * quantity
      acc.sodium += (n.sodium || 0) * quantity
      return acc
    },
    { calories: 0, protein: 0, sugar: 0, sodium: 0 },
  )
