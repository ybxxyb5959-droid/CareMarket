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

export function selectDailyDeals(products, dateKey, limit = 4) {
  const candidates = products.filter(isDiscountProduct)
  const rotation = dayIndex(dateKey)
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
    if (selected.length >= limit) break
    const items = byCategory.get(category).sort((a, b) => (
      hash(`product:${a.id}`) - hash(`product:${b.id}`)
      || a.id - b.id
    ))
    selected.push(items[(rotation + hash(category)) % items.length])
  }

  if (selected.length < limit) {
    const selectedIds = new Set(selected.map((product) => product.id))
    const remaining = rotate(candidates
      .filter((product) => !selectedIds.has(product.id))
      .sort((a, b) => (
        hash(`remaining:${a.id}`) - hash(`remaining:${b.id}`)
        || a.id - b.id
      )), rotation)
    selected.push(...remaining.slice(0, limit - selected.length))
  }

  return selected
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
