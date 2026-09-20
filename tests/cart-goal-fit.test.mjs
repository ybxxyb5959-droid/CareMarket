import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeGoalFit, goalFitHeadline, goalFitDetailLines, goalFitComplement, GOAL_CHECKLISTS, GOAL_FIT_METRICS } from '../supabase/functions/_shared/cart-goal-fit.js'
import { analyzeCartNutrition, composeCartInsight, cartAnalysisBasis } from '../supabase/functions/_shared/cart-nutrition-analysis.js'

const food = (id, nutrition, name = `식품${id}`, category = '간식') => ({ id, name, category, supplement: false, nutrition })

test('a single food never inflates to a 100% purpose match', () => {
  const fit = analyzeGoalFit([food(1, { protein: 24, fat: 2 })], '근육량 증가')
  assert.equal(fit.foodCount, 1)
  assert.equal(fit.singleProduct, true)
  assert.equal(fit.percent, null)
  assert.equal(fit.judged, 0)
  assert.match(goalFitHeadline(fit), /식품 1종만 담겨있어요/)
  assert.match(goalFitHeadline(fit), /단백질·저지방 기준은 충족하지만/)
  assert.deepEqual(goalFitDetailLines(fit), [])
})

test('a single food with nothing met still defers instead of claiming 0% or 100%', () => {
  const fit = analyzeGoalFit([food(1, { protein: 3, fat: 20 })], '근육량 증가')
  assert.equal(fit.percent, null)
  assert.match(goalFitHeadline(fit), /상품 1개만으로는 근육량 증가 목적의 전체 식단 균형을 판단하기 어려워요/)
})

test('percent is checklist coverage × basket-size confidence, not a per-product-pair average', () => {
  // protein: both meet it → covered. fat: only product 1 meets it, but coverage is
  // OR across the cart (met > 0), so fat still counts as covered — a metric one
  // product fails does not erase what another product already established.
  const rows = [food(1, { protein: 24, fat: 2 }), food(2, { protein: 20, fat: 10 })]
  const fit = analyzeGoalFit(rows, '근육량 증가')
  assert.deepEqual(GOAL_CHECKLISTS['근육량 증가'], ['protein', 'fat'])
  assert.equal(fit.foodCount, 2)
  assert.deepEqual(fit.coveredMetrics, ['protein', 'fat'])
  assert.deepEqual(fit.missingMetrics, [])
  assert.equal(fit.coverageRatio, 1)               // 2/2 checklist metrics covered
  assert.equal(fit.confidenceRatio, 1)              // 2 foods ≥ 2 checklist metrics → full confidence
  assert.equal(fit.percent, 100)                    // round(1 × 1 × 100)
  assert.match(goalFitHeadline(fit), /근육량 증가 목적 부합도: 100% \(식품 2종 기준 — 단백질·저지방 지표로 계산\)/)
  const lines = goalFitDetailLines(fit)
  // Each ✅ line has its own natural phrasing, not one "{label}은 잘 챙겼어요"
  // template stamped on every metric (그건 "당류은" 같은 조사 오류를 냈다).
  assert.deepEqual(lines, ['✅ 단백질을 잘 챙겼어요', '✅ 저지방으로 잘 챙겼어요'])
})

test('adding a food that fails one metric no longer drags the whole percent down (the diversity paradox fix)', () => {
  // Real catalog values: steak + chicken chip, both fully within the 체중 관리
  // checklist (단백질≥15g, 당류≤5g, 나트륨≤250mg).
  const steak = food(1, { protein: 30, sugar: 0.2, sodium: 195 }, '블랙페퍼 안심 스테이크')
  const chip = food(2, { protein: 24, sugar: 0, sodium: 90 }, '순수 단백 닭가슴살 칩')
  const salad = food(3, { protein: 9, sugar: 3.5, sodium: 140 }, '퀴노아 렌틸콩 샐러드 보울')

  const twoItems = analyzeGoalFit([steak, chip], '체중 관리')
  // Coverage is already 3/3 (both meet every metric), but only 2 foods for a
  // 3-metric checklist under-evidences that coverage → confidence discounts it.
  assert.equal(twoItems.coverageRatio, 1)
  assert.equal(twoItems.confidenceRatio, 2 / 3)
  assert.equal(twoItems.percent, 67)          // round(1 × 0.667 × 100), was 100% under the old formula

  const threeItems = analyzeGoalFit([steak, chip, salad], '체중 관리')
  // The salad misses protein (9g < 15g) but still meets sugar and sodium, so
  // every checklist metric remains covered by at least one product.
  assert.equal(threeItems.coverageRatio, 1)
  assert.equal(threeItems.confidenceRatio, 1) // 3 foods === 3 checklist metrics → full confidence
  assert.equal(threeItems.percent, 100)       // was 89% under the old formula — this is the fix
  assert.ok(threeItems.percent > twoItems.percent, 'adding a varied, mostly-good food must not lower the percent')
})

test('a food that fails every checklist metric cannot ride the confidence earned by a genuinely good food (small skewed carts)', () => {
  // 근육량 증가 체크리스트 = [단백질, 저지방], 딱 2개 지표뿐이라 상품 2개만
  // 담아도 confidence가 쉽게 1이 될 수 있다. 닭가슴살 하나가 두 지표를 혼자
  // 다 채우고, 두 번째 상품이 두 지표 다 미달이어도 예전엔 "상품 수 2 = 지표
  // 수 2"라는 이유만으로 confidence가 그대로 1이라 100%가 나왔다.
  const chicken = food(1, { protein: 26, fat: 1.2 }, '리얼 스팀 수비드 닭가슴살')
  const offTarget = food(2, { protein: 7, fat: 5.5 }, '그린 애플 그래놀라')
  const fit = analyzeGoalFit([chicken, offTarget], '근육량 증가')
  assert.equal(fit.coverageRatio, 1)       // 닭가슴살 혼자 단백질·저지방 둘 다 충족
  assert.equal(fit.confidenceRatio, 0.5)   // 기여 상품 1개 / 지표 2개 — 그래놀라는 아무 지표도 못 채워 분자에서 빠짐
  assert.equal(fit.percent, 50)            // round(1 × 0.5 × 100), 예전 방식이면 100%
  assert.ok(fit.percent < 100, '목적과 무관한 상품을 추가해도 100%가 유지되면 안 된다')

  // 식단 영양 관리(체크리스트 3개)에서도 동일한 스큐 패턴을 확인: 완벽한
  // 상품 하나 + 세 지표 모두 미달인 상품을 추가해도 confidence가 과대평가되지 않는다.
  const clean = food(1, { protein: 26, sugar: 0, sodium: 45 }, '깨끗한 상품')
  const junk = food(2, { protein: 2, sugar: 30, sodium: 400 }, '고당·고나트륨 상품')
  const dietFit = analyzeGoalFit([clean, junk], '식단 영양 관리')
  assert.equal(dietFit.coverageRatio, 1)        // clean 혼자 나트륨·저당·단백질 다 충족
  assert.equal(dietFit.confidenceRatio, 1 / 3)  // 기여 상품 1개 / 지표 3개
  assert.equal(dietFit.percent, 33)
})

test('good-metric detail lines never reuse one generic "{label}은 잘 챙겼어요" template', () => {
  const rows = [food(1, { protein: 20, sugar: 2, sodium: 100 }), food(2, { protein: 20, sugar: 2, sodium: 100 })]
  const fit = analyzeGoalFit(rows, '체중 관리')
  assert.deepEqual(goalFitDetailLines(fit), ['✅ 단백질을 잘 챙겼어요', '✅ 저당으로 잘 챙겼어요', '✅ 나트륨 조절이 좋아요'])
  // The old template produced a real particle error here: 당류 ends in a vowel,
  // so "당류은" is ungrammatical (당류는 would be the mechanical fix, but the
  // reworded copy above reads better than either).
  assert.ok(!goalFitDetailLines(fit).some(line => line.includes('당류은')))
})

test('detail lines distinguish "no data registered" from "registered but below threshold"', () => {
  // 나트륨: every food has a real value that fails the threshold → a genuine shortfall (case B).
  const shortfall = analyzeGoalFit([food(1, { sodium: 300, protein: 20 }), food(2, { sodium: 400, protein: 20 })], '식단 영양 관리')
  const shortfallLine = goalFitDetailLines(shortfall).find(line => line.includes('나트륨'))
  assert.match(shortfallLine, /⚠️ 나트륨 기준이 부족해요 \(기준 250mg 대비 부족\)/)
  assert.doesNotMatch(shortfallLine, /등록되지 않아/)

  // 나트륨: nobody has it registered at all → a data gap, not a nutrition verdict (case A).
  const noData = analyzeGoalFit([food(1, { sodium: null, protein: 20 }), food(2, { sodium: null, protein: 20 })], '식단 영양 관리')
  const noDataLine = goalFitDetailLines(noData).find(line => line.includes('나트륨'))
  assert.match(noDataLine, /⚠️ 나트륨 함량이 등록되지 않아 이 지표는 판정에서 제외했어요/)
  assert.doesNotMatch(noDataLine, /기준이 부족해요/)
})

test('a checklist metric no product covers is reported as missing and maps to a complement category', () => {
  const rows = [food(1, { protein: 24, fat: 10 }), food(2, { protein: 20, fat: 12 })]
  const fit = analyzeGoalFit(rows, '근육량 증가')
  assert.deepEqual(fit.coveredMetrics, ['protein'])
  assert.deepEqual(fit.missingMetrics, ['fat'])
  assert.ok(goalFitDetailLines(fit).some(line => line.includes('⚠️') && line.includes('저지방')))
  const complement = goalFitComplement(fit)
  assert.equal(complement.key, 'fat')
  assert.equal(complement.category, '간편식')
})

test('weight_control and nutrition_management checklists have no fiber metric (products have no fiber column)', () => {
  // fiber is deliberately absent: the products table has no fiber column, so every
  // product's fiber is always null — a "below threshold" verdict could never occur,
  // only an endless "정보 없음". Vegetable-inclusion is instead surfaced separately
  // via cart-composition.js's text/category classification (see vegetableNotice).
  assert.deepEqual(GOAL_CHECKLISTS['체중 관리'], ['protein', 'sugar', 'sodium'])
  assert.deepEqual(GOAL_CHECKLISTS['식단 영양 관리'], ['sodium', 'sugar', 'protein'])
  assert.ok(!Object.keys(GOAL_FIT_METRICS).includes('fiber'))
  const weight = analyzeGoalFit([food(1, { sugar: 2, protein: 20, sodium: 100 }), food(2, { sugar: 9, protein: 2, sodium: 300 })], '체중 관리')
  assert.equal(weight.foodCount, 2)
  assert.ok(weight.percent > 0 && weight.percent < 100)
  assert.equal(analyzeGoalFit([food(1, { protein: 20 })], '영양제 탐색'), null)
  assert.equal(analyzeGoalFit([food(1, { protein: 20 })], null), null)
})

test('supplements are excluded from goal fit scoring entirely', () => {
  const rows = [food(1, { protein: 24, fat: 2 }), { id: 2, name: '영양제', category: '영양제·비타민', supplement: true, nutrition: { protein: null, fat: null } }]
  const fit = analyzeGoalFit(rows, '근육량 증가')
  assert.equal(fit.foodCount, 1)
  assert.equal(fit.products.length, 1)
})

test('current-cart analysis attaches checklist-based goal fit and per-product verdicts', () => {
  const rows = [
    { quantity: 1, product: { id: 1, name: '닭가슴살', category: '육류', nutrition: { protein: 25, fat: 10, sugar: 0, sodium: 80 } } },
    { quantity: 1, product: { id: 2, name: '과자', category: '간식', nutrition: { protein: 4, fat: 12, sugar: 12, sodium: 200 } } },
  ]
  const context = { compositionOnly: true, displayGoal: '근육량 증가' }
  const analysis = analyzeCartNutrition(rows, context)
  // protein is covered (chicken meets it); fat is not (both fail it) → 1/2 metrics
  // covered. Only chicken actually contributes a met metric (snack meets neither),
  // so confidence is 1 contributing food / 2 checklist metrics = 0.5 → 25%.
  assert.equal(analysis.goalFit.coverageRatio, 0.5)
  assert.equal(analysis.goalFit.confidenceRatio, 0.5)
  assert.equal(analysis.goalFit.percent, 25)
  const chicken = analysis.productReasons.find(p => p.id === 1)
  // Meets protein but not the fat metric — a "partial" checklist match, not a full one.
  assert.equal(chicken.goalFit.status, 'partial')
  const snack = analysis.productReasons.find(p => p.id === 2)
  assert.equal(snack.goalFit.status, 'unmet')
  assert.match(snack.goalFit.reason, /단백질 기준 미달|지방 기준 초과/)
  // Goal mismatch is a distinct signal and must not flip the allergy/missing "확인 필요" flag.
  assert.equal(snack.needsAttention, false)
  const insight = composeCartInsight(analysis, cartAnalysisBasis(context))
  assert.match(insight.goalFit.headline, /근육량 증가 목적 부합도: 25%/)
  assert.equal(insight.recommendation.category, '간편식')
  // Fit judgment does not leak forbidden nutrient cross-talk into the muscle summary.
  assert.doesNotMatch(analysis.fallback.summary, /저당|당류|저염|나트륨/)
})

test('a cart with no vegetable-classified food gets a plain category notice, no numbers or thresholds', () => {
  const rows = [
    { quantity: 1, product: { id: 1, name: '닭가슴살', category: '닭가슴살·고단백 식품', nutrition: { protein: 25 } } },
    { quantity: 1, product: { id: 2, name: '프로틴바', category: '프로틴바·건강간식', nutrition: { protein: 20 } } },
  ]
  const analysis = analyzeCartNutrition(rows, { compositionOnly: true, displayGoal: '체중 관리' })
  assert.deepEqual(analysis.vegetableNotice, { message: '채소가 포함된 메뉴가 부족해요.' })
  assert.doesNotMatch(analysis.vegetableNotice.message, /[0-9]|기준/)
  const insight = composeCartInsight(analysis, cartAnalysisBasis({ compositionOnly: true, displayGoal: '체중 관리' }))
  assert.deepEqual(insight.vegetableNotice, analysis.vegetableNotice)
})

test('a cart with a vegetable-classified food has no vegetable notice', () => {
  const rows = [{ quantity: 1, product: { id: 1, name: '퀴노아 렌틸콩 샐러드 보울', category: '기타 건강식품', nutrition: { protein: 5 } } }]
  const analysis = analyzeCartNutrition(rows, { compositionOnly: true, displayGoal: '체중 관리' })
  assert.equal(analysis.vegetableNotice, null)
})

test('supplement-only cart carries a display-only notice, no scoring or recommendation', () => {
  const rows = [{ quantity: 1, product: { id: 1, name: '멀티비타민', category: '영양제·비타민', mainIngredients: ['비타민C 500mg'] } }]
  const analysis = analyzeCartNutrition(rows, { compositionOnly: true, displayGoal: '영양제 탐색' })
  assert.equal(analysis.goalFit, null)
  assert.equal(analysis.supplementNotice.count, 1)
  assert.deepEqual(analysis.supplementNotice.items, [{ id: 1, name: '멀티비타민' }])
  assert.match(analysis.supplementNotice.note, /개인 건강 상태에 따라/)
})
