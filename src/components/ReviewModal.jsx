import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import { supabase } from '../lib/supabase'
import { submitOrderItemReview, updateMyReview } from '../lib/reviews'
import ProductImage from './ProductImage'

const newRequestId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  const bytes = new Uint8Array(16)
  globalThis.crypto?.getRandomValues?.(bytes)
  if (!bytes.some(Boolean)) for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function reviewErrorMessage(error, editing) {
  if (error?.code === '42501') return editing
    ? '수정 권한이 없거나 이미 삭제된 리뷰입니다. 화면을 새로 확인해 주세요.'
    : '현재 주문 상태로는 리뷰를 등록할 수 없습니다. 주문내역을 다시 확인해 주세요.'
  if (error?.code === '23505') return '이미 처리된 리뷰 요청입니다. 주문내역을 새로 확인해 주세요.'
  return '리뷰를 등록하지 못했어요. 작성 내용은 그대로 유지됩니다. 다시 시도해 주세요.'
}

function ReviewModalContent({ reviewTarget, reviewInitialRating, closeReviewForm, reviewCompleted, showToast, navigate }) {
  const dialogRef = useRef(null)
  const previousFocusRef = useRef(null)
  const savingRef = useRef(false)
  const editing = reviewTarget.form_mode === 'edit'
  const initialRating = Number.isInteger(reviewInitialRating) ? reviewInitialRating : null
  const initialContent = editing ? String(reviewTarget.review_content ?? reviewTarget.content ?? '') : ''
  const [rating, setRating] = useState(initialRating)
  const [content, setContent] = useState(initialContent)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [requestId] = useState(newRequestId)

  useEffect(() => {
    previousFocusRef.current = document.activeElement
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => {
      dialog?.close()
      previousFocusRef.current?.focus?.()
    }
  }, [])

  const trimmedLength = content.trim().length
  const rewardPercent = Number(reviewTarget.reward_coupon_percent)
  const hasDraft = rating !== initialRating || content !== initialContent
  const valid = Number.isInteger(rating) && rating >= 1 && rating <= 5 && trimmedLength >= 20 && trimmedLength <= 1000
  const attemptClose = () => {
    if (savingRef.current) return
    if (hasDraft && !window.confirm('작성 중인 내용이 있습니다.\n창을 닫으시겠습니까?')) return
    closeReviewForm()
  }
  const chooseRating = (value) => {
    setRating(value)
    setError('')
  }
  const onStarKeyDown = (event, value) => {
    const next = {
      ArrowRight: Math.min(5, value + 1),
      ArrowUp: Math.min(5, value + 1),
      ArrowLeft: Math.max(1, value - 1),
      ArrowDown: Math.max(1, value - 1),
      Home: 1,
      End: 5,
    }[event.key]
    if (!next) return
    event.preventDefault()
    chooseRating(next)
    dialogRef.current?.querySelector(`[data-rating="${next}"]`)?.focus()
  }
  const submit = async (event) => {
    event.preventDefault()
    if (!valid || savingRef.current) return
    savingRef.current = true
    setSaving(true)
    setError('')
    try {
      const result = editing
        ? await updateMyReview(supabase, {
          reviewId: reviewTarget.review_id || reviewTarget.id,
          rating,
          content,
        })
        : await submitOrderItemReview(supabase, {
          orderItemId: reviewTarget.order_item_id,
          rating,
          content,
          requestId,
        })
      reviewCompleted()
      if (editing) {
        showToast('리뷰가 수정되었습니다.')
      } else if (result.coupon_issued) {
        const percent = Number(result.coupon_percent || reviewTarget.reward_coupon_percent)
        const couponLabel = result.coupon_name || `구매후기 감사 ${percent}% 쿠폰`
        showToast(`리뷰가 등록되었습니다. ${couponLabel}이 발급되었습니다.`, 'default', {
          label: '쿠폰함 보기', onClick: () => navigate('mypage'),
        })
      } else if (result.coupon_already_issued) {
        showToast('리뷰가 등록되었습니다. 이 주문의 리뷰 보상 쿠폰은 이미 발급되었습니다.')
      } else if (result.already_reviewed) {
        showToast('이미 등록된 리뷰입니다.')
      } else {
        showToast('리뷰가 등록되었습니다.')
      }
    } catch (caught) {
      console.error('Review submission failed:', { code: caught?.code || 'REVIEW_SUBMIT_FAILED' })
      setError(reviewErrorMessage(caught, editing))
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="review-dialog"
      aria-labelledby="review-dialog-title"
      aria-describedby="review-dialog-benefit"
      onCancel={(event) => { event.preventDefault(); attemptClose() }}
      onClick={(event) => { if (event.target === event.currentTarget) attemptClose() }}
    >
      <form className="review-dialog-form" onSubmit={submit}>
        <div className="review-dialog-head">
          <div><span className="eyebrow">Verified purchase</span><h2 id="review-dialog-title">{editing ? '리뷰 수정' : '구매후기 작성'}</h2></div>
          <button type="button" className="review-dialog-close" aria-label={`${editing ? '리뷰 수정' : '리뷰 작성'} 닫기`} disabled={saving} onClick={attemptClose}>×</button>
        </div>
        <div className="review-dialog-product">
          <ProductImage src={reviewTarget.image_url} alt="" />
          <div><strong>{reviewTarget.product_name}</strong><span>{reviewTarget.option_label || '기본 옵션'} · 수량 {reviewTarget.quantity}개</span></div>
        </div>
        <fieldset className="review-rating-field">
          <legend>별점 <b>필수</b></legend>
          <div className="review-stars-input" role="radiogroup" aria-label="별점 선택">
            {[1, 2, 3, 4, 5].map(value => <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value}점`}
              data-rating={value}
              tabIndex={rating === value || (rating === null && value === 1) ? 0 : -1}
              className={rating !== null && value <= rating ? 'selected' : ''}
              onClick={() => chooseRating(value)}
              onKeyDown={event => onStarKeyDown(event, value)}
            >★</button>)}
          </div>
          {rating === null && <small>1점부터 5점까지 선택해 주세요.</small>}
        </fieldset>
        <label className="review-content-field">
          <span>리뷰 본문 <b>필수</b></span>
          <textarea
            value={content}
            rows={8}
            maxLength={1000}
            disabled={saving}
            placeholder="맛, 식감, 포장 상태 등 직접 경험한 내용을 솔직하게 들려주세요."
            onChange={event => { setContent(event.target.value); setError('') }}
            aria-describedby="review-content-help review-dialog-benefit"
          />
          <span className="review-content-meta"><small id="review-content-help">앞뒤 공백을 제외하고 20~1,000자</small><output>{trimmedLength}/1,000</output></span>
          {content.length > 0 && trimmedLength < 20 && <small className="review-field-error">리뷰 본문을 20자 이상 입력해 주세요.</small>}
        </label>
        <p id="review-dialog-benefit" className="review-benefit-note">
          {editing
            ? '별점과 본문만 수정되며, 보유 쿠폰에는 변화가 없습니다.'
            : reviewTarget.reward_issued
              ? '이 주문의 리뷰 혜택은 이미 지급되었습니다.'
              : `이 주문의 첫 리뷰 작성 시, 별점과 관계없이 상품금액 ${rewardPercent > 0 ? `${rewardPercent}% ` : ''}할인 쿠폰이 지급됩니다.`}
        </p>
        {error && <div className="review-submit-error" role="alert"><span>{error}</span><small>내용을 확인한 뒤 다시 등록할 수 있습니다.</small></div>}
        <div className="review-dialog-actions">
          <button type="button" className="btn btn-ghost" disabled={saving} onClick={attemptClose}>취소</button>
          <button type="submit" className="btn btn-primary" disabled={!valid || saving}>{saving ? '저장 중…' : error ? '다시 시도' : editing ? '수정 저장' : '리뷰 등록'}</button>
        </div>
      </form>
    </dialog>
  )
}

export default function ReviewModal() {
  const {
    reviewTarget, reviewInitialRating, closeReviewForm, reviewCompleted, showToast, navigate,
  } = useStore()
  if (!reviewTarget) return null
  return <ReviewModalContent
    key={`${reviewTarget.order_item_id}:${reviewInitialRating ?? 'none'}`}
    reviewTarget={reviewTarget}
    reviewInitialRating={reviewInitialRating}
    closeReviewForm={closeReviewForm}
    reviewCompleted={reviewCompleted}
    showToast={showToast}
    navigate={navigate}
  />
}
