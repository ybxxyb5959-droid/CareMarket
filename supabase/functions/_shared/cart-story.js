import { analyzeGoalFit } from './cart-goal-fit.js'

// Turn the checklist coverage into a verdict ("목적 대비 부합/미부합") instead of a
// bare nudge to "go look at the numbers yourself". A single food defers to the
// same "판단 근거 부족" nuance used everywhere else — never a single-item 100%.
function goalIntroduction(rows, goal) {
  const fit = analyzeGoalFit(rows, goal)
  if (!fit || !fit.foodCount) return ''
  const checklistText = fit.checklistLabels.join('·')
  // Digit-free by construction: this text is a candidate AI narrative summary,
  // and numeric literals there are never allowed (see validCartSummary). The
  // digit-bearing "🎯 N%" card copy lives only in goalFitHeadline for the UI.
  if (fit.singleProduct) {
    const met = fit.products[0].metrics.filter((m) => m.status === 'met').map((m) => m.criterionLabel)
    return met.length
      ? `담은 식품이 ${met.join('·')} 기준은 충족하지만, 상품 한 종만으로는 전체 식단 균형을 판단하기 어려워요.`
      : `${goal} 목적 기준으로 살펴봤어요. 상품 한 종만으로는 전체 식단 균형을 판단하기 어려워요.`
  }
  if (fit.percent === null) return `${goal} 목적의 ${checklistText} 기준으로 판정할 정보가 아직 없어 상품 표시사항을 확인해 주세요.`
  const covered = fit.metrics.filter((m) => m.met > 0).map((m) => m.criterionLabel)
  const missing = fit.metrics.filter((m) => m.met === 0).map((m) => m.criterionLabel)
  const verdict = covered.length ? `담은 식품 중 ${covered.join('·')} 기준을 충족하는 상품이 있어요.` : '담은 식품이 체크리스트 기준을 아직 충족하지 못했어요.'
  const tail = missing.length ? ` ${missing.join('·')} 기준은 아직 보완이 필요해요.` : ''
  return `${goal} 목적 기준으로 살펴봤어요. ${verdict}${tail}`
}

export function cartStory(rows, goal) {
  const groups = [...new Set(rows.map(row => row.category).filter(Boolean))]
  const foodGroups = [...new Set(rows.filter(row => !row.supplement).map(row => row.category).filter(Boolean))]
  const supplements = rows.filter(row => row.supplement).length
  const proteinCentered = rows.length > 0 && rows.filter(row => !row.supplement && (row.nutrition.protein >= 15 || /닭가슴살|프로틴|단백질/.test(row.name))).length > rows.length / 2
  const headline = !rows.length ? '담긴 상품이 없습니다'
    : rows.length === 1 ? '담은 상품의 영양정보를 살펴보세요'
    : supplements === rows.length ? '주요 성분을 살펴보는 영양제 구성'
      : groups.length >= 3 ? '다양한 상품을 함께 담았어요'
        : proteinCentered ? '단백질을 챙기는 장바구니예요!'
          : foodGroups.length === 1 ? '좋아하는 종류를 모아 담았어요'
            : '다양한 상품을 함께 담았어요'
  return { headline, introduction: goalIntroduction(rows, goal) }
}

export function productStory(row, goal) {
  if (row.supplement) return { title: '등록된 주요 성분을 확인하는 영양제', serving: row.serving, metrics: [], checks: [] }
  const name = `${row.name} ${row.category || ''}`
  const format = /음료|라떼|주스/.test(name) ? '음료' : /프로틴바|단백질바/.test(name) ? '바 형태의 간식' : /도시락|간편식/.test(name) ? '간편식' : /샐러드|채소/.test(name) ? '채소류 상품' : '상품'
  const fields = goal === '체중 관리' ? [['calories', '열량', 'kcal'], ['sugar', '당류', 'g'], ['protein', '단백질', 'g']]
    : goal === '식단 영양 관리' ? [['sodium', '나트륨', 'mg'], ['sugar', '당류', 'g'], ['fiber', '식이섬유', 'g'], ['protein', '단백질', 'g']]
    : goal === '근육량 증가' ? [['protein', '단백질', 'g'], ['fat', '지방', 'g'], ['sugar', '당류', 'g']]
    : [ ['protein', '단백질', 'g'], ['sugar', '당류', 'g'], ['sodium', '나트륨', 'mg'] ]
  const metrics = fields
    .filter(([key]) => key === 'fiber' ? row.nutrition[key] != null : goal === '식단 영양 관리' || row.nutrition[key] != null)
    .map(([key, label, unit]) => ({ key, label, value: row.nutrition[key] ?? null, unit }))
  const title = goal === '체중 관리' ? (row.nutrition.calories !== null ? `등록 제공량당 ${row.nutrition.calories}kcal인 ${format}` : '열량 정보가 없어 제공량과 표시사항 확인이 필요해요')
    : goal === '식단 영양 관리' ? (row.nutrition.sodium != null ? `등록 제공량당 나트륨 ${row.nutrition.sodium}mg인 ${format}` : '나트륨 표시사항을 확인해 주세요')
    : row.nutrition.protein > 0 ? `등록 제공량에 단백질 ${row.nutrition.protein}g을 담은 ${format}`
    : row.nutrition.sugar === 0 ? `등록 당류가 0g인 ${format}` : `${format}의 영양정보를 살펴보세요`
  return { title, serving: row.serving, metrics, checks: row.caffeine ? ['등록 정보에 카페인이 표시되어 있어요.'] : [] }
}
