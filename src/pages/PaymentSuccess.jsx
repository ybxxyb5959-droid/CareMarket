import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import { supabase } from '../lib/supabase'
import { confirmPayment, paymentErrorMessage } from '../lib/payments'
import { won } from '../lib/format'
import Icon from '../components/Icon'

export default function PaymentSuccess() {
  const { authUserId, authLoading, navigate, reloadCart, reloadProducts } = useStore()
  const [result, setResult] = useState({ state: 'loading' })
  const [retry, setRetry] = useState(0)
  const requestRef = useRef(null)

  useEffect(() => {
    if (authLoading || !authUserId) return undefined
    let active = true
    const params = new URLSearchParams(window.location.search)
    const input = {
      paymentKey: params.get('paymentKey'),
      orderId: params.get('orderId'),
      amount: Number(params.get('amount')),
    }
    const requestId = `${authUserId}:${input.orderId}:${retry}`
    if (requestRef.current?.id !== requestId) {
      requestRef.current = { id: requestId, promise: confirmPayment(supabase, input) }
    }

    requestRef.current.promise.then((data) => {
      if (!active) return
      if (data?.code === 'PAYMENT_CONFIRMED') {
        setResult({ state: 'success', data })
        void reloadCart()
        reloadProducts()
      } else {
        setResult({ state: 'pending', data })
      }
    }).catch((error) => {
      if (active) setResult({ state: 'error', code: error.message })
    })
    return () => { active = false }
    // Store refresh callbacks do not change the payment being confirmed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId, authLoading, retry])

  const success = result.state === 'success'
  const needsLogin = !authLoading && !authUserId
  const loading = !needsLogin && result.state === 'loading'

  return (
    <div className="wrap page page-narrow">
      <div className="empty" role={result.state === 'error' ? 'alert' : 'status'}>
        <Icon name={success ? 'check-circle' : loading ? 'credit-card' : 'alert-circle'} size={42} />
        <h2>{success ? '결제가 완료되었어요' : needsLogin ? '로그인 상태를 확인해 주세요' : loading ? '결제를 확인하고 있습니다' : result.state === 'pending' ? '결제가 아직 완료되지 않았어요' : '결제 확인이 필요해요'}</h2>
        {success ? (
          <><p>{result.data.orderId}</p><p>총 결제금액 {won(result.data.totalPrice)}</p></>
        ) : (
          <p>{needsLogin ? '로그인 후 결제를 다시 확인해 주세요.' : loading ? '승인이 완료될 때까지 잠시 기다려 주세요.' : result.state === 'pending' ? '입금 대기 등 결제 완료 전 상태입니다. 주문은 아직 확정되지 않았습니다.' : paymentErrorMessage(result.code)}</p>
        )}
        {!loading && (
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 10 }}>
            <button className="btn btn-primary" onClick={() => navigate(needsLogin ? 'login' : success ? 'orders' : 'cart')}>{needsLogin ? '로그인하기' : success ? '주문내역 확인' : '장바구니로 돌아가기'}</button>
            {result.state === 'error' && <button className="btn btn-ghost" onClick={() => { setResult({ state: 'loading' }); setRetry((value) => value + 1) }}>다시 확인하기</button>}
          </div>
        )}
      </div>
    </div>
  )
}
