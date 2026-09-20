// Heuristic screening, not a guarantee of semantic correctness. Facts remain
// independently rendered from registered data and are never replaced by prose.
export function validCartSummary(text, composition, metrics = [], goal = null) {
  if (typeof text !== 'string' || text.trim().length < 20 || text.length > 360) return false
  if (goal === '근육량 증가' && (!/단백질|고단백/.test(text) || /저당|당류|저염|나트륨/.test(text))) return false
  if (goal === '체중 관리' && !/열량|당류|저당|체중 관리|제공량/.test(text)) return false
  if (goal === '식단 영양 관리' && !/나트륨|식이섬유|당류|단백질|영양/.test(text)) return false
  if (/[0-9０-９<>]|https?:|치료|예방|효능|완치|진단|처방|면역|회복|감량 효과|살이 빠|균형 잡|완벽|건강한 식단|부족|과다|위험|권장.*섭취|반드시|좋아하|취향|충분|괜찮|문제없|최고|추천/.test(text)) return false
  if ((composition?.totalProducts || 0) < 2 && /여러|다양|모아|골고루/.test(text)) return false
  const products = composition?.products || []
  if (/다양|골고루/.test(text) && new Set(products.map(p => p.category)).size < 2) return false
  const labels = { protein: /단백질|고단백/, sugar: /당류|저당/, sodium: /나트륨|저염/, calories: /열량/, fiber: /식이섬유/ }
  let supportedTopic = false
  for (const [key, label] of Object.entries(labels)) {
    if (!label.test(text)) continue
    if (!products.some(p => p.nutrition?.[key] != null)) return false
    supportedTopic = true
  }
  for (const [key, claim] of [['protein', /고단백/], ['sugar', /저당/], ['sodium', /저염/]]) {
    if (!claim.test(text)) continue
    const metric = metrics.find(m => m.key === key)
    if (!metric?.count) return false
    if (/모두|전부/.test(text) && metric.count !== metric.total) return false
  }
  if (/채소|샐러드/.test(text) && !products.some(p => p.roles?.includes('vegetable'))) return false
  return supportedTopic || (/상품|장바구니/.test(text) && /제공량|표시사항|성분/.test(text))
}
