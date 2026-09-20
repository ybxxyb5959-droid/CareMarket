import test from 'node:test'
import assert from 'node:assert/strict'
import { groundedCartHeadline } from '../supabase/functions/_shared/cart-headline.js'
import { analyzeCartNutrition, cartAnalysisBasis, composeCartInsight, reconcileCartInsight } from '../supabase/functions/_shared/cart-nutrition-analysis.js'
test('generated headline reaches UI envelope and reconciliation; unsupported titles fall back', () => {
  const context = { compositionOnly: true }
  const analysis = analyzeCartNutrition([{ quantity: 1, product: { id: 1, name: '샐러드', category: '채소', nutrition: { protein: 3, sugar: 2, sodium: 100 } } }], context)
  const basis = cartAnalysisBasis(context)
  const local = composeCartInsight(analysis, basis)
  const narrative = { headline: '담은 샐러드의 영양정보를 살펴보세요', summary: analysis.fallback.summary, actions: analysis.fallback.actions }
  const remote = composeCartInsight(analysis, basis, narrative, true)
  assert.equal(remote.headline, narrative.headline)
  assert.equal(reconcileCartInsight(remote, local).headline, narrative.headline)
  for (const headline of ['여러 상품을 골고루 담았어요', '좋아하는 상품을 담았어요', '단백질 중심의 장바구니', '완벽한 건강 식단', '오늘의 별자리 운세']) {
    assert.equal(groundedCartHeadline(headline, analysis.composition, basis), false)
    assert.equal(composeCartInsight(analysis, basis, { ...narrative, headline }, true).headline, local.headline)
  }
})
