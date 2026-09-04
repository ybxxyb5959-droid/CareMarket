import Icon from '../Icon'
import { won } from '../../lib/format'

export default function CheckoutSummary({ cartTotal, deliveryFee, totalOverride = null, disabled }) {
  const total = totalOverride ?? cartTotal + deliveryFee
  return (
    <aside className="summary checkout-summary" aria-labelledby="checkout-summary-title">
      <h2 id="checkout-summary-title">4. 주문 요약</h2>
      <div className="sum-row"><span>상품 금액</span><b>{won(cartTotal)}</b></div>
      <div className="sum-row"><span>배송비</span><b>{won(deliveryFee)}</b></div>
      <div className="sum-total">
        <span className="lbl">총 결제금액</span>
        <span className="val">{won(total)}</span>
      </div>
      <button type="submit" className="btn btn-primary btn-lg btn-block checkout-pay-button" disabled={disabled}>
        <Icon name="credit-card" size={17} /> {won(total)} 결제하기
      </button>
      <div className="checkout-summary-notes">
        <p><Icon name="shield-check" size={14} /> 토스페이먼츠를 통해 결제가 진행됩니다.</p>
        <p><Icon name="check-circle" size={14} /> 결제 완료 후 주문내역에서 확인할 수 있습니다.</p>
      </div>
    </aside>
  )
}
