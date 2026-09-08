import { useEffect, useRef, useState } from 'react'
import { REVIEW_REPORT_REASONS, submitReviewReport } from '../lib/reviews'
import { supabase } from '../lib/supabase'
import { useStore } from '../store'

export default function ReviewReportDialog({ review, productId, onClose }) {
  const ref = useRef(null)
  const submitting = useRef(false)
  const [reason, setReason] = useState(REVIEW_REPORT_REASONS[0])
  const [detail, setDetail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const { showToast } = useStore()
  useEffect(() => { const dialog = ref.current; dialog.showModal(); return () => dialog.close() }, [])
  const submit = async event => {
    event.preventDefault()
    if (submitting.current) return
    if (reason === '기타' && detail.trim().length < 2) { setError('기타 사유를 2자 이상 입력해 주세요.'); return }
    submitting.current = true
    setBusy(true)
    setError('')
    try {
      const result = await submitReviewReport(supabase, { review, productId, reason, detail })
      showToast(result?.duplicate ? '이미 신고한 리뷰입니다.' : '신고가 접수되었습니다. 관리자가 확인 후 처리합니다.')
      onClose()
    } catch { setError('신고를 접수하지 못했습니다. 로그인 상태를 확인하고 다시 시도해 주세요.') }
    finally { submitting.current = false; setBusy(false) }
  }
  return <dialog ref={ref} className="review-delete-dialog review-report-dialog" aria-labelledby="review-report-title" onCancel={event => { event.preventDefault(); if (!busy) onClose() }} onClick={event => { if (event.target === event.currentTarget && !busy) onClose() }}>
    <form onSubmit={submit}>
      <h3 id="review-report-title">리뷰 신고</h3>
      <p>신고 사유를 선택해 주세요. 접수된 내용은 관리자가 확인합니다.</p>
      <fieldset disabled={busy}><legend>신고 사유</legend>{REVIEW_REPORT_REASONS.map(value => <label key={value}><input type="radio" name="reason" checked={reason === value} onChange={() => { setReason(value); setError('') }} />{value}</label>)}</fieldset>
      {reason === '기타' && <><label className="review-report-detail">상세 내용 (필수)<textarea value={detail} onChange={event => { setDetail(event.target.value); setError('') }} maxLength={1000} disabled={busy} rows={4} placeholder="신고 사유를 자세히 작성해 주세요." /></label>
      <small>{detail.length}/1,000</small></>}
      {error && <p role="alert">{error}</p>}
      <div className="review-report-actions"><button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>취소</button><button className="btn btn-primary" disabled={busy}>{busy ? '접수 중…' : '신고 접수'}</button></div>
    </form>
  </dialog>
}
