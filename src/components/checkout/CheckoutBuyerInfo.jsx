import Icon from '../Icon'

export default function CheckoutBuyerInfo({
  user, values, onChange, sameAsMember, onSameToggle, onAddressSearch,
  expanded, complete, onExpandedToggle,
}) {
  const shippingField = (name, options = {}) => ({
    value: values[name] || '',
    onChange: (event) => onChange(name, event.target.value),
    readOnly: options.alwaysEditable ? false : sameAsMember,
  })

  return (
    <section className="checkout-section checkout-buyer" aria-labelledby="checkout-buyer-title">
      <div className="checkout-section-head">
        <h2 id="checkout-buyer-title"><span>2</span>주문자 · 배송 정보</h2>
        <div className="checkout-section-controls">
          {complete && <small className="checkout-section-complete"><Icon name="check" size={13} /> 입력 완료</small>}
          <button
            type="button"
            className={`checkout-section-toggle${expanded ? ' open' : ''}`}
            onClick={onExpandedToggle}
            aria-expanded={expanded}
            aria-controls="checkout-buyer-content"
            aria-label={expanded ? '주문자 배송 정보 접기' : '주문자 배송 정보 펼치기'}
          >
            <Icon name="chevron-down" size={18} />
          </button>
        </div>
      </div>

      {expanded ? (
        <div id="checkout-buyer-content">
          <div className="checkout-orderer-summary" aria-label="주문자 정보">
            <div><span>주문자</span><strong>{user?.name || 'CareMarket 회원'}</strong></div>
            <div><span>이메일</span><strong>{user?.email || '-'}</strong></div>
          </div>

          <div className="checkout-shipping-head">
            <h3>배송지</h3>
            <label className="checkout-same">
              <input
                type="checkbox"
                checked={sameAsMember}
                onChange={(event) => onSameToggle(event.target.checked)}
              />
              회원정보와 동일
            </label>
          </div>

          <div className="checkout-form-grid">
            <div className="field">
              <label htmlFor="checkout-name">받는 분</label>
              <input id="checkout-name" name="name" autoComplete="name" maxLength={100} required {...shippingField('name')} />
            </div>
            <div className="field">
              <label htmlFor="checkout-phone">연락처</label>
              <input id="checkout-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={30} placeholder="010-0000-0000" required {...shippingField('phone')} />
            </div>
            <div className="field checkout-postal-field">
              <label htmlFor="checkout-postal">우편번호</label>
              <div className="checkout-address-search">
                <input id="checkout-postal" name="postalCode" autoComplete="postal-code" maxLength={20} placeholder="우편번호" required {...shippingField('postalCode')} />
                <button type="button" className="btn btn-ghost btn-sm" onClick={onAddressSearch} disabled={sameAsMember}>주소 찾기</button>
              </div>
            </div>
            <div className="field checkout-address">
              <label htmlFor="checkout-address">주소</label>
              <input id="checkout-address" name="address" autoComplete="street-address" maxLength={300} placeholder="배송받을 주소를 입력해 주세요" required {...shippingField('address')} />
            </div>
            <div className="field checkout-address">
              <label htmlFor="checkout-address-detail">상세주소</label>
              <input id="checkout-address-detail" name="addressDetail" autoComplete="address-line2" maxLength={200} placeholder="상세주소를 입력해 주세요" {...shippingField('addressDetail')} />
            </div>
            <div className="field checkout-address">
              <label htmlFor="checkout-delivery-request">배송 요청사항 <small>선택</small></label>
              <input id="checkout-delivery-request" name="deliveryRequest" maxLength={200} placeholder="예: 문 앞에 놓아주세요" {...shippingField('deliveryRequest', { alwaysEditable: true })} />
            </div>
          </div>
          {sameAsMember ? (
            <p className="checkout-same-hint">저장된 회원 배송지를 사용합니다. 다른 곳으로 받으려면 체크를 해제해 주세요.</p>
          ) : (
            <p className="checkout-same-hint">입력한 배송지는 이번 주문에만 저장됩니다.</p>
          )}
        </div>
      ) : (
        <button type="button" className="checkout-buyer-summary" onClick={onExpandedToggle}>
          <strong>{values.name} · {values.phone}</strong>
          <span>{values.postalCode && `[${values.postalCode}] `}{values.address} {values.addressDetail}</span>
        </button>
      )}
    </section>
  )
}
