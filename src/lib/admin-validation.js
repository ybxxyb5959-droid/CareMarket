import { canonicalProductCategory, PRODUCT_CATEGORIES } from '../data/mock.js'

export { PRODUCT_CATEGORIES }

export const ALLERGEN_OPTIONS = ['우유', '대두', '계란', '견과류', '밀', '갑각류', '복숭아', '쇠고기', '닭고기']

export const ORDER_STATUS_LABELS = {
  pending: '미완료',
  paid: '결제완료',
  preparing: '상품준비중',
  shipped: '배송중',
  delivered: '배송완료',
}

export const NEXT_ORDER_STATUS = { paid: 'preparing', preparing: 'shipped', shipped: 'delivered' }

export const isBulkShippableOrder = (order) => order?.status === 'preparing'

export function summarizeAdminOrders(orders = []) {
  return orders.reduce((summary, order) => {
    summary.total += 1
    if (order.status === 'preparing') summary.preparing += 1
    else if (order.status === 'shipped') summary.shipped += 1
    else if (order.status === 'delivered') summary.delivered += 1
    else summary.needsReview += 1
    return summary
  }, { total: 0, preparing: 0, shipped: 0, delivered: 0, needsReview: 0 })
}

const numberOrNull = (value) => {
  if (value === '' || value == null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const listFromText = (value) => (
  Array.isArray(value) ? value : String(value || '').split(',').map((item) => item.trim()).filter(Boolean)
)

export function toAdminProductForm(product) {
  if (!product) return { name: '', brand: '', category: PRODUCT_CATEGORIES[0], price: '', original_price: '', stock: '', summary: '', serving_size: '', calories: '', protein: '', carbs: '', fat: '', sugar: '', sodium: '', allergens: [], contains_caffeine: false, main_ingredients: '', is_active: true, image_url: '' }
  return { ...product, original_price: product.original_price ?? '', allergens: product.allergens || [], main_ingredients: (product.main_ingredients || []).join(', ') }
}

export function validateAdminProduct(form) {
  const name = String(form.name || '').trim()
  const brand = String(form.brand || '').trim()
  const category = canonicalProductCategory(form.category)
  const imageUrl = String(form.image_url || '').trim()
  const requiredNumbers = ['price', 'stock', 'calories', 'protein', 'carbs', 'fat', 'sugar', 'sodium']
  const values = Object.fromEntries(requiredNumbers.map((field) => [field, numberOrNull(form[field])]))
  if (!name || !brand) throw new Error('상품명과 브랜드를 입력해 주세요.')
  if (!PRODUCT_CATEGORIES.includes(category)) throw new Error('등록된 카테고리 중에서 선택해 주세요.')
  if (!imageUrl) throw new Error('상품 이미지 URL을 입력해 주세요.')
  if (requiredNumbers.some((field) => values[field] == null || values[field] < 0)) throw new Error('가격, 재고, 영양성분은 0 이상의 숫자로 입력해 주세요.')
  const originalPrice = numberOrNull(form.original_price)
  if (originalPrice != null && originalPrice < 0) throw new Error('정가는 0 이상의 숫자로 입력해 주세요.')
  const allergens = listFromText(form.allergens)
  if (allergens.some((item) => !ALLERGEN_OPTIONS.includes(item))) throw new Error('알레르기 항목은 CareMarket 허용값만 선택할 수 있습니다.')
  return { name, brand, category, price: values.price, original_price: originalPrice, stock: values.stock, summary: String(form.summary || '').trim() || null, serving_size: String(form.serving_size || '').trim() || null, calories: values.calories, protein: values.protein, carbs: values.carbs, fat: values.fat, sugar: values.sugar, sodium: values.sodium, allergens, contains_caffeine: Boolean(form.contains_caffeine), main_ingredients: listFromText(form.main_ingredients), is_active: Boolean(form.is_active), image_url: imageUrl }
}
