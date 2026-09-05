import { supabase } from './supabase'
import { canonicalProductCategory, PRODUCT_CATEGORY } from '../data/mock.js'

const asNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

const asTextArray = (value) => (
  Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.trim()) : []
)

function deriveTags({ protein, sugar, sodium, caffeine, category }) {
  const tags = []
  const hasComparableFoodNutrition = canonicalProductCategory(category) !== PRODUCT_CATEGORY.SUPPLEMENT

  if (hasComparableFoodNutrition && protein >= 15) tags.push('고단백')
  if (hasComparableFoodNutrition && sugar <= 5) tags.push('저당')
  if (hasComparableFoodNutrition && sodium <= 250) tags.push('저염')
  if (!caffeine && /(영양제|음료)/.test(category) && tags.length < 3) tags.push('카페인 제외')

  return tags.slice(0, 3)
}

export function adaptProductRow(row) {
  const id = asNumber(row.product_id)
  const price = asNumber(row.price)
  const protein = asNumber(row.protein)
  const sugar = asNumber(row.sugar)
  const sodium = asNumber(row.sodium)
  const caffeine = Boolean(row.contains_caffeine)
  const category = row.category || ''
  const mainIngredients = asTextArray(row.main_ingredients)

  return {
    id,
    name: row.name || '',
    brand: row.brand || '',
    category,
    price,
    originalPrice: row.original_price == null ? price : asNumber(row.original_price),
    stock: asNumber(row.stock),
    summary: row.summary || '',
    origin: mainIngredients.slice(0, 2).join(' · ') || '상품 원재료 정보 참조',
    tags: deriveTags({ protein, sugar, sodium, caffeine, category }),
    image: row.image_url || '',
    nutrition: {
      servingSize: row.serving_size || '1회 제공량 정보 없음',
      calories: asNumber(row.calories),
      protein,
      carbs: asNumber(row.carbs),
      fat: asNumber(row.fat),
      sugar,
      sodium,
      special: mainIngredients.slice(0, 3).join(' · ') || `${category} 상품`,
    },
    allergens: asTextArray(row.allergens),
    caffeine,
    mainIngredients,
    delivery: '기본 배송 정책에 따라 배송',
    isActive: Boolean(row.is_active),
  }
}

export async function fetchActiveProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('product_id', { ascending: true })

  if (error) throw error
  return (data || []).map(adaptProductRow)
}
