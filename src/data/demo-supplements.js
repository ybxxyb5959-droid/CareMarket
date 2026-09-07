import { SUPPLEMENT_CATEGORY, measuredSupplementIngredients, supplementGoalMatch } from '../../supabase/functions/_shared/product-type.js'

// Fictional CareMarket portfolio catalog. These are invented demo registrations,
// never brand specifications or replacements for products.main_ingredients.
export const demoSupplementActives = Object.freeze({
  900001: ['크레아틴 모노하이드레이트 3,000mg'],
  900002: ['카테킨 300mg'],
  900003: ['바나바잎 추출물 100mg'],
})
export function withDemoSupplementActives(product) {
  if (!product.isDemoProduct || measuredSupplementIngredients(product).length || !demoSupplementActives[product.id]) return product
  return { ...product, mainIngredients: demoSupplementActives[product.id], isDemoIngredientData: true }
}
export const demoSupplements = [
  [900001, '크레아틴 모노 60회분', 24900, '1일 1스푼', '근육량 증가'],
  [900002, '카테킨 데일리 60캡슐', 19900, '1일 1캡슐', '체중 관리'],
  [900003, '바나바잎 데일리 60정', 18900, '1일 1정', '식단 영양 관리'],
].map(([id, name, price, servingSize, demoGoal]) => withDemoSupplementActives({
  id, name, price, originalPrice: price, brand: 'CARE LABS · DEMO', category: SUPPLEMENT_CATEGORY,
  isDemoProduct: true, demoGoal, stock: 99, isActive: true, mainIngredients: [],
  summary: 'CareMarket 포트폴리오 시연용 상품입니다. 주요 성분을 기준으로 비교할 수 있습니다.',
  image: `/assets/demo/supplement-${id}-photo.webp`, origin: 'CareMarket demo catalog', tags: [], allergens: [], caffeine: false,
  nutrition: { servingSize, calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, sodium: 0 },
  delivery: '시연용 상품 · 실제 배송 없음',
}))
export const appendDemoSupplements = products => [...products, ...demoSupplements.filter(demo =>
  !products.some(product => product.id === demo.id || supplementGoalMatch(product, demo.demoGoal)))]
