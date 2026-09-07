import SupplementComparisonNotice from './SupplementComparisonNotice'
import { useStore } from '../store'
import { isSupplement, registeredServing, ingredientDescription, measuredSupplementIngredients, supplementComparisonRows, comparisonPolicy, comparisonFallback } from '../../supabase/functions/_shared/product-type.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon'
import { won } from '../lib/format'
import { requestProductComparison } from '../lib/ai-insights'

const number = (value, unit) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? `${parsed.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}${unit}` : '정보 없음'
}

const ROWS = [
  ['가격', (product) => won(product.price)],
  ['열량', (product) => number(product.nutrition?.calories, 'kcal')],
  ['단백질', (product) => number(product.nutrition?.protein, 'g')],
  ['탄수화물', (product) => number(product.nutrition?.carbs, 'g')],
  ['지방', (product) => number(product.nutrition?.fat, 'g')],
  ['당류', (product) => number(product.nutrition?.sugar, 'g')],
  ['나트륨', (product) => number(product.nutrition?.sodium, 'mg')],
  ['알레르기', (product) => product.allergens?.length ? product.allergens.join(' · ') : '표시 정보 없음'],
  ['카페인', (product) => product.caffeine ? '포함' : '미포함'],
]

export default function ProductComparisonModal({ products, goal, onRemove, onClear, onClose }) {
  const { isLoggedIn } = useStore()
  const policy = comparisonPolicy(products, goal)
  const fallback = comparisonFallback(products, goal)
  const rows = policy.hasSupplements ? [
    ROWS[0],
    ['상품 유형', p => isSupplement(p) ? '영양제' : '일반 식품'],
    ['등록 섭취 기준', p => registeredServing(p).includes('정보 없음') ? '-' : registeredServing(p)],
    ['주요 성분', p => isSupplement(p) ? measuredSupplementIngredients(p).length ? ingredientDescription(p) : '-' : (p.mainIngredients || []).join(' · ') || '-'],
    ...supplementComparisonRows(products),
    ['알레르기', p => p.allergens?.length ? p.allergens.join(' · ') : '-'],
    ROWS.at(-1),
  ] : ROWS
  const [insight, setInsight] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const requestRef = useRef(null)
  const ids = useMemo(() => products.map((product) => product.id), [products])

  const load = useCallback(async () => {
    requestRef.current?.abort()
    setInsight(null)
    setError(null)
    setLoading(false)
    if (ids.length < 2 || !isLoggedIn || products.some(isSupplement)) return
    const controller = new AbortController()
    requestRef.current = controller
    setLoading(true)
    try {
      const result = await requestProductComparison(ids, controller.signal)
      if (!controller.signal.aborted) setInsight(result)
    } catch (caught) {
      if (!controller.signal.aborted) setError(caught.message)
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [ids, isLoggedIn, products])

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    void load()
    return () => {
      requestRef.current?.abort()
      document.body.style.overflow = previous
    }
  }, [load])

  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const result = policy.hasSupplements || !insight ? fallback : insight
  const highlights = new Map((result?.highlights || []).map((item) => [item.product_id, item.reason]))
  const recommendedProduct = policy.allowWinner && products.find((product) => product.id === result?.recommendation?.product_id)

  return createPortal(
    <div className="compare-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="compare-modal" role="dialog" aria-modal="true" aria-labelledby="compare-title">
        <header className="compare-head">
          <div>
            <span className="eyebrow"><Icon name="sparkles" size={13} /> Product comparison</span>
            <h2 id="compare-title" className="serif">상품 비교</h2>
            <p>실제 상품 정보 · 현재 구매목적 {goal}</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="비교 닫기"><Icon name="x" /></button>
        </header>

        <div className="compare-selection-actions">
          <span>선택 상품 {products.length}/3</span>
          {products.length > 0 && <button type="button" className="btn btn-soft btn-sm" onClick={onClear}>전체 비우기</button>}
        </div>
        {products.length < 2 && <p className="compare-empty" role="status">{products.length ? '상품을 하나 더 선택하면 비교할 수 있습니다. 선택한 상품은 아래에서 뺄 수 있습니다.' : '선택한 상품이 없습니다. 닫기 후 비교할 상품을 선택하세요.'}</p>}
        {products.length > 0 && <>
        <div className="compare-table-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th scope="col">비교 항목</th>
                {products.map((product) => <th scope="col" key={product.id}><small>{product.category}</small>{product.name}<button type="button" className="compare-remove" onClick={() => onRemove(product.id)} aria-label={`${product.name} 비교에서 빼기`}><Icon name="x" size={12} /> 빼기</button></th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, formatter]) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  {products.map((product) => <td key={product.id}>{formatter(product)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {products.length >= 2 && <div className="compare-ai-summary">
          <div className="compare-ai-title"><Icon name="sparkles" size={15} /><h3>AI 비교 요약</h3></div>
          {!isLoggedIn && !policy.hasSupplements && <p className="ai-insight-status">AI 비교 요약은 로그인 후 이용할 수 있습니다.</p>}
          {loading && <p className="ai-insight-status" role="status">선택한 상품의 차이를 살펴보고 있습니다.</p>}
          {error && (
            <div className="ai-insight-error" role="alert"><p>{error}</p><button className="btn btn-soft btn-sm" onClick={load}>다시 시도</button></div>
          )}
          {result && (
            <div className="compare-ai-content">
              <p>{result.summary}</p>
              {(policy.hasSupplements || !insight) && <small>등록된 상품 정보로 정리한 기본 비교입니다.</small>}
              <ul>
                {products.map((product) => <li key={product.id}><b>{product.name}</b><span>{highlights.get(product.id)}</span></li>)}
              </ul>
              <p className="compare-goal-fit"><b>구매목적 기준</b> {result.goal_fit_summary}</p>
              {policy.hasSupplements && <SupplementComparisonNotice />}
              {recommendedProduct && (
                <div className="compare-recommendation">
                  <span><Icon name="award" size={15} /> AI 추천 상품</span>
                  <b>{recommendedProduct.name}</b>
                  <p>{result.recommendation.reason}</p>
                </div>
              )}
            </div>
          )}
        </div>}
        </>}
      </section>
    </div>, document.body
  )
}
