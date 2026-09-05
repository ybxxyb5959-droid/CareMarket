import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import { requestCartSummary } from '../lib/ai-insights'
import { useStore } from '../store'

export default function CartAiInsight({ compact = false }) {
  const { cart } = useStore()
  const [insight, setInsight] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const requestRef = useRef(null)
  const cartSignature = cart.map(({ product, quantity }) => `${product.id}:${quantity}`).join('|')

  useEffect(() => () => requestRef.current?.abort(), [])
  useEffect(() => {
    requestRef.current?.abort()
    setInsight(null)
    setError(null)
    setLoading(false)
  }, [cartSignature])

  const analyze = async () => {
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setLoading(true)
    setError(null)
    setInsight(null)
    try {
      const result = await requestCartSummary(controller.signal)
      if (!controller.signal.aborted) setInsight(result)
    } catch (caught) {
      if (!controller.signal.aborted) setError(caught.message)
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }

  return (
    <div className={`cart-ai-insight${compact ? ' compact' : ''}`}>
      {!insight && !loading && !error && (
        <button type="button" className="cart-ai-trigger" onClick={analyze}>
          <Icon name="sparkles" size={15} /> AI로 장바구니 살펴보기
        </button>
      )}
      {loading && <p className="ai-insight-status" role="status"><Icon name="sparkles" size={14} /> 장바구니 구성을 살펴보고 있습니다.</p>}
      {error && (
        <div className="ai-insight-error" role="alert"><p>{error}</p><button type="button" className="btn btn-soft btn-sm" onClick={analyze}>다시 시도</button></div>
      )}
      {insight && (
        <div className="cart-ai-result">
          <div className="cart-ai-result-head"><span><Icon name="sparkles" size={14} /> AI 장바구니 요약</span><button type="button" onClick={analyze}>다시 분석</button></div>
          <strong>{insight.summary}</strong>
          <p>{insight.goal_alignment}</p>
          <ul>{insight.observations.map((observation) => <li key={observation}>{observation}</li>)}</ul>
          <small>등록된 상품 정보와 쇼핑 설정을 바탕으로 한 참고 요약입니다.</small>
        </div>
      )}
    </div>
  )
}
