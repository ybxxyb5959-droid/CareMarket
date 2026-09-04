import { useCallback, useRef, useState } from 'react'
import { useStore } from '../store'
import Icon from '../components/Icon'
import CheckoutOrderItems from '../components/checkout/CheckoutOrderItems'
import CheckoutBuyerInfo from '../components/checkout/CheckoutBuyerInfo'
import CheckoutPaymentMethods from '../components/checkout/CheckoutPaymentMethods'
import CheckoutSummary from '../components/checkout/CheckoutSummary'
import { supabase } from '../lib/supabase'
import { createCheckoutOrder } from '../lib/payments'

export default function Checkout() {
  const { user } = useStore()
  return <CheckoutContent key={`${user?.email || 'guest'}:${user?.name || ''}`} />
}

function CheckoutContent() {
  const {
    cart, cartTotal, deliveryFee, cartLoading, cartPending, cartError,
    user, isLoggedIn, authUserId, navigate, showToast, reloadCart,
  } = useStore()
  const [shipping, setShipping] = useState({ name: user?.name || '', phone: '', address: '', addressDetail: '' })
  const [widgets, setWidgets] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [serverTotal, setServerTotal] = useState(null)
  const submittingRef = useRef(false)
  const onWidgetsReady = useCallback((next) => setWidgets(next), [])

  const updateShipping = (name, value) => setShipping((current) => ({ ...current, [name]: value }))
  const submitCheckout = async (event) => {
    event.preventDefault()
    if (!isLoggedIn || !cart.length || cartLoading || cartPending || cartError || !widgets || submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)

    try {
      const order = await createCheckoutOrder(supabase)
      setServerTotal(order.total_price)
      await widgets.setAmount({ currency: 'KRW', value: order.total_price })
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
      showToast('결제를 진행하지 못했습니다. 결제수단·약관과 장바구니 재고를 확인해 주세요.')
      setServerTotal(null)
      void reloadCart()
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  if (isLoggedIn && (cartLoading || cartError)) {
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
      <form className="checkout-layout" onSubmit={submitCheckout}>
        <div className="checkout-main">
          <CheckoutOrderItems cart={cart} />
          <CheckoutBuyerInfo user={user} values={shipping} onChange={updateShipping} />
          <CheckoutPaymentMethods customerKey={authUserId} amount={cartTotal + deliveryFee} onReady={onWidgetsReady} />
        </div>
        <CheckoutSummary cartTotal={cartTotal} deliveryFee={deliveryFee} totalOverride={serverTotal} disabled={cartLoading || cartPending > 0 || Boolean(cartError) || !widgets || submitting} />
      </form>
    </div>
  )
}
