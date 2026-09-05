import Icon from '../Icon'
import { won } from '../../lib/format'

export default function CheckoutSummary({ cartTotal, deliveryFee, cartCount, totalOverride = null, disabled, submitting }) {
  const total = totalOverride ?? cartTotal + deliveryFee
  return (
    <>
      <aside className="summary checkout-summary" aria-labelledby="checkout-summary-title" aria-live="polite">
        <div className="checkout-summary-head">
          <h2 id="checkout-summary-title">주문 요약</h2>
          <span>{cartCount}개 상품</span>
        </div>
        <div className="sum-row"><span>상품금액</span><b>{won(cartTotal)}</b></div>
        <div className="sum-row"><span>배송비</span><b>{deliveryFee === 0 ? '무료' : won(deliveryFee)}</b></div>
        <div className={`checkout-delivery-note${deliveryFee === 0 ? ' complete' : ''}`}>
          <Icon name={deliveryFee === 0 ? 'check' : 'truck'} size={14} />
          {deliveryFee === 0 ? '무료배송이 적용됐어요' : '상품금액 40,000원 이상 무료배송'}
        </div>
        <div className="sum-total">
          <span className="lbl">최종 결제금액</span>
          <span className="val">{won(total)}</span>
        </div>
        <button type="submit" className="btn btn-primary btn-lg btn-block checkout-pay-button" disabled={disabled}>
          <Icon name="credit-card" size={17} /> {submitting ? '결제 준비 중…' : `${won(total)} 결제하기`}
        </button>
        <div className="checkout-summary-notes">
          <p><Icon name="shield-check" size={14} /> 토스페이먼츠를 통해 안전하게 결제됩니다.</p>
          <p><Icon name="check-circle" size={14} /> 결제 완료 후 주문내역에서 확인할 수 있습니다.</p>
        </div>
      </aside>
      <div className="checkout-mobile-pay" aria-label="모바일 결제 요약">
        <div><span>최종 결제금액</span><strong>{won(total)}</strong></div>
        <button type="submit" form="checkout-form" className="btn btn-primary" disabled={disabled}>
          {submitting ? '준비 중…' : '결제하기'}
        </button>
      </div>
    </>
  )
}
