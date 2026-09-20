// Conservative guard for the short AI-written title; numeric facts stay in code.
export function groundedCartHeadline(value, composition, basis = {}) {
  if (typeof value !== 'string') return false
  const title = value.trim()
  if (title.length < 5 || title.length > 48 || /[\d\r\n<>]|https?:|좋아하|취향|완벽|균형|건강|치료|예방|효능|다이어트|감량|증가|부족|과다|위험|최고|추천|맛있|필수|성공|달성|면역|회복|보장/.test(title)) return false
  const products = composition?.products || []
  if ((composition?.totalProducts || 0) < 2 && /다양|여러|모아|함께|골고루|모은/.test(title)) return false
  const facts = {
    단백질: products.some(p => p.highProtein || p.roles?.includes('protein')),
    채소: products.some(p => p.roles?.includes('vegetable')),
    샐러드: products.some(p => /샐러드/.test(p.name)),
    음료: products.some(p => p.roles?.includes('beverage')),
    간식: products.some(p => /간식|프로틴바/.test(`${p.category} ${p.name}`)),
    당류: products.some(p => p.nutrition?.sugar != null),
    나트륨: products.some(p => p.nutrition?.sodium != null),
    열량: products.some(p => p.nutrition?.calories != null),
    식이섬유: products.some(p => p.nutrition?.fiber != null),
    체중: basis.primary_goal === '체중 관리',
  }
  if (Object.entries(facts).some(([word, supported]) => title.includes(word) && !supported)) return false
  if (/다양|골고루/.test(title) && new Set(products.map(p => p.category)).size < 2) return false
  // Avoid turning a measured nutrient's presence into an unverified quality claim.
  if (/저당|저염|고단백|낮|높|풍부|가득|든든/.test(title)) return false
  return /상품|장바구니|영양정보|구성/.test(title) || Object.entries(facts).some(([word, supported]) => supported && title.includes(word))
}
