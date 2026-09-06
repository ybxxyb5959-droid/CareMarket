import { useStore } from '../store'
import Icon from './Icon'
import ProductImage from './ProductImage'
import { won } from '../lib/format'

const MAX_PREVIEW_ITEMS = 3

export default function WishlistQuickPanel() {
  const { wishlist, products, navigate, openProduct, toggleWish, addToCart } = useStore()
  const wishedProducts = wishlist
    .map((id) => products.find((product) => product.id === id))
    .filter(Boolean)

  if (!wishlist.length || !wishedProducts.length) return null

  const previewProducts = wishedProducts.slice(0, MAX_PREVIEW_ITEMS)
  const hiddenCount = Math.max(0, wishlist.length - previewProducts.length)

  return (
    <aside className="wishlist-quick" aria-label={`찜한 상품 요약 ${wishlist.length}개`}>
      <div className="wishlist-quick-head">
        <div>
          <span className="wishlist-quick-icon"><Icon name="heart" size={15} fill="currentColor" /></span>
          <strong>찜한 상품</strong>
          <small>{wishlist.length}</small>
        </div>
      </div>

      <div className="wishlist-quick-list">
        {previewProducts.map((product) => (
          <article key={product.id} className="wishlist-quick-item">
            <button type="button" className="wishlist-quick-media" onClick={() => openProduct(product)} aria-label={`${product.name} 상세보기`}>
              <ProductImage src={product.image} alt="" />
            </button>
            <div className="wishlist-quick-info">
              <span>{product.brand}</span>
              <button type="button" className="wishlist-quick-name" onClick={() => openProduct(product)}>{product.name}</button>
              <strong>{won(product.price)}</strong>
              <button type="button" className="wishlist-quick-remove" onClick={() => toggleWish(product.id)} aria-label={`${product.name} 찜 해제`}>
                <Icon name="heart" size={13} fill="currentColor" /> 찜 해제
              </button>
            </div>
            <button type="button" className="wishlist-quick-cart" onClick={() => addToCart(product, 1)} aria-label={`${product.name} 장바구니 담기`}>
              <Icon name="cart" size={16} />
            </button>
          </article>
        ))}
      </div>

      <button type="button" className="wishlist-quick-more" onClick={() => navigate('wishlist')}>
        {hiddenCount ? `${hiddenCount}개 상품 더보기` : '찜한 상품 전체보기'}
        <Icon name="chevron-right" size={14} />
      </button>
    </aside>
  )
}
