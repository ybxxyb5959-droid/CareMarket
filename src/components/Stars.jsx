import Icon from './Icon'
import { useEffect, useState } from 'react'
import { getSampleReviews } from '../data/mock'
import { useStore } from '../store'
import { supabase } from '../lib/supabase'
import { combineReviewSummary, fetchProductReviewSummary } from '../lib/reviews'

export function SampleRating({ product }) {
  const { reviewRevision } = useStore()
  const [actual, setActual] = useState(null)
  const key = `${product.id}:${reviewRevision}`
  useEffect(() => {
    let active = true
    fetchProductReviewSummary(supabase, product.id)
      .then(summary => { if (active) setActual({ key, ...summary }) })
      .catch(error => { console.error('Product rating fetch failed:', { code: error?.code || 'REVIEWS_FETCH_FAILED' }) })
    return () => { active = false }
  }, [product.id, key])
  const { average, count } = combineReviewSummary(getSampleReviews(product), actual?.key === key ? actual : {})
  return <span className="sample-rating" aria-label={`별점 ${average.toFixed(1)}점, 후기 ${count}개`}>
    <Stars rating={average.toFixed(1)} count={count} />
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
