import { useStore } from '../store'
import { discountRate, won } from '../lib/format'
import ProductImage from './ProductImage'

export default function DealProductCard({ product }) {
  const { openProduct } = useStore()

  return (
    <article className="deal-product" onClick={() => openProduct(product)}>
      <div className="deal-product-media">
        <ProductImage src={product.image} alt={product.name} />
      </div>
      <div className="deal-product-info">
        {product.brand && <span className="deal-product-brand">{product.brand}</span>}
        <h3>{product.name}</h3>
        <div className="deal-product-price">
          <span className="deal-discount">{discountRate(product.originalPrice, product.price)}%</span>
          <span className="deal-original">{won(product.originalPrice)}</span>
          <strong>{won(product.price)}</strong>
        </div>
      </div>
    </article>
  )
}
