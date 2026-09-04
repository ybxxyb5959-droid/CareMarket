import ProductImage from '../ProductImage'
import { won } from '../../lib/format'

export default function CheckoutOrderItems({ cart }) {
  return (
    <section className="checkout-section checkout-order" aria-labelledby="checkout-order-title">
      <div className="checkout-section-head">
        <h2 id="checkout-order-title"><span>1</span>주문 상품</h2>
        <small>총 {cart.reduce((sum, item) => sum + item.quantity, 0)}개</small>
      </div>
      <div className="checkout-items">
        {cart.map(({ product, quantity }) => (
          <div className="checkout-item" key={product.id}>
            <div className="checkout-product-thumb">
              <ProductImage src={product.image} alt={product.name} className="checkout-product-image" />
            </div>
            <div className="checkout-item-info">
              <span className="checkout-item-brand">{product.brand}</span>
              <strong>{product.name}</strong>
              {product.nutrition?.servingSize &&
                product.nutrition.servingSize !== '1회 제공량 정보 없음' && (
                  <small>{product.nutrition.servingSize}</small>
                )}
            </div>
            <div className="checkout-item-price">
              <span>수량 {quantity}개</span>
              <strong>{won(product.price * quantity)}</strong>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
