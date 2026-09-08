import { nutrientNumber, LOW_SUGAR_MAX, LOW_SODIUM_MAX, HIGH_PROTEIN_MIN } from '../../supabase/functions/_shared/nutrition-policy.js'
import { appendDemoSupplements } from '../data/demo-supplements.js'
import { usesCatalogDemoActives } from '../../supabase/functions/_shared/product-type.js'
import { supabase } from './supabase'
import { canonicalProductCategory, PRODUCT_CATEGORY } from '../data/mock.js'
import { resolveProductImage } from './product-images'

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

  if (hasComparableFoodNutrition && Number.isFinite(protein) && protein >= HIGH_PROTEIN_MIN) tags.push('고단백')
  if (hasComparableFoodNutrition && Number.isFinite(sugar) && sugar <= LOW_SUGAR_MAX) tags.push('저당')
  if (hasComparableFoodNutrition && Number.isFinite(sodium) && sodium <= LOW_SODIUM_MAX) tags.push('저염')
  if (!caffeine && /(영양제|음료)/.test(category) && tags.length < 3) tags.push('카페인 제외')

  return tags.slice(0, 3)
}

export function adaptProductRow(row) {
  const id = asNumber(row.product_id)
  const price = asNumber(row.price)
  const protein = nutrientNumber(row.protein)
  const sugar = nutrientNumber(row.sugar)
  const sodium = nutrientNumber(row.sodium)
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
    image: resolveProductImage(id, row.image_url),
    // Missing registered nutrition stays null throughout the shopping flow.
    nutritionAvailability: Object.fromEntries(['protein', 'sugar', 'sodium', 'calories'].map(key => [key,
      row[key] !== null && row[key] !== undefined && row[key] !== '' && Number.isFinite(Number(row[key])) && Number(row[key]) >= 0,
    ])),
    nutrition: {
      servingSize: row.serving_size || '1회 제공량 정보 없음',
      calories: nutrientNumber(row.calories),
      protein,
      carbs: nutrientNumber(row.carbs),
      fat: nutrientNumber(row.fat),
      sugar,
      sodium,
      special: mainIngredients.slice(0, 3).join(' · ') || `${category} 상품`,
    },
    allergens: asTextArray(row.allergens),
    caffeine,
    mainIngredients,
    isDemoIngredientData: usesCatalogDemoActives(row),
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
  return appendDemoSupplements((data || []).map(adaptProductRow))
}
