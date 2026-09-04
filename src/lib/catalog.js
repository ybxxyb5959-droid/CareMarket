import { matchCategory } from '../data/mock'

// 목표별 추천 정렬 점수
export function goalScore(product, goal) {
  const n = product.nutrition
  if (goal === '근육량 증가') return n.protein * 20 - n.sugar
  if (goal === '체중 관리') return 1000 - n.calories - n.sugar * 20
  if (goal === '영양제 탐색') return product.category === '영양제·비타민' ? 1000 : 0
  return 1000 - n.sodium - n.sugar * 5
}

// 상품 목록 필터 + 정렬 (Home 프리뷰 / 전체상품 페이지 공용)
export function filterAndSort(products, { search, subFilters, allergies, sortBy, goal, shopCategory, shopSub }) {
  let list = products.filter((p) => {
    if (!matchCategory(p, shopCategory, shopSub)) return false
    if (search) {
      const q = search.toLowerCase()
      if (!p.name.toLowerCase().includes(q) && !p.brand.toLowerCase().includes(q) && !p.category.toLowerCase().includes(q)) return false
    }
    for (const tag of subFilters) {
      if (tag === '고단백' && p.nutrition.protein < 15) return false
      if (tag === '저당' && p.nutrition.sugar > 5) return false
      if (tag === '저염' && p.nutrition.sodium > 250) return false
      if (tag === '카페인 제외' && p.caffeine) return false
    }
    // 알레르기: 선택된 개별 성분 기준으로 항상 제외
    if (allergies.length && p.allergens.some((a) => allergies.includes(a))) return false
    return true
  })
  if (sortBy === 'lowPrice') list = [...list].sort((a, b) => a.price - b.price)
  else if (sortBy === 'highPrice') list = [...list].sort((a, b) => b.price - a.price)
  else if (sortBy === 'review') list = [...list].sort((a, b) => b.reviewCount - a.reviewCount)
  else list = [...list].sort((a, b) => goalScore(b, goal) - goalScore(a, goal) || a.id - b.id)
  return list
}
