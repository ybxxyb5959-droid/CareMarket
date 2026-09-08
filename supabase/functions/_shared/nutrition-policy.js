// CareMarket existing quick-filter defaults, per registered serving.
export const LOW_SUGAR_MAX = 5
export const LOW_SODIUM_MAX = 250
export const HIGH_PROTEIN_MIN = 15
export const nutrientNumber = value => value == null || value === '' || !Number.isFinite(Number(value)) || Number(value) < 0 ? null : Number(value)
export function compareNutrient(a, b, descending = false) {
  const left = nutrientNumber(a), right = nutrientNumber(b)
  if (left === null) return right === null ? 0 : 1
  if (right === null) return -1
  return descending ? right - left : left - right
}
