import { useEffect, useMemo, useRef, useState } from 'react'
import { SUB_FILTERS } from '../data/mock'
import { supabase } from '../lib/supabase'
import { requestAiFilterRecommendation } from '../lib/ai-filter-recommendation'
import Icon from './Icon'

const FILTER_BY_ID = new Map(SUB_FILTERS.map(filter => [filter.id, filter]))

export default function AiFilterRecommendation({
  currentCategory,
  availableFilterIds,
  selectedFilterIds,
  goal,
  onApply,
  onOpenSettings,
}) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('idle')
  const [recommendation, setRecommendation] = useState(null)
  const [error, setError] = useState('')
  const requestRef = useRef(null)

  const recommendedIds = recommendation?.recommendedFilters || []
  const selectedSet = useMemo(() => new Set(selectedFilterIds), [selectedFilterIds])
  const currentIds = recommendedIds.filter(id => selectedSet.has(id))
  const additionIds = recommendedIds.filter(id => !selectedSet.has(id))

  useEffect(() => () => requestRef.current?.abort(), [])

  const close = () => {
    requestRef.current?.abort()
    requestRef.current = null
    setOpen(false)
    if (status === 'loading') setStatus('idle')
  }

  const requestRecommendation = async (force = false) => {
    if (status === 'loading') return
    if (open && !force) {
      close()
      return
    }
    setOpen(true)
    setError('')
    setRecommendation(null)
    if (!goal) {
      setStatus('idle')
      return
    }

    requestRef.current?.abort()
    const request = new AbortController()
    requestRef.current = request
    setStatus('loading')
    try {
      const result = await requestAiFilterRecommendation(supabase, {
        currentCategory,
        availableFilters: availableFilterIds,
        goal,
        currentlySelected: selectedFilterIds,
        naturalLanguageRequest: null,
      }, request.signal)
      if (requestRef.current !== request || request.signal.aborted) return
      setRecommendation(result)
      setStatus('success')
    } catch (caught) {
      if (requestRef.current !== request || request.signal.aborted) return
      setError(caught.message || '조건 추천을 불러오지 못했어요.')
      setStatus('error')
    } finally {
      if (requestRef.current === request) requestRef.current = null
    }
  }

  const applyRecommendation = () => {
    if (!additionIds.length) {
      close()
      return
    }
    onApply(additionIds)
    setOpen(false)
  }

  const renderTags = ids => ids.map(id => (
    <span key={id}><Icon name="check" size={13} strokeWidth={2.6} />{FILTER_BY_ID.get(id)?.label || id}</span>
  ))

  return (
    <div className={`ai-filter-recommender${open ? ' open' : ''}`}>
      <button
        type="button"
        className="ai-filter-trigger"
        onClick={() => requestRecommendation()}
        disabled={status === 'loading'}
        aria-expanded={open}
        aria-controls="ai-filter-panel"
      >
        <Icon name="sparkles" size={15} />
        {status === 'loading' ? '조건을 살펴보고 있어요…' : 'AI 조건 추천'}
      </button>

      {open && (
        <section id="ai-filter-panel" className="ai-filter-panel" aria-label="AI 추천 조건">
          <div className="ai-filter-panel-head">
            <div><Icon name="sparkles" size={16} /><strong>AI 추천 조건</strong></div>
            <button type="button" onClick={close} aria-label="AI 조건 추천 닫기"><Icon name="x" size={16} /></button>
          </div>

          {!goal ? (
            <div className="ai-filter-empty">
              <p>맞춤 추천 기준을 설정하면 현재 상품군에 맞는 조건을 추천받을 수 있어요.</p>
              <button type="button" className="btn btn-soft btn-sm" onClick={onOpenSettings}>내 추천 기준 설정</button>
            </div>
          ) : status === 'loading' ? (
            <div className="ai-filter-loading" role="status">
              <span aria-hidden="true" />
              <p><b>{currentCategory}</b>에서 사용할 수 있는 조건을 살펴보고 있어요.</p>
            </div>
          ) : status === 'error' ? (
            <div className="ai-filter-error" role="alert">
              <p>{error || '조건 추천을 불러오지 못했어요.'}</p>
              <button type="button" className="btn btn-soft btn-sm" onClick={() => requestRecommendation(true)}>다시 시도</button>
            </div>
          ) : status === 'success' && recommendation ? (
            <div className="ai-filter-success">
              <p className="ai-filter-reason">{recommendation.reason}</p>
              {currentIds.length > 0 && (
                <div className="ai-filter-group"><small>현재 적용</small><div>{renderTags(currentIds)}</div></div>
              )}
              {additionIds.length > 0 ? (
                <div className="ai-filter-group recommended"><small>AI 추천 추가</small><div>{renderTags(additionIds)}</div></div>
              ) : (
                <p className="ai-filter-already">{currentIds.length > 0
                  ? '현재 조건이 이미 추천 기준과 잘 맞아요.'
                  : '현재 상품군에는 추가로 제안할 빠른 조건이 없어요.'}</p>
              )}
              <div className="ai-filter-actions">
                <button type="button" className="btn btn-primary btn-sm" onClick={applyRecommendation}>
                  {additionIds.length ? '추천 조건 적용' : '확인'}
                </button>
                {additionIds.length > 0 && <button type="button" className="btn btn-ghost btn-sm" onClick={close}>취소</button>}
              </div>
            </div>
          ) : null}
        </section>
      )}
    </div>
  )
}
