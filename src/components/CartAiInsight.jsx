import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from './Icon'
import { getCachedCartSummary, requestCartSummary, setCachedCartSummary } from '../lib/ai-insights'
import {
  analyzeCartNutrition,
  cartAnalysisBasis,
  composeCartInsight,
} from '../../supabase/functions/_shared/cart-nutrition-analysis.js'
import { useStore } from '../store'

const INITIAL_ANALYSIS = { status: 'idle', signature: '', insight: null }

function BalanceItems({ items, compact = false }) {
  if (!items?.length) return null
  return (
    <div className={`cart-ai-balance-items${compact ? ' compact' : ''}`} aria-label="영양 구성">
      {items.map((item) => (
        <div key={item.key} className={`cart-ai-balance-item is-${item.status}`} title={item.reason}>
          <Icon name={item.status === 'good' ? 'check' : 'alert-circle'} size={compact ? 13 : 15} />
          <span>{item.key === 'diversity' ? '구성 다양성' : !compact && item.status === 'good' && ['sodium', 'sugar', 'protein'].includes(item.key) ? { sodium: '저염 기준 상품', sugar: '저당 기준 상품', protein: '고단백 기준 상품' }[item.key] : item.label}</span>
          <b>{item.key === 'diversity' && item.status === 'balance' ? '보완' : !compact && item.status === 'good' && ['sodium', 'sugar', 'protein'].includes(item.key) ? '비중 높음' : item.text}</b>
        </div>
      ))}
    </div>
  )
}

function InsightList({ title, items, ordered = false }) {
  if (!items?.length) return null
  const List = ordered ? 'ol' : 'ul'
  return (
    <section className="cart-ai-section">
      <h4>{title}</h4>
      <List>{items.map((item) => <li key={item}>{item}</li>)}</List>
    </section>
  )
}

export default function CartAiInsight({ compact = false, cartOverride = null }) {
  const {
    cart, cartLoading, cartPending, cartError,
    goal, subFilters, allergies, settingsLoading,
    navigate, navigateToCatalog, setSubFilters, setDrawerOpen, authUserId,
  } = useStore()
  const analysisCart = cartOverride || cart
  const requestIdRef = useRef(0)
  const loadingRef = useRef(false)
  const signatureRef = useRef('')
  const cartSignature = useMemo(() => analysisCart
    .map(({ product, quantity }) => `${product.id}:${quantity}`)
    .sort()
    .join('|'), [analysisCart])
  const criteriaSignature = [
    goal || '',
    [...subFilters].sort().join(','),
    [...allergies].sort().join(','),
  ].join('|')
  const analysisKey = `${authUserId || 'anonymous'}|${criteriaSignature}|${cartSignature}`
  const localFallback = useMemo(() => {
    const context = { primaryGoal: goal, selectedConditions: subFilters, excludedAllergens: allergies }
    const deterministic = analyzeCartNutrition(analysisCart, context)
    return composeCartInsight(deterministic, cartAnalysisBasis(context))
  }, [analysisCart, goal, subFilters, allergies])
  const [analysis, setAnalysis] = useState(() => {
    const cached = getCachedCartSummary(analysisKey)
    return cached
      ? { status: 'success', signature: analysisKey, insight: cached }
      : INITIAL_ANALYSIS
  })
  const unavailable = cartLoading || cartPending > 0 || Boolean(cartError) || !cartSignature

  useEffect(() => {
    signatureRef.current = analysisKey
    requestIdRef.current += 1
    loadingRef.current = false
  }, [analysisKey])

  const cachedForCurrentKey = getCachedCartSummary(analysisKey)
  const renderedAnalysis = analysis.signature !== analysisKey && cachedForCurrentKey
    ? { status: 'success', signature: analysisKey, insight: cachedForCurrentKey }
    : analysis
  const cartChanged = Boolean(renderedAnalysis.signature && renderedAnalysis.signature !== analysisKey)
  const visibleStatus = cartChanged
    ? (renderedAnalysis.status === 'success' || renderedAnalysis.status === 'loading' ? 'stale' : 'idle')
    : renderedAnalysis.status

  const analyze = async () => {
    if (loadingRef.current || unavailable) return
    loadingRef.current = true
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    const requestedSignature = analysisKey
    setAnalysis({ status: 'loading', signature: requestedSignature, insight: null })

    try {
      const insight = await requestCartSummary(requestedSignature)
      if (requestIdRef.current === requestId && signatureRef.current === requestedSignature) {
        setAnalysis({ status: 'success', signature: requestedSignature, insight })
      }
    } catch {
      if (requestIdRef.current === requestId && signatureRef.current === requestedSignature) {
        setCachedCartSummary(requestedSignature, localFallback)
        setAnalysis({ status: 'success', signature: requestedSignature, insight: localFallback })
      }
    } finally {
      if (requestIdRef.current === requestId) loadingRef.current = false
    }
  }

  const openSettings = () => {
    if (compact) setDrawerOpen(false)
    navigate('goalSetup')
  }

  const openDetailedAnalysis = () => {
    setDrawerOpen(false)
    navigate('cart')
  }

  const openComplementProducts = () => {
    const filterLabel = renderedAnalysis.insight?.recommendation?.filterLabel
    if (!filterLabel) return
    setDrawerOpen(false)
    navigateToCatalog('전체상품', '전체')
    setSubFilters([filterLabel])
  }

  const localCriteriaSet = Boolean(goal || subFilters.length || allergies.length)
  const insight = renderedAnalysis.insight
  // Present the existing diversity finding in a conversational tone; keep the response unchanged.
  const headline = insight?.balanceItems?.some((item) => item.key === 'diversity' && item.status === 'balance')
    ? '한 종류의 단백질 식품에 구성이 집중되어 있어요.'
    : insight?.headline
  const basis = insight?.basis
  const basisTags = basis ? [
    ...(!cartOverride || basis.primary_goal !== goal ? [basis.primary_goal] : []),
    ...(basis.selected_conditions || []),
    ...(basis.excluded_allergens || []).map((item) => `${item} 제외`),
  ].filter(Boolean) : []
  // Display existing findings once: causes here, action wording only in the next section.
  const hasDiversityFinding = insight?.balanceItems?.some((item) => item.key === 'diversity')
  const reasons = [...new Set((insight?.currentFeatures || [])
    .filter((text) => !text.includes('식이섬유를 보완')
      && !(hasDiversityFinding && text === '등록 정보 기준으로 고단백 기준에 해당하는 상품이에요.'))
    .map((text) => text === '비슷한 특성의 상품이 반복되어 있어 상품 다양성이 낮은 구성이에요.'
      ? '동일한 단백질 중심 상품이 여러 개 담겨 있어요.' : text))]
  const rawActions = insight?.actions || []
  const concreteFiberAction = rawActions.find((action) => ['채소', '통곡물', '견과류'].every((word) => action.includes(word)))
  const actions = [...new Set(rawActions
    .filter((action) => !concreteFiberAction || action === concreteFiberAction || !action.includes('식이섬유'))
    .map((action) => hasDiversityFinding && action === concreteFiberAction
      ? '식이섬유를 보완할 수 있는 채소·통곡물·견과류 계열 상품을 함께 살펴보세요.' : action))]
  const hasComplementFilter = ['저염', '저당', '고단백', '카페인 제외'].includes(insight?.recommendation?.filterLabel)

  return (
    <div className={`cart-ai-insight${compact ? ' compact' : ''}`}>
      <div className="cart-ai-intro">
        <span><Icon name="sparkles" size={15} /> {compact ? 'AI 영양 밸런스' : '영양 밸런스 분석'}</span>
        {visibleStatus !== 'success' && <p>담은 상품의 영양 구성을 내 목표와 비교해드려요.</p>}
      </div>

      {visibleStatus === 'idle' && (
        <>
          <button type="button" className="cart-ai-trigger" onClick={analyze} disabled={unavailable}>
            {compact ? 'AI 분석하기' : '장바구니 영양 분석하기'}
          </button>
          {!settingsLoading && !localCriteriaSet && (
            <p className="cart-ai-personalization-note">
              맞춤 기준이 없어 일반적인 영양 구성만 분석해요.
              <button type="button" onClick={openSettings}>추천 조건 설정</button>
            </p>
          )}
        </>
      )}

      {visibleStatus === 'loading' && (
        <button type="button" className="cart-ai-trigger is-loading" disabled aria-live="polite">
          <Icon name="sparkles" size={14} /> 장바구니를 분석하고 있어요…
        </button>
      )}

      {visibleStatus === 'stale' && (
        <div className="ai-insight-stale" role="status">
          <p>장바구니가 변경됐어요. 다시 분석해주세요.</p>
          <button type="button" className="btn btn-soft btn-sm" onClick={analyze} disabled={unavailable}>다시 분석</button>
        </div>
      )}

      {visibleStatus === 'success' && insight && (
        compact ? (
          <div className="cart-ai-result cart-ai-result-compact">
            <strong>{headline}</strong>
            <BalanceItems items={insight.balanceItems} compact />
            <p>{insight.summary}</p>
            {insight.actions?.map((action) => <p key={action}>{action}</p>)}
            {insight.explanationNotice && <small className="cart-ai-fallback-note">{insight.explanationNotice}</small>}
            <div className="cart-ai-compact-actions">
              <button type="button" onClick={openDetailedAnalysis}>분석 결과 자세히 보기</button>
              <button type="button" onClick={analyze} disabled={unavailable}>다시 분석</button>
            </div>
          </div>
        ) : (
          <div className="cart-ai-result cart-ai-result-detail">
            <section className="cart-ai-overall">
              <h3>{headline}</h3>
            </section>

            {insight.balanceItems?.length > 0 && (
              <section className="cart-ai-section cart-ai-nutrition-status">
                <h4>영양 구성</h4>
                <BalanceItems items={insight.balanceItems} />
              </section>
            )}
            <InsightList title="왜 이렇게 분석했나요?" items={reasons.filter((text) => !actions.includes(text) && text !== headline)} />
            <InsightList title="이렇게 보완해보세요" items={actions} />

            {hasComplementFilter && (
              <button type="button" className="cart-ai-products-link" onClick={openComplementProducts}>
                보완 상품 살펴보기 <Icon name="chevron-right" size={14} />
              </button>
            )}

            {basis?.personalized ? (
              basisTags.length > 0 && <p className="cart-ai-basis-inline">분석 기준 · {basisTags.join(' · ')}</p>
            ) : (
              <div className="cart-ai-generic">
                <p>현재 설정된 맞춤 기준이 없어 일반적인 영양 구성만 분석했어요.</p>
                <button type="button" onClick={openSettings}>추천 조건 설정</button>
              </div>
            )}
            {insight.explanationNotice && <p className="cart-ai-fallback-note" role="status">{insight.explanationNotice}</p>}
            <small className="cart-ai-disclaimer">등록된 상품 정보와 수량을 바탕으로 현재 장바구니 구성만 살펴본 참고 분석입니다.</small>
            <button type="button" className="cart-ai-reanalyze" onClick={analyze} disabled={unavailable}>다시 분석</button>
          </div>
        )
      )}
    </div>
  )
}
