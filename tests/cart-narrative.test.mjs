import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeCartNutrition, cartAnalysisBasis, composeCartInsight, reconcileCartInsight } from '../supabase/functions/_shared/cart-nutrition-analysis.js'
test('new prose survives server composition and client reconciliation without changing facts', () => {
  const context = { compositionOnly: true }
  const analysis = analyzeCartNutrition([{ quantity: 1, product: { id: 1, name: '샐러드', category: '채소', nutrition: { sodium: 140, sugar: 3.5, protein: 4 } } }], context)
  const basis = cartAnalysisBasis(context)
  const local = composeCartInsight(analysis, basis)
  const summary = '담은 샐러드의 나트륨과 당류를 살펴봤어요. 서비스의 저염·저당 기준에 해당하며, 실제 드실 양은 등록 제공량과 함께 확인해 보세요.'
  const narrative = { headline: '담은 샐러드의 영양정보를 살펴볼까요?', summary, actions: analysis.fallback.actions }
  const remote = composeCartInsight(analysis, basis, narrative, true)
  assert.equal(remote.summary, summary)
  assert.equal(reconcileCartInsight(remote, local).summary, summary)
  assert.deepEqual(remote.balanceItems, local.balanceItems)
  assert.deepEqual(remote.productReasons, local.productReasons)
  for (const text of ['식이섬유가 풍부한 상품이에요. 매일 먹으면 건강에 좋아요.', '여러 상품을 다양하게 모았어요. 나트륨 정보를 확인해 보세요.', '나트륨이 999mg이에요. 제공량을 확인해 보세요.']) {
    assert.equal(composeCartInsight(analysis, basis, { ...narrative, summary: text }, true).aiExplanationAvailable, false)
  }
})

test('purpose focus rejects unrelated prose for muscle gain and accepts grounded protein prose', () => {
  const context = { compositionOnly: true, displayGoal: '근육량 증가' }
  const analysis = analyzeCartNutrition([{ quantity: 1, product: { id: 1, name: '닭가슴살', category: '육류', nutrition: { protein: 25, sugar: 0, sodium: 80 } } }], context)
  const basis = cartAnalysisBasis(context)
  const local = composeCartInsight(analysis, basis)
  const good = { headline: '단백질 기준을 살펴보는 장바구니', summary: '근육량 증가 목적에 맞춰 단백질 정보를 중심으로 살펴봤어요. 상품별 제공량과 등록 단백질 함량을 함께 확인할 수 있어요.', actions: analysis.fallback.actions }
  assert.equal(composeCartInsight(analysis, basis, good, true).aiExplanationAvailable, true)
  const unrelated = { ...good, summary: '담은 상품은 당류가 낮은 편이라 저당 기준을 충족해요. 나트륨도 낮게 표시되어 있어요.' }
  assert.equal(composeCartInsight(analysis, basis, unrelated, true).aiExplanationAvailable, false)
  assert.equal(composeCartInsight(analysis, basis, unrelated, true).summary, local.summary)
})
