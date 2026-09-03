import Icon from './Icon'

export default function Stars({ rating, count }) {
  return (
    <span className="stars">
      <Icon name="star" size={13} fill="currentColor" strokeWidth={0} />
      {rating}
      {count != null && <span className="rc">({count.toLocaleString('ko-KR')})</span>}
    </span>
  )
}
