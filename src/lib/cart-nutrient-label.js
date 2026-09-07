import { isSupplement, measuredSupplementIngredients } from '../../supabase/functions/_shared/product-type.js'

const MASS_FACTORS = { kg: 1000000, g: 1000, mg: 1, mcg: 0.001, 'μg': 0.001, 'µg': 0.001 }

function largestIngredient(product) {
  const ingredients = measuredSupplementIngredients(product).map(item => {
    const [, number, unit] = item.amount.match(/^([\d,.]+)(.+)$/)
    return { name: item.name, value: Number(number.replaceAll(',', '')) * (MASS_FACTORS[unit] ?? 1), unit: unit in MASS_FACTORS ? 'mass' : unit }
  }).filter(item => Number.isFinite(item.value) && item.value > 0)
  // Prefer comparable mass measurements; IU/CFU cannot be converted to mass.
  const unit = ingredients.find(item => item.unit === 'mass')?.unit ?? ingredients[0]?.unit
  return ingredients.filter(item => item.unit === unit).reduce((largest, item) =>
    !largest || item.value > largest.value ? item : largest, null)?.name ?? null
}

export function getGoalNutrientLabel(goal, product) {
  if (isSupplement(product)) return largestIngredient(product)
  const key = goal === '근육량 증가' ? 'protein'
    : goal === '식단 영양 관리' ? 'sodium'
      : ['체중 관리', '영양제 탐색'].includes(goal) ? 'calories' : null
  if (!key || product?.nutritionAvailability?.[key] === false) return null
  const value = product?.nutrition?.[key]
  if (value == null || value === '' || !Number.isFinite(Number(value)) || Number(value) < 0) return null
  const formatted = Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 1 })
  return key === 'protein' ? `단백질 ${formatted}g` : key === 'sodium' ? `나트륨 ${formatted}mg` : `${formatted}kcal`
}
