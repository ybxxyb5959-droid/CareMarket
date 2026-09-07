// Presentation adapter only: all counts, classifications and reasons come from detail analysis.
export function cartQuickSummary(insight) {
  const metrics = insight?.balanceItems || []
  const products = insight?.productReasons || []
  const attention = metrics.find(item => item.key === 'attention')
  const checks = products.filter(product => product.needsAttention).map(product => {
    const allergy = product.checks.find(reason => reason.includes('알레르기'))
    const reason = (allergy || product.checks[0] || '')
      .replace(/설정하신 알레르기 성분\(([^)]+)\)이 포함되어 있습니다\. 원재료 정보를 확인해주세요\./, '$1 성분이 포함되어 있어요. 원재료를 확인해 주세요.')
      .replace(/으로 기존 (.+?) 탐색 기준 밖입니다\./, '으로 $1 기준을 확인해 주세요.')
    return { id: product.id, name: product.name, reason, allergy: Boolean(allergy) }
  }).sort((a, b) => Number(b.allergy) - Number(a.allergy))
  const count = attention?.count ?? checks.length
  const selectedMetrics = [...metrics.filter(item => !['attention', 'protein_complement'].includes(item.key)).slice(0, 2), ...(attention ? [attention] : [])]
  const hasFoodCriteria = metrics.some(item => ['protein', 'sugar', 'sodium', 'calories'].includes(item.key) && item.total > 0)
  const allCriteriaMet = hasFoodCriteria && metrics.filter(item => !['attention', 'supplement', 'protein_complement'].includes(item.key)).every(item => item.total > 0 && item.count === item.total)
  const summary = count ? `현재 구성에서 ${count}종은 확인이 필요해요.`
    : allCriteriaMet ? '현재 구성은 분석한 영양 기준에 전반적으로 잘 맞아요.'
      : '등록 정보에서 추가 확인 사항은 없어요. 상품별 구성도 살펴보세요.'
  return { summary, metrics: selectedMetrics, goodPoint: insight?.goodPoints?.[0] || null,
    checks: checks.slice(0, 2), remaining: Math.max(0, checks.length - 2), attentionCount: count,
    basis: insight?.basis?.primary_goal || '일반 구성', itemCount: products.length }
}
