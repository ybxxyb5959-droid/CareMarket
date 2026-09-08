const localDateKey = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const hash = (value) => {
  let result = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index)
    result = Math.imul(result, 16777619)
  }
  return result >>> 0
}

export const DAILY_DEAL_MIN = 8
export const DAILY_DEAL_MAX = 16

const dailyDealCounts = [DAILY_DEAL_MIN, 12, DAILY_DEAL_MAX]

const dayIndex = (dateKey) => {
  const [year, month, day] = dateKey.split('-').map(Number)
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000)
}

const rotate = (items, offset) => {
  if (!items.length) return []
  const start = ((offset % items.length) + items.length) % items.length
  return [...items.slice(start), ...items.slice(0, start)]
}

export const isDiscountProduct = (product) => (
  product?.isActive === true
  && Number(product.stock) > 0
  && Number(product.originalPrice) > Number(product.price)
)

export const getLocalDateKey = (date = new Date()) => localDateKey(date)

export function getDailyDealCount(dateKey) {
  return dailyDealCounts[hash(`count:${dateKey}`) % dailyDealCounts.length]
}

export function selectDailyDeals(products, dateKey, limit) {
  const candidates = products.filter(isDiscountProduct)
  const rotation = dayIndex(dateKey)
  const targetCount = Number.isInteger(limit) ? Math.max(0, limit) : getDailyDealCount(dateKey)
  const byCategory = new Map()

  for (const product of candidates) {
    const category = product.category || '기타'
    if (!byCategory.has(category)) byCategory.set(category, [])
    byCategory.get(category).push(product)
  }

  const categories = rotate([...byCategory.keys()].sort((a, b) => (
    hash(`category:${a}`) - hash(`category:${b}`)
    || a.localeCompare(b, 'ko')
  )), rotation)
  const selected = []

  // First pass takes one item per category so a single category cannot dominate.
  for (const category of categories) {
    if (selected.length >= targetCount) break
    const items = byCategory.get(category).sort((a, b) => (
      hash(`${dateKey}:product:${a.id}`) - hash(`${dateKey}:product:${b.id}`)
      || a.id - b.id
    ))
    selected.push(items[(rotation + hash(category)) % items.length])
  }

  if (selected.length < targetCount) {
    const selectedIds = new Set(selected.map((product) => product.id))
    const remaining = candidates
      .filter((product) => !selectedIds.has(product.id))
      .sort((a, b) => (
        hash(`${dateKey}:remaining:${a.id}`) - hash(`${dateKey}:remaining:${b.id}`)
        || a.id - b.id
      ))
    selected.push(...remaining.slice(0, targetCount - selected.length))
  }

  return selected
}

export function getDailyDealPricing(product, dateKey) {
  const originalPrice = Math.max(0, Number(product?.originalPrice) || 0)
  const regularPrice = Math.max(0, Number(product?.price) || 0)
  const plannedExtraRate = 8 + (hash(`${dateKey}:extra:${product?.id}`) % 10)
  const roundingUnit = regularPrice >= 1000 ? 100 : regularPrice >= 100 ? 10 : 1
  const rawDealPrice = regularPrice * (100 - plannedExtraRate) / 100
  const todayPrice = regularPrice > 0
    ? Math.max(roundingUnit, Math.min(regularPrice - roundingUnit, Math.floor(rawDealPrice / roundingUnit) * roundingUnit))
    : 0

  return {
    originalPrice,
    regularPrice,
    todayPrice,
    regularRate: originalPrice > 0 ? Math.round((originalPrice - regularPrice) / originalPrice * 100) : 0,
    extraRate: regularPrice > 0 ? Math.round((regularPrice - todayPrice) / regularPrice * 100) : 0,
    totalRate: originalPrice > 0 ? Math.round((originalPrice - todayPrice) / originalPrice * 100) : 0,
  }
}

export function getCountdown(now = new Date()) {
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  const seconds = Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000))
  const hours = String(Math.floor(seconds / 3600)).padStart(2, '0')
  const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')
  const remainder = String(seconds % 60).padStart(2, '0')
  return `${hours}:${minutes}:${remainder}`
}
