import { useEffect, useRef, useState } from 'react'
import { loadTossPayments } from '@tosspayments/tosspayments-sdk'
import Icon from '../Icon'

export default function CheckoutPaymentMethods({ customerKey, amount, onReady }) {
  const [status, setStatus] = useState('loading')
  const widgetsRef = useRef(null)
  const amountRef = useRef(amount)

  useEffect(() => {
    let active = true
    let paymentMethods
    let agreement

    const initialize = async () => {
      onReady(null)
      const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY
      if (!clientKey?.startsWith('test_') || !customerKey) {
        setStatus('unavailable')
        return
      }

      try {
        const tossPayments = await loadTossPayments(clientKey)
        if (!active) return
        const widgets = tossPayments.widgets({ customerKey })
        await widgets.setAmount({ currency: 'KRW', value: amountRef.current })
        if (!active) return
        paymentMethods = await widgets.renderPaymentMethods({ selector: '#payment-methods' })
        if (!active) {
          await paymentMethods.destroy()
          return
        }
        agreement = await widgets.renderAgreement({ selector: '#payment-agreement' })
        if (!active) {
          await paymentMethods.destroy()
          await agreement.destroy()
          return
        }
        widgetsRef.current = widgets
        onReady(widgets)
        setStatus('ready')
      } catch (error) {
        console.error('Toss widget initialization failed:', { code: error?.code || error?.name || 'WIDGET_INIT_FAILED' })
        if (active) setStatus('error')
      }
    }

    void initialize()
    return () => {
      active = false
      widgetsRef.current = null
      onReady(null)
      void paymentMethods?.destroy()
      void agreement?.destroy()
    }
  }, [customerKey, onReady])

  useEffect(() => {
    amountRef.current = amount
    if (!widgetsRef.current) return
    void widgetsRef.current.setAmount({ currency: 'KRW', value: amount }).catch((error) => {
      console.error('Toss widget amount update failed:', { code: error?.code || error?.name || 'WIDGET_AMOUNT_FAILED' })
      onReady(null)
      setStatus('error')
    })
  }, [amount, onReady])

  return (
    <section className="checkout-section checkout-payment" aria-labelledby="checkout-payment-title">
      <div className="checkout-section-head">
        <h2 id="checkout-payment-title"><span>3</span>결제수단</h2>
      </div>
      <div id="payment-methods" className="payment-methods-mount" data-provider="toss-payments-v2" />
      {status !== 'ready' && (
        <p className="checkout-trust" role={status === 'loading' ? 'status' : 'alert'}>
          {status === 'loading' ? '결제수단을 불러오고 있습니다.' : '결제수단을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'}
        </p>
      )}
      <div id="payment-agreement" />
      <p className="checkout-trust"><Icon name="shield-check" size={15} /> 토스페이먼츠를 통해 결제가 진행됩니다.</p>
    </section>
  )
}
