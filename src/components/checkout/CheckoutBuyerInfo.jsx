export default function CheckoutBuyerInfo({ user, values, onChange }) {
  const field = (name) => ({
    value: values[name],
    onChange: (event) => onChange(name, event.target.value),
  })

  return (
    <section className="checkout-section checkout-buyer" aria-labelledby="checkout-buyer-title">
      <div className="checkout-section-head">
        <h2 id="checkout-buyer-title"><span>2</span>주문자 / 배송 정보</h2>
      </div>
      <div className="checkout-form-grid">
        <div className="field">
          <label htmlFor="checkout-name">받는 분</label>
          <input id="checkout-name" name="name" autoComplete="name" required {...field('name')} />
        </div>
        <div className="field">
          <label htmlFor="checkout-email">이메일</label>
          <input id="checkout-email" type="email" value={user?.email || ''} readOnly aria-readonly="true" />
        </div>
        <div className="field">
          <label htmlFor="checkout-phone">연락처</label>
          <input id="checkout-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="연락처를 입력해 주세요" required {...field('phone')} />
        </div>
        <div className="field checkout-address">
          <label htmlFor="checkout-address">주소</label>
          <input id="checkout-address" name="address" autoComplete="street-address" placeholder="배송받을 주소를 입력해 주세요" required {...field('address')} />
        </div>
        <div className="field checkout-address">
          <label htmlFor="checkout-address-detail">상세주소</label>
          <input id="checkout-address-detail" name="addressDetail" autoComplete="address-line2" placeholder="상세주소를 입력해 주세요" {...field('addressDetail')} />
        </div>
      </div>
    </section>
  )
}
