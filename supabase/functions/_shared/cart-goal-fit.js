import { HIGH_PROTEIN_MIN, LOW_SUGAR_MAX, LOW_SODIUM_MAX, LOW_FAT_MAX } from './nutrition-policy.js'

// Metric-level definitions shared by every purchase goal's balance checklist.
// Judged against the same catalog quick-filter thresholds shoppers already see;
// this is a shopping-criteria coverage check, never a medical or intake assessment.
// 식이섬유(fiber)는 여기 없다: products 테이블에 fiber 컬럼 자체가 없어 모든 상품이
// 항상 null이고, "기준 미달" 판정은 데이터 구조상 절대 나올 수 없이 "정보 없음"만
// 반복되는 무의미한 지표였다. 채소 포함 여부는 대신 cart-composition.js의
// 텍스트/카테고리 기반 vegetable 판정으로 별도 안내한다 (수치·기준 언급 없음).
// `goodText` is written out per metric rather than templated from `label`: a
// single "{label}은 잘 챙겼어요" template reads wrong for several of these —
// "당류은" is an outright particle error (당류 ends in a vowel, needs 는), and
// "나트륨은 잘 챙겼어요" is grammatical but an odd way to praise a LOW nutrient.
export const GOAL_FIT_METRICS = Object.freeze({
  protein: { key: 'protein', label: '단백질', unit: 'g', threshold: HIGH_PROTEIN_MIN, direction: 'min', criterionLabel: '단백질', goodText: '단백질을 잘 챙겼어요' },
  sugar: { key: 'sugar', label: '당류', unit: 'g', threshold: LOW_SUGAR_MAX, direction: 'max', criterionLabel: '저당', goodText: '저당으로 잘 챙겼어요' },
  sodium: { key: 'sodium', label: '나트륨', unit: 'mg', threshold: LOW_SODIUM_MAX, direction: 'max', criterionLabel: '나트륨', goodText: '나트륨 조절이 좋아요' },
  fat: { key: 'fat', label: '지방', unit: 'g', threshold: LOW_FAT_MAX, direction: 'max', criterionLabel: '저지방', goodText: '저지방으로 잘 챙겼어요' },
})

// Each food-purchase goal's "균형 체크리스트": every metric a shopper should cover,
// never a single emphasis metric standing in for the whole purpose. 영양제 탐색에는
// 체크리스트가 없다 — 영양제는 별도 로직(product-type.js)으로 표기만 하며 이 식품
// 영양 균형 판정 대상에 절대 포함하지 않는다.
export const GOAL_CHECKLISTS = Object.freeze({
  '근육량 증가': ['protein', 'fat'],
  '체중 관리': ['protein', 'sugar', 'sodium'],
  '식단 영양 관리': ['sodium', 'sugar', 'protein'],
})

// Where a shopper can go to cover a checklist metric no cart item satisfies yet.
// `noticeLabel` names the metric for the "⚠️ {noticeLabel} 메뉴가 부족해요" inline
// card section; `filterLabel`/`category`+`sub` are also reused to filter/route
// the catalog for that same metric (see CartAiInsight.jsx's complement cards).
export const METRIC_COMPLEMENT = Object.freeze({
  protein: { filterLabel: '고단백', label: '고단백 상품 더 보기', noticeLabel: '고단백' },
  sugar: { filterLabel: '저당', label: '저당 상품 더 보기', noticeLabel: '저당' },
  sodium: { filterLabel: '저염', label: '저염 상품 더 보기', noticeLabel: '저염' },
  fat: { category: '간편식', sub: '닭가슴살·육류', label: '저지방·고단백 식품 살펴보기', noticeLabel: '저지방' },
})

// Exported so the UI can filter the full catalog by the exact same threshold
// rule used to judge cart items — never a separately invented criterion.
export const meetsCriteria = (metric, value) => (metric.direction === 'min' ? value >= metric.threshold : value <= metric.threshold)
// Round a registered value to at most one decimal so gap text stays readable.
const trim = (value) => Number(Number(value).toFixed(1))

// Per-metric judgment for one product: 기준 대비 충족/미충족 + 짧은 근거.
export function metricFitReason(metric, status, value) {
  if (status === 'unknown') return `${metric.label} 정보가 없어 ${metric.criterionLabel} 기준 판정을 보류했어요.`
  if (status === 'met') return `${metric.label} ${metric.threshold}${metric.unit} 기준을 ${trim(value)}${metric.unit}으로 충족했어요.`
  const gap = trim(Math.abs(value - metric.threshold))
  return metric.direction === 'min'
    ? `${metric.label} 기준 미달이에요. ${metric.threshold}${metric.unit} 기준에 ${trim(value)}${metric.unit}으로 ${gap}${metric.unit} 부족해요.`
    : `${metric.label} 기준 초과예요. ${metric.threshold}${metric.unit} 기준보다 ${trim(value)}${metric.unit}으로 ${gap}${metric.unit} 높아요.`
}

function judgeProductMetric(row, metric) {
  const raw = row.nutrition?.[metric.key]
  const known = raw !== null && raw !== undefined && Number.isFinite(Number(raw))
  const value = known ? Number(raw) : null
  const status = !known ? 'unknown' : meetsCriteria(metric, value) ? 'met' : 'unmet'
  return { key: metric.key, label: metric.label, unit: metric.unit, threshold: metric.threshold,
    criterionLabel: metric.criterionLabel, value, status, reason: metricFitReason(metric, status, value) }
}

// "목적 부합도" = 체크리스트 커버리지 × 장바구니 신뢰도, 두 값 모두 등록된
// 단백질/당류/나트륨/지방 수치와 상품 개수에서만 나온다(식이섬유 등 없는 데이터
// 없음). 예전 방식은 (상품 × 지표) 판정 쌍 전체를 평균 내서, 이미 충족된
// 상품 구성에 지표 하나가 살짝 부족한 상품을 추가하면 전체 %가 깎이는
// 역설이 있었다(스테이크+칩 100% → 샐러드 추가 시 89%로 하락). "장바구니에
// 다양한 상품을 담을수록 목적에 더 잘 맞아 보여야 한다"는 요구를 반영해
// 두 단계로 나눠 계산한다:
//   1) 커버리지(coverageRatio) = 체크리스트 지표 중 "장바구니 안의 상품이 하나라도
//      충족한" 지표의 비율. 상품을 더 담아 새 지표를 채우면 늘어나고, 이미 충족된
//      지표는 다른 상품이 그 지표를 못 채워도 사라지지 않는다(단조 비감소).
//   2) 신뢰도(confidenceRatio) = min(1, 기여 상품 수 / 체크리스트 지표 수).
//      "기여 상품" = 체크리스트 지표를 하나 이상 충족한 상품만 센다. 상품 1개는
//      이론상 최대 1개 지표만 보증할 수 있으므로, 기여 상품 수가 지표 수에
//      못 미치면 "커버리지가 우연일 수 있다"고 보고 비례해서 점수를 낮춘다.
//      전체 상품 수가 아니라 "기여 상품 수"를 쓰는 이유: 이미 모든 지표를
//      충족한 상품이 있는 채로 아무 지표도 못 채우는 상품을 추가로 담아도
//      전체 상품 수만 세면 신뢰도가 그대로 유지돼 100%가 유지되는 허점이
//      있었다(예: 완벽한 고단백·저지방 닭가슴살 + 단백질·지방 둘 다 기준
//      미달인 그래놀라 → 여전히 100%). 기여하지 못한 상품은 신뢰도 분자에서
//      제외해 이런 "무관한 상품 추가"가 점수를 그대로 두지 못하게 한다.
// percent = round(coverageRatio × confidenceRatio × 100). 두 값을 곱해 하나의
// %로만 노출하며, 지표 점수와 다양성 보너스를 UI에 따로 쪼개 보여주지 않는다.
export function analyzeGoalFit(rows, goal) {
  const checklist = GOAL_CHECKLISTS[goal]
  if (!checklist) return null
  const metricDefs = checklist.map((key) => GOAL_FIT_METRICS[key])
  const foods = (Array.isArray(rows) ? rows : []).filter((row) => !row.supplement)

  const products = foods.map((row) => {
    const results = metricDefs.map((metric) => judgeProductMetric(row, metric))
    const judged = results.filter((r) => r.status !== 'unknown')
    const met = judged.filter((r) => r.status === 'met')
    return {
      id: row.id, name: row.name, metrics: results,
      metCount: met.length, judgedCount: judged.length,
      status: !judged.length ? 'unknown' : met.length === judged.length ? 'met' : met.length > 0 ? 'partial' : 'unmet',
      reason: (judged.length ? judged : results.slice(0, 1)).map((r) => r.reason).join(' '),
    }
  })

  const metrics = metricDefs.map((metric) => {
    const perProduct = products.map((p) => p.metrics.find((m) => m.key === metric.key))
    const met = perProduct.filter((m) => m.status === 'met').length
    const unmet = perProduct.filter((m) => m.status === 'unmet').length
    const unknown = perProduct.filter((m) => m.status === 'unknown').length
    return { key: metric.key, label: metric.label, criterionLabel: metric.criterionLabel, unit: metric.unit, threshold: metric.threshold, goodText: metric.goodText,
      met, unmet, unknown, status: met > 0 && unmet === 0 ? 'good' : met > 0 ? 'mixed' : unmet > 0 ? 'lacking' : 'unknown' }
  })

  // A single product cannot establish a cart-wide balance percent — that was the
  // old "1개 담아도 100% 부합" illusion. Only two or more foods produce a percent.
  const multiProduct = foods.length > 1
  const judgedPairs = multiProduct ? products.reduce((sum, p) => sum + p.judgedCount, 0) : 0
  // "판정할 정보가 아직 없어요" stays reserved for when NOT ONE product has a
  // registered value for ANY checklist metric — a real 0%(모두 미달) is a
  // different, valid answer from "아직 아무것도 모른다".
  const anyJudged = judgedPairs > 0
  const coverageRatio = anyJudged ? metrics.filter((m) => m.met > 0).length / metrics.length : null
  const contributingFoods = products.filter((p) => p.metCount > 0).length
  const confidenceRatio = Math.min(1, contributingFoods / metrics.length)
  const percent = multiProduct && coverageRatio !== null ? Math.round(coverageRatio * confidenceRatio * 100) : null

  return {
    goal, metrics, checklistLabels: metricDefs.map((m) => m.criterionLabel),
    products, foodCount: foods.length, singleProduct: foods.length === 1,
    judged: judgedPairs, coverageRatio, confidenceRatio, percent,
    coveredMetrics: metrics.filter((m) => m.met > 0).map((m) => m.key),
    missingMetrics: metrics.filter((m) => m.met === 0).map((m) => m.key),
  }
}

// One-line "목적 부합도" headline. A single food gets a "판단 근거 부족" nuance
// instead of a percent; two or more get the coverage percent and its basis.
export function goalFitHeadline(fit) {
  if (!fit || !fit.foodCount) return null
  const checklistText = fit.checklistLabels.join('·')
  if (fit.singleProduct) {
    const met = fit.products[0].metrics.filter((m) => m.status === 'met').map((m) => m.criterionLabel)
    return met.length
      ? `아직 식품 1종만 담겨있어요. 이 상품은 ${met.join('·')} 기준은 충족하지만, 상품 1개만으로는 전체 식단 균형을 판단하기 어려워요.`
      : `아직 식품 1종만 담겨있어요. 상품 1개만으로는 ${fit.goal} 목적의 전체 식단 균형을 판단하기 어려워요.`
  }
  if (fit.percent === null) return `${fit.goal} 목적의 ${checklistText} 기준으로 판정할 영양정보가 아직 없어요.`
  return `🎯 ${fit.goal} 목적 부합도: ${fit.percent}% (식품 ${fit.foodCount}종 기준 — ${checklistText} 지표로 계산)`
}

// Per-metric "✅ 충족했어요 / ⚠️ 부족해요" lines shown under the headline, only
// once there are enough foods to actually judge coverage. Two distinct ⚠️ cases
// must read differently: no product has this nutrient registered at all (data
// gap, excluded from judgment) vs. every registered value actually misses the
// threshold (a real shortfall). Collapsing them into one "정보가 부족해요" wording
// let a data gap read as a nutrition shortfall, so they get separate copy here.
export function goalFitDetailLines(fit) {
  if (!fit || fit.singleProduct || fit.percent === null) return []
  return fit.metrics.map((metric) => (
    metric.met > 0 ? `✅ ${metric.goodText}`
      : metric.unmet > 0 ? `⚠️ ${metric.criterionLabel} 기준이 부족해요 (기준 ${metric.threshold}${metric.unit} 대비 부족)`
        : `⚠️ ${metric.label} 함량이 등록되지 않아 이 지표는 판정에서 제외했어요`
  ))
}

// The first missing checklist metric maps to a complement category for
// "다른 상품 유형 살펴보기". Returns null when nothing is missing or the goal
// has no checklist (예: 영양제 탐색에는 보완 추천을 만들지 않는다).
export function goalFitComplement(fit) {
  if (!fit) return null
  for (const key of fit.missingMetrics) {
    const complement = METRIC_COMPLEMENT[key]
    if (complement) return { key, ...complement }
  }
  return null
}
