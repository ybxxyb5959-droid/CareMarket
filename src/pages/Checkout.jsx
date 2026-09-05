import { useCallback, useMemo, useRef, useState } from 'react'
import { useStore } from '../store'
import Icon from '../components/Icon'
import CheckoutOrderItems from '../components/checkout/CheckoutOrderItems'
import CheckoutBuyerInfo from '../components/checkout/CheckoutBuyerInfo'
import CheckoutPaymentMethods from '../components/checkout/CheckoutPaymentMethods'
import CheckoutSummary from '../components/checkout/CheckoutSummary'
import { supabase } from '../lib/supabase'
import {
  checkoutRequestErrorMessage,
  createCheckoutOrder,
  isCheckoutShippingComplete,
  memberCheckoutShipping,
  shippingForMemberToggle,
} from '../lib/payments'
import { openPostcode } from '../lib/postcode'

export default function Checkout() {
  const { authUserId, isLoggedIn, profileLoading, profile, user } = useStore()
  if (isLoggedIn && profileLoading) {
    return (
      <div className="wrap page page-narrow">
        <div className="empty" role="status">
          <Icon name="user" size={42} />
          <h3>회원 배송정보를 불러오고 있습니다.</h3>
        </div>
      </div>
    )
  }
  const profileKey = [
    authUserId || 'guest',
    user?.name || '',
    profile?.phone || '',
    profile?.postalCode || '',
    profile?.address || '',
    profile?.addressDetail || '',
  ].join(':')
  return <CheckoutContent key={profileKey} />
}

function CheckoutContent() {
  const {
    cart,
    cartTotal,
    deliveryFee,
    cartLoading,
    cartPending,
    cartError,
    user,
    profile,
    isLoggedIn,
    authUserId,
    navigate,
    showToast,
    reloadCart,
  } = useStore()
  const memberShipping = useMemo(
    () => memberCheckoutShipping(user, profile),
    [user, profile],
  )
  const [sameAsMember, setSameAsMember] = useState(true)
  const [shipping, setShipping] = useState(memberShipping)
  const [buyerInfoOpen, setBuyerInfoOpen] = useState(() => !isCheckoutShippingComplete(memberShipping))
  const [widgets, setWidgets] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [serverTotal, setServerTotal] = useState(null)
  const [paymentError, setPaymentError] = useState('')
  const submittingRef = useRef(false)
  const onWidgetsReady = useCallback((next) => setWidgets(next), [])

  const applyShipping = (nextShipping) => {
    const wasComplete = isCheckoutShippingComplete(shipping)
    const complete = isCheckoutShippingComplete(nextShipping)
    setShipping(nextShipping)
    if (!complete) setBuyerInfoOpen(true)
    else if (!wasComplete) setBuyerInfoOpen(false)
  }
  const updateShipping = (name, value) => applyShipping({ ...shipping, [name]: value })
  const toggleSameAsMember = (checked) => {
    setSameAsMember(checked)
    applyShipping(shippingForMemberToggle(shipping, memberShipping, checked))
  }
  const findAddress = async () => {
    try {
      await openPostcode(({ zonecode, address }) => {
        applyShipping({ ...shipping, postalCode: zonecode, address })
      })
    } catch {
      showToast('주소 검색을 불러오지 못했습니다. 주소를 직접 입력해 주세요.')
    }
  }
  const submitCheckout = async () => {
    if (!isLoggedIn || !cart.length || cartLoading || cartPending || cartError || !widgets || submittingRef.current) return
    if (!isCheckoutShippingComplete(shipping)) {
      setBuyerInfoOpen(true)
      setPaymentError('주문자와 배송 정보를 모두 입력해 주세요.')
      return
    }
    submittingRef.current = true
    setSubmitting(true)
    setPaymentError('')

    try {
      const order = await createCheckoutOrder(supabase, shipping)
      setServerTotal(order.total_price)
      const displayedTotal = cartTotal + deliveryFee
      if (order.total_price !== displayedTotal) {
        await widgets.setAmount({ currency: 'KRW', value: order.total_price })
        const message = '결제금액이 변경되었습니다. 변경된 금액을 확인한 뒤 다시 결제해 주세요.'
        setPaymentError(message)
        showToast(message)
        return
      }
      await widgets.requestPayment({
        orderId: order.toss_order_id,
        orderName: order.order_name,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
        customerEmail: user.email || undefined,
        customerName: shipping.name.trim() || user.name,
      })
    } catch (error) {
      console.error('Checkout payment request failed:', { code: error?.code || error?.name || 'PAYMENT_REQUEST_FAILED' })
      const message = checkoutRequestErrorMessage(error)
      setPaymentError(message)
      showToast(message)
      setServerTotal(null)
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  if (isLoggedIn && cart.length === 0 && (cartLoading || cartError)) {
    return (
      <div className="wrap page page-narrow">
        <div className="empty" role={cartError ? 'alert' : 'status'}>
          <Icon name={cartError ? 'alert-circle' : 'cart'} size={42} />
          <h3>{cartError ? '주문 상품을 확인할 수 없습니다.' : '주문 상품을 불러오고 있습니다.'}</h3>
          {cartError && <><p>{cartError}</p><button className="btn btn-primary" onClick={reloadCart}>다시 불러오기</button></>}
        </div>
      </div>
    )
  }

  if (!isLoggedIn || cart.length === 0) {
    return (
      <div className="wrap page page-narrow">
        <div className="empty">
          <Icon name="cart" size={42} />
          <h3>{isLoggedIn ? '결제할 상품이 없습니다.' : '로그인이 필요한 페이지입니다.'}</h3>
          <p>{isLoggedIn ? '상품을 장바구니에 담은 뒤 결제를 진행해 주세요.' : '로그인 후 장바구니에서 결제를 진행해 주세요.'}</p>
          <button className="btn btn-primary" onClick={() => navigate(isLoggedIn ? 'main' : 'login')}>{isLoggedIn ? '상품 둘러보기' : '로그인하기'}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="wrap page checkout-page">
      <nav className="checkout-progress" aria-label="결제 진행 단계">
        <button type="button" onClick={() => navigate('cart')}>장바구니</button><Icon name="chevron-right" size={13} />
        <strong aria-current="step">주문/결제</strong><Icon name="chevron-right" size={13} />
        <span>결제완료</span>
      </nav>
      <div className="page-head checkout-page-head">
        <div><h1 className="page-title">주문/결제</h1><p>주문 정보를 확인하고 결제를 진행해 주세요.</p></div>
      </div>
      {cartError && <div className="cart-status" role="alert">{cartError}</div>}
      {paymentError && <div className="cart-status" role="alert">{paymentError}</div>}
      <div className="checkout-layout">
        <div className="checkout-main">
          <CheckoutOrderItems cart={cart} />
          <CheckoutBuyerInfo
            user={user}
            values={shipping}
            onChange={updateShipping}
            sameAsMember={sameAsMember}
            onSameToggle={toggleSameAsMember}
            onAddressSearch={findAddress}
            expanded={buyerInfoOpen}
            complete={isCheckoutShippingComplete(shipping)}
            onExpandedToggle={() => setBuyerInfoOpen((current) => !current)}
          />
          <CheckoutPaymentMethods customerKey={authUserId} amount={cartTotal + deliveryFee} onReady={onWidgetsReady} />
        </div>
        <CheckoutSummary cartTotal={cartTotal} deliveryFee={deliveryFee} cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)} totalOverride={serverTotal} disabled={cartLoading || cartPending > 0 || Boolean(cartError) || !widgets || submitting} submitting={submitting} onPay={submitCheckout} />
      </div>
    </div>
  )
}
