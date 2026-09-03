import { useStore } from '../store'
import Icon from './Icon'
import Stars from './Stars'
import GoalBadge from './GoalBadge'
import ProductImage from './ProductImage'
import { discountRate, won } from '../lib/format'

export default function ProductCard({ product }) {
  const { goal, wishlist, toggleWish, addToCart, openProduct } = useStore()
  const wished = wishlist.includes(product.id)

  return (
    <article className="card">
      <div className="card-media" onClick={() => openProduct(product)}>
        <ProductImage src={product.image} alt={product.name} />
        <div className="card-badges">
          {product.isBest && <span className="tag tag-best">BEST</span>}
          {product.isNew && <span className="tag tag-new">NEW</span>}
          <span className="tag tag-clean">{product.cleanScore}</span>
        </div>
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
        <div className="card-top">
          <span className="card-brand">{product.brand}</span>
          <Stars rating={product.rating} count={product.reviewCount} />
        </div>

        <h3 className="card-name" onClick={() => openProduct(product)}>{product.name}</h3>

        <span className="card-origin">
          <Icon name="leaf" size={13} />
          <span>{product.origin}</span>
        </span>

        <GoalBadge goal={goal} product={product} />

        <div className="card-foot">
          <div className="card-price">
            <div className="orig">{won(product.originalPrice)}</div>
            <div className="now">
              <span className="disc">{discountRate(product.originalPrice, product.price)}%</span>
              <span className="amt">{won(product.price)}</span>
            </div>
          </div>
          <button className="card-add" onClick={() => addToCart(product, 1)} aria-label="장바구니 담기">
            <Icon name="cart" size={18} />
          </button>
        </div>
      </div>
    </article>
  )
}
