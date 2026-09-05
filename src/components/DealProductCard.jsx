import { useStore } from '../store'
import { discountRate, won } from '../lib/format'
import ProductImage from './ProductImage'

export default function DealProductCard({ product }) {
  const { openProduct } = useStore()
  const rate = discountRate(product.originalPrice, product.price)

  return (
    <article className="deal-product" onClick={() => openProduct(product)}>
      <div className="deal-product-media">
        <span className="deal-badge">오늘 특가</span>
        <ProductImage src={product.image} alt={product.name} />
      </div>
      <div className="deal-product-info">
        {product.brand && <span className="deal-product-brand">{product.brand}</span>}
        <h3>{product.name}</h3>
        <div className="deal-product-price">
          <div className="deal-original">
            <span>기존가</span>
            <del>{won(product.originalPrice)}</del>
          </div>
          <div className="deal-price-now">
            <span className="deal-discount">{rate}%</span>
            <strong>{won(product.price)}</strong>
          </div>
        </div>
      </div>
    </article>
  )
}
