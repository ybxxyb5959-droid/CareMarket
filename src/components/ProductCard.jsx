import { useStore } from '../store'
import Icon from './Icon'
import GoalBadge from './GoalBadge'
import ProductImage from './ProductImage'
import { discountRate, won } from '../lib/format'

export default function ProductCard({ product, compareSelected = false, onCompareToggle = null }) {
  const { goal, wishlist, toggleWish, addToCart, openProduct } = useStore()
  const wished = wishlist.includes(product.id)

  return (
    <article className="card">
      <div className="card-media" onClick={() => openProduct(product)}>
        <ProductImage src={product.image} alt={product.name} />
        {onCompareToggle && (
          <button
            type="button"
            className={`card-compare${compareSelected ? ' on' : ''}`}
            onClick={(event) => { event.stopPropagation(); onCompareToggle(product.id) }}
            aria-pressed={compareSelected}
          >
            <span className="card-compare-box">{compareSelected && <Icon name="check" size={12} strokeWidth={2.8} />}</span>
            비교
          </button>
        )}
        <button
          className="card-wish"
          onClick={(e) => { e.stopPropagation(); toggleWish(product.id) }}
          aria-label="위시리스트"
          style={wished ? { color: 'var(--danger)' } : undefined}
        >
          <Icon name="heart" size={17} fill={wished ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="card-body">
        <div className="card-top"><span className="card-brand">{product.brand}</span></div>

        <h3 className="card-name" onClick={() => openProduct(product)}>{product.name}</h3>

        <span className="card-origin">
          <Icon name="leaf" size={13} />
          <span>{product.origin}</span>
        </span>

        <div className="card-price">
          <div className="orig">{won(product.originalPrice)}</div>
          <div className="now">
            <span className="disc">{discountRate(product.originalPrice, product.price)}%</span>
            <span className="amt">{won(product.price)}</span>
          </div>
        </div>

        <GoalBadge goal={goal} product={product} />

        <div className="card-actions">
          <button className="card-add" onClick={() => addToCart(product, 1)} aria-label="장바구니 담기">
            <Icon name="cart" size={18} />
            <span>담기</span>
          </button>
        </div>
      </div>
    </article>
  )
}
