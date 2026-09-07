import { useEffect, useMemo, useState } from 'react'
import AdminGate from '../components/AdminGate'
import { useStore } from '../store'
import { supabase } from '../lib/supabase'
import { fetchAdminReviews, moderateReview } from '../lib/reviews'

const formatDate = value => new Intl.DateTimeFormat('ko-KR', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Seoul',
}).format(new Date(value))

function AdminReviewsContent() {
  const { showToast } = useStore()
  const [rows, setRows] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try { setRows(await fetchAdminReviews(supabase)) }
    catch (caught) {
      console.error('Admin reviews fetch failed:', { code: caught?.code || 'ADMIN_REVIEWS_FETCH_FAILED' })
      setError('후기 목록을 불러오지 못했습니다.')
    } finally { setLoading(false) }
  }
  useEffect(() => {
    let active = true
    fetchAdminReviews(supabase)
      .then(data => { if (active) setRows(data) })
      .catch(caught => {
        console.error('Admin reviews fetch failed:', { code: caught?.code || 'ADMIN_REVIEWS_FETCH_FAILED' })
        if (active) setError('후기 목록을 불러오지 못했습니다.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const visible = useMemo(() => rows.filter(row => filter === 'all' || row.status === filter), [filter, rows])
  const changeVisibility = async (review) => {
    let reason = ''
    if (!review.is_hidden) {
      reason = window.prompt('숨김 사유를 2자 이상 입력해 주세요. 원문은 삭제되지 않습니다.', '')?.trim() || ''
      if (!reason) return
      if (reason.length < 2 || reason.length > 500) {
        showToast('숨김 사유는 2~500자로 입력해 주세요.')
        return
      }
    } else if (!window.confirm('이 후기를 다시 공개할까요? 기존 숨김 사유 기록은 유지됩니다.')) return
    setBusyId(review.id)
    try {
      await moderateReview(supabase, review.id, !review.is_hidden, reason)
      setRows(current => current.map(row => row.id === review.id ? {
        ...row,
        is_hidden: !review.is_hidden,
        hidden_reason: !review.is_hidden ? reason : row.hidden_reason,
        hidden_at: !review.is_hidden ? new Date().toISOString() : null,
      } : row))
      showToast(review.is_hidden ? '후기를 복원했습니다.' : '후기를 숨겼습니다.')
    } catch (caught) {
      console.error('Review moderation failed:', { code: caught?.code || 'REVIEW_MODERATION_FAILED' })
      showToast('후기 공개 상태를 변경하지 못했습니다.')
    } finally { setBusyId(null) }
  }

  return <div className="wrap page admin-reviews-page">
    <div className="admin-head"><h1>구매후기 관리</h1><p>실제 구매가 확인된 후기의 공개 상태 관리</p></div>
    <div className="admin-toolbar"><div className="admin-filters">
      {[['all', '전체'], ['public', '공개'], ['hidden', '관리자 숨김'], ['deleted', '사용자 삭제']].map(([value, label]) => <button key={value} className={filter === value ? 'on' : ''} onClick={() => setFilter(value)}>{label}</button>)}
    </div></div>
    {loading ? <div className="empty" role="status"><p>후기 데이터를 불러오는 중입니다.</p></div>
      : error ? <div className="empty" role="alert"><h3>{error}</h3><button type="button" className="btn btn-primary btn-sm" onClick={() => void load()}>다시 시도</button></div>
      : visible.length === 0 ? <div className="empty"><h3>해당 상태의 후기가 없습니다.</h3></div>
      : <div className="admin-review-list">{visible.map(review => <article key={review.id} className={`admin-review-card${review.status !== 'public' ? ' is-hidden' : ''}`}>
        <div className="admin-review-card-head"><div><strong>{review.product_name}</strong><span>{review.author_name} · 작성 {formatDate(review.created_at)}{review.updated_at && review.updated_at !== review.created_at ? ` · 수정 ${formatDate(review.updated_at)}` : ''}</span></div><span className={`status ${review.status === 'public' ? 'status-active' : 'status-done'}`}>{review.status === 'deleted' ? '사용자 삭제' : review.status === 'hidden' ? '관리자 숨김' : '공개'}</span></div>
        <div className="admin-review-rating" aria-label={`5점 만점에 ${review.rating}점`}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</div>
        <p>{review.content}</p>
        {review.hidden_reason && <small>숨김 사유 기록 · {review.hidden_reason}</small>}
        {review.status !== 'deleted' && <div><button type="button" className={review.is_hidden ? 'btn btn-soft btn-sm' : 'btn btn-ghost btn-sm'} disabled={busyId !== null} onClick={() => void changeVisibility(review)}>{busyId === review.id ? '처리 중…' : review.is_hidden ? '복원' : '숨김'}</button></div>}
      </article>)}</div>}
  </div>
}

export default function AdminReviews() { return <AdminGate><AdminReviewsContent /></AdminGate> }
