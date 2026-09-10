import { isSupplement, ingredientDescription } from '../../supabase/functions/_shared/product-type.js'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import Icon from './Icon'
import ProductImage from './ProductImage'
import { AllergenBadges } from './GoalBadge'
import { matchingAllergens } from '../lib/catalog'
import { getCachedCartSummary, requestCartSummary, setCachedCartSummary } from '../lib/ai-insights'
import {
  analyzeCartNutrition,
  CART_ANALYSIS_VERSION,
  cartAnalysisBasis,
  composeCartInsight,
} from '../../supabase/functions/_shared/cart-nutrition-analysis.js'
import { useStore } from '../store'
import { cartQuickSummary } from '../lib/cart-quick-summary'

const INITIAL_ANALYSIS = { status: 'idle', signature: '', insight: null }
let focusDetailedAnalysis = false

function BalanceItems({ items, compact = false }) {
  if (!items?.length) return null
  return (
    <div className={`cart-ai-balance-items${compact ? ' compact' : ''}`} aria-label="영양 구성">
      {items.map((item) => (
        <div key={item.key} className={`cart-ai-balance-item is-${item.status}`} title={item.reason}>
          <Icon name={item.status === 'good' ? 'check' : 'alert-circle'} size={compact ? 13 : 15} />
          <span>{item.label}</span>
          <b>{item.text}</b>
        </div>
      ))}
    </div>
  )
}

// Presentation only: shorten existing findings without changing classifications.
const shortCopy = (text = '', sentences = 2) => {
  const copy = text.split(/(?<=[.!?])\s+/).slice(0, sentences).join(' ')
  return copy.length > 180 ? copy.slice(0, 177).trimEnd() + '…' : copy
}
const briefReason = (text = '') => text
  .replace('등록 제공량 기준 열량이 현재 장바구니 상품 종류별 평균보다 높습니다.', '다른 상품보다 열량이 높은 편이에요.')
  .replace(/설정하신 알레르기 성분\([^)]+\)이 포함되어 있습니다. 원재료 정보를 확인해주세요./, '설정하신 알레르기 성분이 포함되어 있어 원재료 확인이 필요합니다.')
  .replace('비교 정보가 충분하지 않아 판정을 보류했습니다.', '비교 정보를 확인해주세요.')
  .replace(/(단백질|당류|나트륨) [\d.]+(?:mg|g)으로 기존 (.+?) 탐색 기준 밖입니다./, '$2 기준 밖으로 표시 정보를 확인해주세요.')

const METRIC_HINTS = { sugar: '당류 기준 충족', protein: '단백질 기준 충족', sodium: '나트륨 기준 충족', calories: '현재 장바구니 내 비교', attention: '추가 확인 권장', protein_complement: '단백질 기준 확인', supplement: '등록된 상품 유형', caffeine: '등록 성분 기준' }

function FindingCard({ title, items, attention = false }) {
  return <section className={`cart-ai-finding${attention ? ' is-attention' : ''}`}>
    <h4><Icon name={attention ? 'alert-circle' : 'check-circle'} size={17} />{title}</h4>
    <ul>{items.slice(0, 3).map((item, index) => <li key={index}>
      <span aria-hidden="true">{attention ? '!' : '✓'}</span><p>{item}</p>
    </li>)}</ul>
    {items.length > 3 && <details><summary><span>나머지 {items.length - 3}개 확인</span><Icon name="chevron-down" size={15} /></summary>
      <ul>{items.slice(3).map((item, index) => <li key={index}><p>{item}</p></li>)}</ul>
    </details>}
  </section>
}

export default function CartAiInsight({ compact = false, cartOverride = null }) {
  const {
    cart, cartLoading, cartPending, cartError,
    allergies, settingsLoading,
    navigate, navigateToCatalog, setSubFilters, setDrawerOpen, authUserId,
  } = useStore()
  const inputCart = cartOverride || cart
  const analysisCart = useMemo(() => inputCart.map(item => ({ ...item, product: {
    ...item.product,
    nutrition: { ...item.product.nutrition, ...Object.fromEntries(
      Object.entries(item.product.nutritionAvailability || {}).filter(([, available]) => !available).map(([key]) => [key, null]),
    ) },
  } })), [inputCart])
  const [guideExpanded, setGuideOpen] = useState(null)
  const [expandedProductsKey, setExpandedProductsKey] = useState(null)
  const quantityCount = analysisCart.reduce((sum, item) => sum + item.quantity, 0)
  const requestIdRef = useRef(0)
  const loadingRef = useRef(false)
  const signatureRef = useRef('')
  const cartSignature = useMemo(() => analysisCart
    .map(({ product, quantity }) => JSON.stringify([product.id, product.name, quantity, product.nutrition, product.allergens, product.category, product.caffeine, product.mainIngredients, product.nutrition?.servingSize]))
    .sort()
    .join('|'), [analysisCart])
  const criteriaSignature = [
    [...allergies].sort().join(','),
  ].join('|')
  const analysisKey = `${CART_ANALYSIS_VERSION}|cart-only1|${authUserId || 'anonymous'}|${criteriaSignature}|${cartSignature}`
  const localFallback = useMemo(() => {
    const context = { compositionOnly: true, excludedAllergens: allergies }
    const deterministic = analyzeCartNutrition(analysisCart, context)
    return composeCartInsight(deterministic, cartAnalysisBasis(context))
  }, [analysisCart, allergies])
  const [analysis, setAnalysis] = useState(() => {
    const cached = getCachedCartSummary(analysisKey)
    return cached
      ? { status: 'success', signature: analysisKey, insight: cached }
      : INITIAL_ANALYSIS
  })
  const unavailable = settingsLoading || cartLoading || cartPending > 0 || Boolean(cartError) || !cartSignature

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
  const visibleStatus = compact && unavailable && renderedAnalysis.status === 'success' ? 'stale' : cartChanged
    ? (renderedAnalysis.status === 'success' || renderedAnalysis.status === 'loading' ? 'stale' : 'idle')
    : renderedAnalysis.status
  const guideOpen = guideExpanded ?? visibleStatus === 'success'

  useEffect(() => {
    if (compact || !guideOpen || !focusDetailedAnalysis) return
    const frame = requestAnimationFrame(() => {
      const heading = document.getElementById('cart-wellness-title')
      heading?.scrollIntoView({ block: 'start' })
      heading?.focus({ preventScroll: true })
      focusDetailedAnalysis = false
    })
    return () => cancelAnimationFrame(frame)
  }, [compact, guideOpen, analysis])

  useEffect(() => {
    if (compact) return
    const showDetails = () => {
      const cached = getCachedCartSummary(analysisKey)
      if (cached) setAnalysis({ status: 'success', signature: analysisKey, insight: cached })
      setGuideOpen(true)
    }
    window.addEventListener('cart-ai:show-details', showDetails)
    return () => window.removeEventListener('cart-ai:show-details', showDetails)
  }, [analysisKey, compact])

  const analyze = async () => {
    if (loadingRef.current || unavailable) return
    loadingRef.current = true
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    const requestedSignature = analysisKey
    setAnalysis({ status: 'loading', signature: requestedSignature, insight: null })

    try {
      const response = analysisCart.some(item => isSupplement(item.product)) ? localFallback : await requestCartSummary(requestedSignature, localFallback)
      const basisKey = basis => JSON.stringify([
        basis?.primary_goal || null,
        [...(basis?.selected_conditions || [])].sort(),
        [...(basis?.excluded_allergens || [])].sort(),
      ])
      // Catalog quick filters can differ from persisted profile preferences.
      // Never label a saved-profile narrative as an analysis of different local criteria.
      const insight = basisKey(response.basis) === basisKey(localFallback.basis) ? response : localFallback
      if (requestIdRef.current === requestId && signatureRef.current === requestedSignature) {
        setCachedCartSummary(requestedSignature, insight)
        setAnalysis({ status: 'success', signature: requestedSignature, insight })
      }
    } catch (error) {
      if (requestIdRef.current === requestId && signatureRef.current === requestedSignature) {
        // The current cart can still be analyzed with the same deterministic rules
        // used by detail view when the API is unavailable or returns an older contract.
        const fallback = { ...localFallback, explanationNotice: 'AI 연결 대신 등록된 상품 정보로 분석했어요.' }
        setCachedCartSummary(requestedSignature, fallback)
        setAnalysis({ status: 'success', signature: requestedSignature, insight: fallback, error: error.message })
      }
    } finally {
      if (requestIdRef.current === requestId) loadingRef.current = false
    }
  }

  const openSettings = () => {
    if (compact) setDrawerOpen(false)
    navigate('mypage')
  }

  const openDetailedAnalysis = () => {
    focusDetailedAnalysis = true
    setDrawerOpen(false)
    navigate('cart')
    // Also open an existing cart view when the drawer overlays that page.
    // A newly mounted cart view opens its cached result by default.
    window.dispatchEvent(new Event('cart-ai:show-details'))
  }

  const openComplementProducts = () => {
    const filterLabel = insight?.recommendation?.filterLabel
    setDrawerOpen(false)
    navigateToCatalog('전체상품', '전체')
    setSubFilters(filterLabel ? [filterLabel] : [])
  }

  const localCriteriaSet = Boolean(allergies.length)
  const insight = visibleStatus === 'success' ? renderedAnalysis.insight : localFallback
  const basis = insight?.basis
  const actions = insight?.actions || []
  const hasComplementFilter = Boolean(insight?.recommendation)
  const productReasons = insight?.productReasons || []
  const productsExpanded = expandedProductsKey === analysisKey
  const visibleProductReasons = productsExpanded || analysisCart.some(item => isSupplement(item.product)) ? productReasons : productReasons.slice(0, 3)
  const metrics = insight?.balanceItems || []
  const attentionMetric = metrics.find(item => item.key === 'attention')
  const mainMetrics = [...metrics.filter(item => item.key !== 'attention').slice(0, 3), ...(attentionMetric ? [attentionMetric] : [])]
  const extraMetrics = metrics.filter(item => !mainMetrics.includes(item))
  const summary = insight?.summary || ''
  const quick = cartQuickSummary(insight)
  const insufficientInfo = analysisCart.length > 0 && analysisCart.every(({ product }) =>
    !isSupplement(product) && ['protein', 'sugar', 'sodium', 'calories'].every(key => {
      const value = product.nutrition?.[key]
      return value === null || value === undefined || value === '' || !Number.isFinite(Number(value))
    }))

  return (
    <div className={`cart-ai-insight${compact ? ' compact' : ' cart-ai-canvas'}`}>
      {compact ? <div className="cart-ai-intro">
        <span><Icon name="sparkles" size={15} /> AI 장바구니 분석</span>
        {visibleStatus === 'success' ? <p>{quick.basis} 기준 · {quick.itemCount}종 분석</p>
          : visibleStatus === 'idle' && <p>현재 담긴 상품의 구성과 등록 영양정보를 확인해보세요.</p>}
      </div> : <header className="cart-ai-dashboard-head">
        <div className="cart-ai-guide-intro"><Icon name="sparkles" size={22} /><div>
          <h2 id="cart-wellness-title" tabIndex={-1}>장바구니 영양 가이드</h2>
          <p>담은 상품 {analysisCart.length}종 · 구매 수량 {quantityCount}개</p>
          <small>상품구성 상세내용을 확인해보세요.</small>
        </div></div>
        <button type="button" className="btn btn-soft btn-sm" aria-expanded={guideOpen} aria-controls="cart-ai-guide" disabled={!guideOpen && unavailable && visibleStatus !== 'success'} onClick={() => {
          setGuideOpen(!guideOpen)
          if (!guideOpen && visibleStatus !== 'success' && visibleStatus !== 'loading') analyze()
        }}>
          {guideOpen ? '영양 가이드 접기' : '장바구니 분석 확인하기'}<Icon name={guideOpen ? 'chevron-up' : 'chevron-down'} size={15} />
        </button>
      </header>}

      <div id={compact ? undefined : 'cart-ai-guide'} hidden={!compact && !guideOpen} aria-busy={visibleStatus === 'loading'}>
      {!compact && visibleStatus !== 'success' && <div className="cart-ai-state" role={visibleStatus === 'error' ? 'alert' : 'status'}>
        <h3>{!analysisCart.length ? '분석할 상품이 없습니다.' : visibleStatus === 'loading' ? '장바구니를 분석하고 있어요…' : visibleStatus === 'error' ? 'AI 분석을 완료하지 못했어요.' : visibleStatus === 'stale' ? '장바구니 또는 구매 조건이 변경됐어요.' : '현재 장바구니 구성을 살펴볼까요?'}</h3>
        <p>{visibleStatus === 'error' ? renderedAnalysis.error : visibleStatus === 'stale' ? '이전 결과는 표시하지 않습니다. 다시 분석해 주세요.' : '담은 전체 상품의 등록 정보를 상품 종류별로 비교합니다. 구매 수량은 섭취량으로 환산하지 않습니다.'}</p>
        <button type="button" className={`btn btn-primary cart-ai-trigger${visibleStatus === 'loading' ? ' is-loading' : ''}`} onClick={analyze} disabled={unavailable || visibleStatus === 'loading'}>
          {visibleStatus === 'loading' ? '분석 중…' : visibleStatus === 'error' ? '다시 시도' : visibleStatus === 'stale' ? '다시 분석' : '장바구니 영양 분석하기'}
        </button>
        {!localCriteriaSet && <p className="cart-ai-personalization-note">등록된 상품 정보로 구성을 분석합니다. <button type="button" onClick={openSettings}>알레르기 설정</button></p>}
      </div>}
      {!compact && insufficientInfo && <p className="cart-ai-data-note" role="status">등록된 영양정보가 부족해 영양 비교를 보류합니다. 상품별 정보 없음 항목과 원재료 표시를 확인해 주세요.</p>}
      {compact && visibleStatus === 'error' && <div className="ai-insight-stale" role="alert"><p>분석 결과를 불러오지 못했습니다.</p><button type="button" className="btn btn-soft btn-sm" onClick={analyze} disabled={unavailable}>다시 시도</button></div>}

      {compact && visibleStatus === 'idle' && (
        <>
          <button type="button" className="cart-ai-trigger" onClick={analyze} disabled={unavailable}>
            장바구니 분석하기
          </button>
          {!settingsLoading && !localCriteriaSet && (
            <p className="cart-ai-personalization-note">
              등록된 상품 정보로 구성을 분석해요.
              <button type="button" onClick={openSettings}>알레르기 설정</button>
            </p>
          )}
        </>
      )}

      {compact && visibleStatus === 'loading' && (
        <button type="button" className="cart-ai-trigger is-loading" disabled aria-live="polite">
          <Icon name="sparkles" size={14} /> 장바구니 구성을 확인하고 있어요...
        </button>
      )}

      {compact && visibleStatus === 'stale' && (
        <div className="ai-insight-stale" role="status">
          <p>장바구니 구성이 변경되었습니다. 다시 분석해 주세요.</p>
          <button type="button" className="btn btn-soft btn-sm" onClick={analyze} disabled={unavailable}>다시 분석</button>
        </div>
      )}

      {insight && visibleStatus === 'success' && (
        compact ? (
          <div className="cart-ai-result cart-ai-result-compact">
            <p className="cart-ai-quick-summary">{quick.summary}</p>
            {insight.explanationNotice && <small className="cart-ai-fallback-note">{insight.explanationNotice}</small>}
            <dl className="cart-ai-quick-metrics" style={{ '--quick-metric-count': quick.metrics.length }} aria-label="핵심 분석 지표">
              {quick.metrics.map(item => <div key={item.key} className={item.key === 'attention' && item.count ? 'is-attention' : ''}>
                <dt title={item.label}>{({ sugar: '저당', sodium: '저염', protein: '고단백', calories: '상대 저열량', supplement: '영양제', caffeine: '카페인 미표시', attention: '확인 필요' })[item.key] || item.label}</dt>
                <dd>{item.count}{item.key !== 'attention' && <span>/{item.total}</span>}<small>종</small></dd>
              </div>)}
            </dl>
            {quick.goodPoint && <section className="cart-ai-quick-good"><h4>✓ 좋은 점</h4><p title={quick.goodPoint}>{quick.goodPoint}</p></section>}
            {quick.checks.length > 0 && <section className="cart-ai-quick-checks">
              <h4>! 확인 필요{quick.attentionCount > 0 ? ` ${quick.attentionCount}종` : ''}</h4>
              <ul>{quick.checks.map(product => <li key={product.id}>
                <strong title={product.name}>{product.name}</strong><p title={product.reason}>{product.reason}</p>
              </li>)}</ul>
              {quick.remaining > 0 && <small>외 {quick.remaining}종은 상세 분석에서 확인</small>}
            </section>}
            <div className="cart-ai-compact-actions">
              <button type="button" onClick={openDetailedAnalysis}>분석 결과 자세히 보기</button>
              <button type="button" onClick={analyze} disabled={unavailable}>다시 분석</button>
            </div>
          </div>
        ) : (
          <div className="cart-ai-result cart-ai-result-detail cart-ai-dashboard">
            <section className="cart-ai-glance">
              <h4><Icon name="sparkles" size={18} /> AI 한눈 요약</h4>
              <small>현재 장바구니 구성 · {productReasons.length}종 분석</small>
              <p>{summary}</p>
              {!insight.aiExplanationAvailable && <small>등록 정보 기반 기본 분석</small>}
            </section>
            <div className="cart-ai-metrics cart-ai-balance-items" style={{ '--cart-ai-metric-count': mainMetrics.length }} aria-label="핵심 분석 지표">
              {mainMetrics.map(item => <div key={item.key} className={`cart-ai-metric${item.key === 'attention' ? ' is-attention' : ''}`} title={item.reason}>
                <span>{item.label}</span>
                <strong>{insufficientInfo && !['attention', 'supplement', 'caffeine'].includes(item.key) ? <small>정보 없음 · 비교 보류</small> : <>{item.count}<small>{item.key === 'attention' ? '종' : ' / ' + item.total + '종'}</small></>}</strong>
                <p>{METRIC_HINTS[item.key] || '현재 상품 구성'}</p>
                <details><summary><span>기준 보기</span><Icon name="chevron-down" size={13} /></summary><p>{item.reason}</p></details>
              </div>)}
            </div>
            {extraMetrics.length > 0 && <details className="cart-ai-extra-metrics"><summary><span>추가 조건 지표 {extraMetrics.length}개</span><Icon name="chevron-down" size={15} /></summary><BalanceItems items={extraMetrics} /></details>}
            <div className="cart-ai-findings">
              <FindingCard title="좋은 점" items={insight.goodPoints?.length ? insight.goodPoints : ['현재 기준에 해당하는 상품 정보를 더 살펴보세요.']} />
              <FindingCard title="확인 필요" attention items={insight.attentionPoints?.length ? insight.attentionPoints : ['등록 정보에서 추가 확인 항목이 도출되지 않았습니다. 알레르기 정보는 상품 원재료 표시를 확인해 주세요.']} />
            </div>
            <section className="cart-ai-product-section">
              <div className="cart-ai-section-heading"><h4>상품별 분석</h4><span>{productReasons.length}종 · 자세한 근거는 펼쳐서 확인</span></div>
              <div id="cart-ai-product-list" className="cart-ai-product-list">
                {visibleProductReasons.map((product, index) => {
                  const source = analysisCart.find(item => String(item.product.id) === String(product.id))?.product
                  const allergyHit = source && matchingAllergens(source, allergies).length > 0
                  const tags = product.tags.filter(tag => tag !== '확인 필요')
                  const preview = allergyHit ? '설정하신 알레르기 성분이 포함되어 있어 원재료 확인이 필요합니다.'
                    : product.checks.length ? briefReason(product.checks[0])
                      : tags.length ? tags.join('·') + ' 기준에 해당하는 구성이에요.' : product.reasons[0] || '상품별 표시 정보를 함께 확인해주세요.'
                  return <Fragment key={product.id}>
                    {product.group !== visibleProductReasons[index - 1]?.group && <div className="cart-ai-section-heading"><h4>{product.group}</h4></div>}
                    <article className="cart-ai-product-reason">
                    <div className="cart-ai-product-top">
                      {source && <div className="cart-ai-product-image"><ProductImage src={source.image} alt="" /></div>}
                      <h5>{product.name}</h5>
                    </div>
                    <div className="cart-ai-product-tags">
                      {product.tags.map(tag => <span key={tag} className={`tag ${tag === '확인 필요' ? 'cart-ai-check-tag' : 'tag-soft'}`}>{tag}</span>)}
                      {source && <AllergenBadges product={source} allergies={allergies} />}
                    </div>
                    <p className="cart-ai-product-preview">{isSupplement(source) ? '주요 성분: ' + ingredientDescription(source) : shortCopy(preview)}</p>
                    <details key={analysisKey} className="cart-ai-evidence">
                      <summary><span className="cart-ai-closed-label">자세히 보기</span><span className="cart-ai-open-label">접기</span><Icon name="chevron-down" size={15} /></summary>
                      {source && <div className="cart-ai-nutrition-details">
                        <p>등록 제공량 기준: {source.nutrition?.servingSize || '정보 없음'} · 구매 수량 {analysisCart.find(item => String(item.product.id) === String(product.id))?.quantity}개</p>
                        {!isSupplement(source) && <div>{[['protein', '단백질', 'g'], ['sugar', '당류', 'g'], ['calories', '열량', 'kcal'], ['sodium', '나트륨', 'mg']].map(([key, label, unit]) => {
                          const value = source.nutrition?.[key]
                          const known = value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0
                          return <span key={key}>{label}: <b>{known ? `${value}${unit}` : '정보 없음 · 분석 제외'}</b></span>
                        })}</div>}
                        <p>등록 알레르기 성분: {source.allergens?.length ? source.allergens.join(', ') : '정보 없음 · 원재료 표시 확인 필요'}</p>
                      </div>}
                      <ul>{product.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
                    </details>
                  </article></Fragment>
                })}
              </div>
              {productReasons.length > 3 && !analysisCart.some(item => isSupplement(item.product)) && <button type="button" className="btn btn-soft btn-sm cart-products-toggle" aria-expanded={productsExpanded} aria-controls="cart-ai-product-list" onClick={() => setExpandedProductsKey(productsExpanded ? null : analysisKey)}>
                {productsExpanded ? '상품 접기' : `나머지 ${productReasons.length - 3}종 더 보기`}
                <Icon name={productsExpanded ? 'chevron-up' : 'chevron-down'} size={16} />
              </button>}
            </section>
            <section className="cart-ai-cta">
              <div><h4>현재 구성과 함께 살펴볼 상품 유형</h4>{actions.map(action => <p key={action}>{action}</p>)}</div>
              {hasComplementFilter && <button type="button" className="btn btn-primary cart-ai-products-link" onClick={openComplementProducts}>{insight.recommendation.label}<Icon name="chevron-right" size={15} /></button>}
            </section>
            <footer className="cart-ai-dashboard-foot">
              {!basis?.excluded_allergens?.length && <p className="cart-ai-personalization-note">등록 알레르기를 설정하면 상품 성분과 비교할 수 있어요. <button type="button" onClick={openSettings}>알레르기 설정</button></p>}
              <div><small>상품 종류 기준 참고 분석 · 실제 섭취량과는 달라요.</small>
                <button type="button" className={`cart-ai-reanalyze${visibleStatus === 'loading' ? ' cart-ai-trigger is-loading' : ''}`} disabled={unavailable || visibleStatus === 'loading'} onClick={analyze}>
                  {visibleStatus === 'loading' ? <Icon name="sparkles" size={14} /> : <span aria-hidden="true">↻</span>}
                  {visibleStatus === 'loading' ? '분석 중…' : visibleStatus === 'idle' ? '장바구니 영양 분석하기' : '다시 분석'}
                </button>
              </div>
              {visibleStatus === 'stale' && <small role="status">구성이 변경됐어요. 현재 기준의 기본 분석을 표시합니다.</small>}
              {insight.explanationNotice && <small className="cart-ai-fallback-note" role="status">{insight.explanationNotice}</small>}
              <small>알레르기 설정: {basis?.excluded_allergens?.join(' · ') || '미설정'}</small>
              <small>등록 정보가 없는 값은 비교할 수 없으며, 알레르기 안전 여부를 보장하지 않습니다.</small>
            </footer>
          </div>
        )
      )}
      </div>
    </div>
  )
}
