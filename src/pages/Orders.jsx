import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { supabase } from '../lib/supabase'
import { fetchMyOrders } from '../lib/orders'
import Icon from '../components/Icon'
import ProductImage from '../components/ProductImage'
import { won } from '../lib/format'

const STATUS_LABELS = {
  paid: '결제완료',
  preparing: '상품준비중',
  shipped: '배송중',
  delivered: '배송완료',
}

function dateText(value) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(value))
}

export default function Orders() {
  const { authUserId, authLoading, navigate } = useStore()
  const [state, setState] = useState({ ownerId: null, rows: [], loading: false, error: null })
  const visible = state.ownerId === authUserId ? state : { rows: [], loading: Boolean(authUserId), error: null }

  useEffect(() => {
    let active = true
    if (!authUserId) return undefined

    const load = async () => {
      setState({ ownerId: authUserId, rows: [], loading: true, error: null })
      try {
        const rows = await fetchMyOrders(supabase, authUserId)
        if (active) setState({ ownerId: authUserId, rows, loading: false, error: null })
      } catch (error) {
        console.error('Supabase orders fetch failed:', { code: error?.code || 'ORDERS_FETCH_FAILED' })
        if (active) setState({ ownerId: authUserId, rows: [], loading: false, error: '주문내역을 불러오지 못했습니다.' })
      }
    }
    void load()
    return () => { active = false }
  }, [authUserId])

  if (authLoading || visible.loading) {
    return <div className="wrap page page-narrow"><div className="empty" role="status"><Icon name="package" size={42} /><h3>주문내역을 불러오고 있습니다.</h3></div></div>
  }

  if (!authUserId) {
    return <div className="wrap page page-narrow"><div className="empty"><Icon name="package" size={42} /><h3>로그인이 필요한 페이지입니다.</h3><button className="btn btn-primary" onClick={() => navigate('login')}>로그인하기</button></div></div>
  }

  return (
    <div className="wrap page">
      <div className="page-mid" style={{ margin: '0 auto' }}>
        <div className="page-head">
          <div><h1 className="page-title">주문 · 배송 내역</h1><p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>결제가 완료된 주문을 확인할 수 있습니다.</p></div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('main')}>쇼핑 계속하기 →</button>
        </div>

        {visible.error && <div className="cart-status" role="alert">{visible.error}</div>}
        {!visible.error && visible.rows.length === 0 && <div className="empty"><Icon name="package" size={42} /><h3>아직 완료된 주문이 없습니다.</h3><button className="btn btn-primary" onClick={() => navigate('main')}>상품 둘러보기</button></div>}
        {visible.rows.map((order) => (
          <div key={order.order_id} className="order-card">
            <div className="order-top">
              <div className="order-id"><b>{order.toss_order_id || order.order_id}</b><span>· {dateText(order.created_at)}</span></div>
              <span className={`status ${order.status === 'delivered' ? 'status-done' : 'status-active'}`}>{STATUS_LABELS[order.status] || order.status}</span>
            </div>
            <div className="order-lines">
              {order.items.map((item) => (
                <div key={`${order.order_id}-${item.product_id}`} className="order-line">
                  <ProductImage src={item.product?.image_url || item.product?.image} alt="" />
                  <span className="nm">{item.product?.name || '판매 종료 상품'} <span>수량 {item.quantity}개</span></span>
                  <b>{won(item.price_at_order * item.quantity)}</b>
                </div>
              ))}
            </div>
            <div className="order-foot">
              <details className="order-detail">
                <summary>주문 상세 <Icon name="chevron-down" size={14} /></summary>
                <div className="order-detail-body">
                  <div><span>받는 분</span><strong>{order.recipient_name || '이전 주문 정보 없음'}</strong></div>
                  <div><span>연락처</span><strong>{order.recipient_phone || '-'}</strong></div>
                  <div className="order-detail-address"><span>배송지</span><strong>{order.address ? `${order.postal_code ? `(${order.postal_code}) ` : ''}${order.address}${order.address_detail ? ` ${order.address_detail}` : ''}` : '이전 주문 정보 없음'}</strong></div>
                  <div className="order-detail-address"><span>배송 요청사항</span><strong>{order.delivery_request || '없음'}</strong></div>
                </div>
              </details>
              <span className="order-total">결제금액 {won(order.total_price)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
