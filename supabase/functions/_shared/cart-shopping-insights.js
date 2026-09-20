// Compare only registered, matching serving amounts within one category.
const servingKey = value => {
  const text = String(value || '').trim()
  const amount = text.match(/^(?:1\s*(?:팩|병|개|봉|회|회 제공량))\s*\(\s*(\d+(?:\.\d+)?\s*(?:g|ml))\s*\)$/i)?.[1] || text
  const match = amount.match(/^(\d+(?:\.\d+)?)\s*(g|ml)$/i)
  return match && Number(match[1]) > 0 ? `${Number(match[1])}${match[2].toLowerCase()}` : null
}
const nutrients = [
  { key: 'protein', label: '단백질', unit: 'g' },
  { key: 'sugar', label: '당류', unit: 'g' },
  { key: 'sodium', label: '나트륨', unit: 'mg' },
]

export function cartShoppingInsights(rows, productReasons) {
  return productReasons.map(product => {
    const row = rows.find(item => String(item.id) === String(product.id))
    const findings = []
    if (product.checks.length) findings.push({ kind: 'check', text: product.checks[0] })
    if (!row.supplement) {
      const peers = rows.filter(other => !other.supplement && other.id !== row.id && row.category && other.category === row.category)
      const serving = servingKey(row.serving)
      const comparable = serving ? peers.filter(other => servingKey(other.serving) === serving) : []
      for (const other of comparable) {
        const known = nutrients.filter(({ key }) => row.nutrition[key] !== null && other.nutrition[key] !== null)
        if (known.length === nutrients.length && known.every(({ key }) => row.nutrition[key] === other.nutrition[key])) {
          findings.push({ kind: 'same', peerId: other.id, text: `같은 제공량(${row.serving})의 ‘${other.name}’와 단백질·당류·나트륨 수치가 같아요. 이 세 항목 외에 원재료와 가격도 비교해 보세요.` })
          break
        }
        const differences = known.filter(({ key }) => row.nutrition[key] !== other.nutrition[key]).slice(0, 2)
        if (differences.length) {
          const equal = known.filter(({ key }) => row.nutrition[key] === other.nutrition[key])
          const shared = equal.length ? `${equal.map(({ key, label, unit }) => `${label} ${row.nutrition[key]}${unit}`).join('·')}으로 같고, ` : ''
          const description = differences.map(({ key, label, unit }) => `${label}${key === 'sugar' ? '는' : '은'} ${Number(Math.abs(row.nutrition[key] - other.nutrition[key]).toFixed(3))}${unit} ${row.nutrition[key] > other.nutrition[key] ? '높아요' : '낮아요'}`).join(', ')
          findings.push({ kind: 'difference', peerId: other.id, text: `같은 제공량(${row.serving})의 ‘${other.name}’와 비교하면 ${shared}${description}.`, takeaway: `‘${row.name}’는 ‘${other.name}’와 같은 제공량으로 비교했을 때 ${shared}${description}.` })
          break
        }
      }
      if (!findings.some(finding => ['same', 'difference'].includes(finding.kind)) && peers.length && !comparable.length) {
        findings.push({ kind: 'serving', text: '같은 카테고리의 다른 상품과 제공량이 다르거나 확인되지 않아 함량을 직접 비교하지 않았어요. 상품별 제공량부터 확인해 보세요.' })
      }
      if (!findings.length) {
        const known = nutrients.filter(({ key }) => row.nutrition[key] !== null).slice(0, 2)
        if (known.length) findings.push({ kind: 'facts', text: `${serving ? `등록 제공량 ${row.serving} 기준으로` : '등록 영양정보에서'} ${known.map(({ key, label, unit }) => `${label} ${row.nutrition[key]}${unit}`).join(', ')}이에요.${serving ? '' : ' 제공량을 확인한 뒤 다른 상품과 비교해 주세요.'}` })
      }
    }
    return { ...product, shoppingInsights: findings, preview: findings.slice(0, 2).map(finding => finding.text).join(' ') }
  })
}

export function cartShoppingTakeaways(products) {
  const findings = products.flatMap(product => product.shoppingInsights || [])
  const result = []
  if (products.some(product => product.allergyMatches?.length)) result.push('설정한 알레르기 성분과 일치하는 상품이 있으니, 아래 상품별 확인 사항을 먼저 살펴보세요.')
  const difference = findings.find(finding => finding.kind === 'difference')
  if (difference) result.push(difference.takeaway)
  if (findings.some(finding => finding.kind === 'same')) result.push('주요 영양 수치가 같은 상품도 담겨 있어요. 해당 상품은 원재료와 가격을 함께 비교하면 선택에 도움이 돼요.')
  if (findings.some(finding => finding.kind === 'serving')) result.push('같은 종류라도 제공량이 다르면 수치를 바로 비교하기 어려워요. 아래에서 상품별 비교 기준을 확인해 보세요.')
  return result.slice(0, 3)
}
