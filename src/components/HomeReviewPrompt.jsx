import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store'
import { supabase } from '../lib/supabase'
import { fetchMyReviewItems } from '../lib/reviews'
import ProductImage from './ProductImage'

const koreaDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date())

export default function HomeReviewPrompt() {
  const { authUserId, reviewRevision, openReviewForm, navigate } = useStore()
  const [state, setState] = useState({ ownerId: null, rows: [], hidden: false })
  const dismissKey = useMemo(() => authUserId ? `cm-review-prompt:${authUserId}:${koreaDate()}` : '', [authUserId])

  useEffect(() => {
    let active = true
    if (!authUserId) {
      return () => { active = false }
    }
    let hidden = false
    try { hidden = localStorage.getItem(dismissKey) === '1' } catch { /* Storage can be unavailable. */ }
    fetchMyReviewItems(supabase)
      .then(rows => { if (active) setState({ ownerId: authUserId, rows, hidden }) })
      .catch(error => {
        console.error('Review prompt eligibility fetch failed:', { code: error?.code || 'REVIEW_ELIGIBILITY_FAILED' })
        if (active) setState({ ownerId: authUserId, rows: [], hidden })
      })
    return () => { active = false }
  }, [authUserId, dismissKey, reviewRevision])

  if (!authUserId || state.ownerId !== authUserId || state.hidden) return null
  const eligible = state.rows.filter(row => row.order_status === 'delivered' && !row.reviewed)
  const target = eligible[0]
  if (!target) return null
  const rewardPercent = Number(target.reward_coupon_percent)
  const dismiss = () => {
    try { localStorage.setItem(dismissKey, '1') } catch { /* Eligibility is independent of storage. */ }
    setState(current => ({ ...current, hidden: true }))
  }

  return <section className="home-review-prompt" aria-labelledby="home-review-title">
    <div className="wrap home-review-prompt-inner">
      <ProductImage src={target.image_url} alt="" />
      <div className="home-review-copy">
        <span className="eyebrow">구매 확인</span>
        <h2 id="home-review-title">받은 제품은 어떠셨나요?</h2>
        <strong>{target.product_name}</strong>
        <div className="home-review-stars" aria-label="별점을 선택하면 리뷰 작성 창이 열립니다">
          {[1, 2, 3, 4, 5].map(value => <button key={value} type="button" aria-label={`${value}점으로 리뷰 작성`} onClick={() => openReviewForm(target, value)}>☆</button>)}
        </div>
        <p>리뷰를 남겨주세요.</p>
        {target.reward_issued ? <small>이 주문의 리뷰 혜택은 이미 지급되었습니다.</small> : <>
          <small>리뷰를 남겨주시면 {rewardPercent > 0 ? `${rewardPercent}% ` : ''}쿠폰을 드립니다.</small>
          <small>이 주문의 첫 리뷰 작성 시, 별점과 관계없이 지급됩니다.</small>
        </>}
        {eligible.length > 1 && <button type="button" className="btn btn-text home-review-more" onClick={() => navigate('orders')}>나머지 {eligible.length - 1}개 상품은 주문내역에서 보기</button>}
      </div>
      <div className="home-review-actions">
        <button type="button" className="btn btn-text" onClick={dismiss}>나중에</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => openReviewForm(target)}>리뷰 작성하기</button>
      </div>
    </div>
  </section>
}
