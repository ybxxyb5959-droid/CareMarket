import { useEffect, useMemo, useRef, useState } from 'react'
import { getSampleReviews } from '../data/mock'
import { useStore } from '../store'
import { supabase } from '../lib/supabase'
import { combineReviewSummary, deleteMyReview, fetchMyReviewItems, fetchPublicProductReviews } from '../lib/reviews'
import Stars from './Stars'
import ReviewReportDialog from './ReviewReportDialog'
import { fetchDeletedSampleReviews } from '../lib/reviews'

const PAGE_SIZE = 5
const reviewDate = value => new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Seoul',
}).format(new Date(value))

function DeleteReviewDialog({ busy, onCancel, onConfirm }) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])
  return <dialog ref={ref} className="review-delete-dialog" aria-labelledby="review-delete-title" aria-describedby="review-delete-description" onCancel={(event) => { event.preventDefault(); if (!busy) onCancel() }} onClick={(event) => { if (event.target === event.currentTarget && !busy) onCancel() }}>
    <div>
      <h3 id="review-delete-title">작성한 리뷰를 삭제하시겠습니까?</h3>
      <p id="review-delete-description">삭제한 리뷰는 상품 후기에서 더 이상 표시되지 않습니다.</p>
      <div><button type="button" className="btn btn-ghost" disabled={busy} onClick={onCancel}>취소</button><button type="button" className="btn btn-primary" disabled={busy} onClick={onConfirm}>{busy ? '삭제 중…' : '삭제'}</button></div>
    </div>
  </dialog>
}

export default function ProductReviews({ product }) {
  const { authUserId, reviewRevision, openReviewForm, reviewCompleted, showToast } = useStore()
  const [reportTarget, setReportTarget] = useState(null)
  const [deletedSamples, setDeletedSamples] = useState([])
  const report = review => {
    if (!authUserId) { showToast('로그인 후 리뷰를 신고할 수 있습니다.'); return }
    setReportTarget(review)
  }
  useEffect(() => {
    let active = true
    fetchDeletedSampleReviews(supabase, product.id).then(rows => { if (active) setDeletedSamples(rows) }).catch(() => { if (active) setDeletedSamples([]) })
    return () => { active = false }
  }, [product.id, reviewRevision])
  const [sampleExpanded, setSampleExpanded] = useState(false)
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [actual, setActual] = useState({ key: '', reviews: [], count: null, average: null, error: null })
  const [eligibility, setEligibility] = useState({ ownerId: null, rows: [] })
  const [selectedItemId, setSelectedItemId] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const sampleReviews = getSampleReviews(product).filter(review => !deletedSamples.includes(review.id))

  useEffect(() => {
    let active = true
    const key = `${product.id}:${limit}:${reviewRevision}`
    fetchPublicProductReviews(supabase, product.id, limit)
      .then(result => { if (active) setActual({ key, ...result, error: null }) })
      .catch(error => {
        console.error('Public reviews fetch failed:', { code: error?.code || 'REVIEWS_FETCH_FAILED' })
        if (active) setActual({ key, reviews: [], count: null, average: null, error: '후기를 불러오지 못했습니다.' })
      })
    return () => { active = false }
  }, [product.id, limit, reviewRevision])

  useEffect(() => {
    let active = true
    if (!authUserId) return () => { active = false }
    fetchMyReviewItems(supabase)
      .then(rows => { if (active) setEligibility({ ownerId: authUserId, rows }) })
      .catch(error => {
        console.error('Product review eligibility fetch failed:', { code: error?.code || 'REVIEW_ELIGIBILITY_FAILED' })
        if (active) setEligibility({ ownerId: authUserId, rows: [] })
      })
    return () => { active = false }
  }, [authUserId, product.id, reviewRevision])

  const eligible = useMemo(() => eligibility.ownerId === authUserId
    ? eligibility.rows.filter(row => row.product_id === Number(product.id) && row.order_status === 'delivered' && !row.reviewed)
    : [], [authUserId, eligibility, product.id])
  const selectedTarget = eligible.find(row => row.order_item_id === selectedItemId) || eligible[0] || null
  const ownReviewItem = review => eligibility.ownerId === authUserId
    ? eligibility.rows.find(row => row.review_id === review.id)
    : null
  const editReview = review => {
    const item = ownReviewItem(review)
    openReviewForm({
      ...item,
      review_id: review.id,
      review_rating: review.rating,
      review_content: review.content,
      product_name: product.name,
      image_url: product.image,
    }, review.rating, 'edit')
  }
  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return
    setDeleting(true)
    try {
      await deleteMyReview(supabase, deleteTarget.id)
      setDeleteTarget(null)
      reviewCompleted()
      showToast('리뷰가 삭제되었습니다.')
    } catch (error) {
      console.error('Review deletion failed:', { code: error?.code || 'REVIEW_DELETE_FAILED' })
      showToast('리뷰를 삭제하지 못했습니다. 권한과 리뷰 상태를 확인해 주세요.')
    } finally { setDeleting(false) }
  }

  const actualKey = `${product.id}:${limit}:${reviewRevision}`
  const loadedActual = actual.key === actualKey ? { ...actual, loading: false } : { reviews: [], count: null, average: null, loading: true, error: null }
  const actualCount = loadedActual.count || 0
  const { count: combinedCount, average: combinedAverage } = combineReviewSummary(sampleReviews, loadedActual)
  const hasMoreActual = loadedActual.reviews.length < actualCount
  const visibleSamples = hasMoreActual ? [] : sampleExpanded ? sampleReviews : sampleReviews.slice(0, 3)

  return <section id="product-reviews" className="product-reviews" aria-labelledby="reviews-title">
    <div className="review-section-heading">
      <h2 id="reviews-title">구매후기</h2>
      <p>욕설·비방·개인정보가 포함되거나 상품 및 주문 경험과 무관한 후기는 운영 기준에 따라 노출이 제한될 수 있습니다.</p>
    </div>

    <div className="actual-review-toolbar">
      <div>
        <Stars rating={combinedAverage.toFixed(1)} /><strong>{combinedAverage.toFixed(1)}</strong><span>후기 {combinedCount}개</span>
        {loadedActual.loading && <span className="review-load-status" role="status">새 후기를 불러오는 중입니다.</span>}
        {loadedActual.error && <span className="review-load-status" role="alert">{loadedActual.error}</span>}
      </div>
      {eligible.length > 0 && <div className="product-review-write">
        {eligible.length > 1 && <label>구매 주문상품 선택<select value={selectedTarget?.order_item_id || ''} onChange={event => setSelectedItemId(event.target.value)}>
          {eligible.map(row => <option key={row.order_item_id} value={row.order_item_id}>{reviewDate(row.order_created_at)} 주문 · {row.option_label || '기본 옵션'}</option>)}
        </select></label>}
        <button type="button" className="btn btn-primary btn-sm" onClick={() => selectedTarget && openReviewForm(selectedTarget)}>리뷰 작성</button>
      </div>}
    </div>

    <div id="review-list" className="review-list">
      {!loadedActual.loading && !loadedActual.error && loadedActual.reviews.map(review => <article className="review-row actual-review-row" key={review.id}>
        <div><button type="button" className="review-report-button" onClick={() => report(review)}>신고</button><b>{review.author_name}</b>{review.is_mine && <span className="my-review-badge">내가 작성한 후기</span>}<span className="verified-review-badge">구매 확인</span><span className="sample-review-stars" aria-label={`5점 만점에 ${review.rating}점`}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span></div>
        <p>{review.content}</p>
        <div className="actual-review-meta"><small><time dateTime={review.created_at}>{reviewDate(review.created_at)}</time>{review.updated_at && review.updated_at !== review.created_at ? ' · 수정됨' : ''}</small>
          {review.is_mine && <span className="my-review-actions"><button type="button" className="btn btn-text btn-sm" onClick={() => editReview(review)}>수정</button><button type="button" className="btn btn-text btn-sm" onClick={() => setDeleteTarget(review)}>삭제</button></span>}
        </div>
      </article>)}
      {visibleSamples.map(review => <article className="review-row" key={review.id}>
          <div><button type="button" className="review-report-button" onClick={() => report(review)}>신고</button><b>{review.author}</b><span className="sample-review-stars" aria-label={`5점 만점에 ${review.rating}점`}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span></div>
          <p>{review.content}</p>
          <small><time dateTime={review.date}>{review.date.replaceAll('-', '.')}</time></small>
        </article>)}
    </div>
      <button type="button" className="btn btn-text review-more" aria-expanded={!hasMoreActual && sampleExpanded} aria-controls="review-list" onClick={() => {
        if (hasMoreActual) setLimit(value => value + PAGE_SIZE)
        else setSampleExpanded(value => !value)
      }}>
        {hasMoreActual ? '후기 더보기' : sampleExpanded ? '후기 접기' : '후기 더보기'}
      </button>
    {reportTarget && <ReviewReportDialog review={reportTarget} productId={product.id} onClose={() => setReportTarget(null)} />}
    {deleteTarget && <DeleteReviewDialog busy={deleting} onCancel={() => setDeleteTarget(null)} onConfirm={() => void confirmDelete()} />}
  </section>
}
