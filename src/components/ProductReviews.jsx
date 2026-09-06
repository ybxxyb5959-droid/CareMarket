import { useState } from 'react'
import { getSampleReviews, getSampleReviewSummary } from '../data/mock'
import Stars from './Stars'

export default function ProductReviews({ product }) {
  const [expanded, setExpanded] = useState(false)
  const { averageRating, reviewCount } = getSampleReviewSummary(product.id)
  const reviews = getSampleReviews(product)

  return <section className="product-reviews" aria-labelledby="reviews-title">
    <div className="page-head"><h2 id="reviews-title">구매 후기</h2></div>
    <div className="sample-review-summary">
      <Stars rating={averageRating.toFixed(1)} />
      <span aria-hidden="true">|</span>
      <span>{reviewCount}개의 후기</span>
      <small>샘플</small>
    </div>
    <div id="sample-review-list">
      {(expanded ? reviews : reviews.slice(0, 3)).map(review => <article className="review-row" key={review.id}>
        <div><b>{review.author}</b><span className="sample-review-stars" aria-label={`5점 만점에 ${review.rating}점`}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span></div>
        <p>{review.content}</p>
        <small><time dateTime={review.date}>{review.date.replaceAll('-', '.')}</time></small>
      </article>)}
    </div>
    <button type="button" className="btn btn-text sample-review-more" aria-expanded={expanded} aria-controls="sample-review-list" onClick={() => setExpanded(value => !value)}>
      {expanded ? '후기 접기' : '후기 더보기'}
    </button>
    <p className="sample-review-note">포트폴리오 시연을 위한 샘플 리뷰입니다.</p>
  </section>
}
