import { supabase } from './supabase'
import { canonicalProductCategory, PRODUCT_CATEGORY } from '../data/mock.js'

const LOCAL_PRODUCT_IMAGE_PREVIEW = {
  1: '/assets/products/product-001-sous-vide-chicken-breast.webp',
  2: '/assets/products/product-002-smoked-chili-chicken-slices.webp',
  5: '/assets/products/product-005-freeze-dried-chicken-chips.webp',
  9: '/assets/products/product-009-cod-cubes.webp',
  10: '/assets/products/product-010-beef-round-slices.webp',
  11: '/assets/products/product-011-konjac-brown-rice-chicken-lunchbox.webp',
  13: '/assets/products/product-013-beef-roasted-vegetable-lunchbox.webp',
  20: '/assets/products/product-020-sweet-potato-chicken-sausage-lunchbox.webp',
  29: '/assets/products/product-029-green-grape-protein-jelly.webp',
  31: '/assets/products/product-031-original-protein-granola.webp',
  32: '/assets/products/product-032-cacao-nibs-protein-granola.webp',
  33: '/assets/products/product-033-berry-protein-cereal.webp',
  34: '/assets/products/product-034-cinnamon-whole-oat-granola.webp',
  35: '/assets/products/product-035-black-sesame-soybean-granola.webp',
  37: '/assets/products/product-037-konjac-low-calorie-granola.webp',
  38: '/assets/products/product-038-soyball-protein-granola.webp',
  39: '/assets/products/product-039-sweet-potato-granola.webp',
  40: '/assets/products/product-040-green-apple-chia-granola.webp',
  42: '/assets/products/product-042-unsweetened-almond-milk.webp',
  45: '/assets/products/product-045-goat-milk-yogurt-drink.webp',
  46: '/assets/products/product-046-black-soybean-milk.webp',
  50: '/assets/products/product-050-plain-kefir.webp',
  54: '/assets/products/product-054-banana-berry-pea-protein-smoothie.webp',
  55: '/assets/products/product-055-lemon-ginger-kombucha.webp',
  59: '/assets/products/product-059-strawberry-vanilla-wpi-shake.webp',
  71: '/assets/products/product-071-multivitamin-mineral.webp',
  72: '/assets/products/product-072-rtg-omega3.webp',
  75: '/assets/products/product-075-magnesium-b6-relax.webp',
  78: '/assets/products/product-078-fish-collagen-sticks.webp',
  80: '/assets/products/product-080-zinc-vitamin-c-chewables.webp',
  81: '/assets/products/product-081-zero-sugar-sweet-chili-sauce.webp',
  83: '/assets/products/product-083-allulose-spicy-chicken-sauce.webp',
  86: '/assets/products/product-086-himalayan-pink-salt-grinder.webp',
  87: '/assets/products/product-087-vegan-stock-powder.webp',
  92: '/assets/products/product-092-psyllium-husk-fiber.webp',
  94: '/assets/products/product-094-acacia-honey-squeeze-tube.webp',
  100: '/assets/products/product-100-bilberry-lutein-powder.webp',
}

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
  const previewImage = import.meta.env?.DEV ? LOCAL_PRODUCT_IMAGE_PREVIEW[id] : ''
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
    image: previewImage || row.image_url || '',
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
