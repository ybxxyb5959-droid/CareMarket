import { useStore } from '../store'
import { won } from '../lib/format'
import { getDailyDealPricing, getLocalDateKey } from '../lib/deals'
import ProductImage from './ProductImage'
import { SampleRating } from './Stars'

export default function DealProductCard({ product }) {
  const { openProduct } = useStore()
  const pricing = getDailyDealPricing(product, getLocalDateKey())

  return (
    <article className="deal-product" onClick={() => openProduct(product)}>
      <div className="deal-product-media">
        <span className="deal-badge">오늘만 한 번 더 ↓</span>
        <ProductImage src={product.image} alt={product.name} />
      </div>
      <div className="deal-product-info">
        {product.brand && <span className="deal-product-brand">{product.brand}</span>}
        <h3>{product.name}</h3>
        <SampleRating product={product} />
        <div className="deal-product-price">
          <div className="deal-price-history" aria-label={`정상가 ${won(pricing.originalPrice)}, 평소 판매가 ${won(pricing.regularPrice)}`}>
            <span>정상가 <del>{won(pricing.originalPrice)}</del></span>
            <i aria-hidden="true">→</i>
            <span>판매가 <del>{won(pricing.regularPrice)}</del></span>
          </div>
          <div className="deal-price-now">
            <strong>{pricing.todayPrice.toLocaleString('ko-KR')}<small>원</small></strong>
            <span className="deal-discount">총 {pricing.totalRate}%</span>
          </div>
          <p className="deal-extra-cut">판매가에서 <b>추가 {pricing.extraRate}%</b> 할인</p>
        </div>
      </div>
    </article>
  )
}
