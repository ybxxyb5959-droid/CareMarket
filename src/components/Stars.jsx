import Icon from './Icon'
import { getSampleReviewSummary } from '../data/mock'

export function SampleRating({ productId, showSampleLabel = true }) {
  const { averageRating, reviewCount } = getSampleReviewSummary(productId)
  return <span className="sample-rating" aria-label={`샘플 별점 ${averageRating.toFixed(1)}점, 후기 ${reviewCount}개`}>
    <Stars rating={averageRating.toFixed(1)} count={reviewCount} />
    {showSampleLabel && <small>샘플</small>}
  </span>
}

export default function Stars({ rating, count }) {
  return (
    <span className="stars">
      <Icon name="star" size={13} fill="currentColor" strokeWidth={0} />
      {rating}
      {count != null && <span className="rc">({count.toLocaleString('ko-KR')})</span>}
    </span>
  )
}
