import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { supabase } from '../lib/supabase'
import { fetchMyOrders } from '../lib/orders'
import { fetchMyReviewItems } from '../lib/reviews'
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
  const { authUserId, authLoading, navigate, products, openProduct, openReviewForm, reviewRevision } = useStore()
  const [state, setState] = useState({ ownerId: null, rows: [], loading: false, error: null })
  const [reloadKey, setReloadKey] = useState(0)
  const visible = state.ownerId === authUserId ? state : { rows: [], loading: Boolean(authUserId), error: null }

  useEffect(() => {
    let active = true
    if (!authUserId) return undefined

    const load = async () => {
      setState({ ownerId: authUserId, rows: [], loading: true, error: null })
      try {
        const [orders, reviewItems] = await Promise.all([
          fetchMyOrders(supabase, authUserId),
          fetchMyReviewItems(supabase),
        ])
        const reviewByItem = new Map(reviewItems.map(item => [item.order_item_id, item]))
        const rows = orders.map(order => ({
          ...order,
          items: order.items.map(item => ({ ...item, review: reviewByItem.get(item.order_item_id) || null })),
        }))
        if (active) setState({ ownerId: authUserId, rows, loading: false, error: null })
      } catch (error) {
        console.error('Supabase orders fetch failed:', { code: error?.code || 'ORDERS_FETCH_FAILED' })
        if (active) setState({ ownerId: authUserId, rows: [], loading: false, error: '주문내역을 불러오지 못했습니다.' })
      }
    }
    void load()
    return () => { active = false }
  }, [authUserId, reloadKey, reviewRevision])

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
          <button className="btn btn-text btn-sm" onClick={() => navigate('main')}>쇼핑 계속하기 →</button>
        </div>

        {visible.error ? (
          <div className="empty" role="alert"><Icon name="alert-circle" size={42} /><h3>주문 내역을 불러오지 못했어요.</h3><p>잠시 후 다시 시도해 주세요.</p><button type="button" className="btn btn-primary" onClick={() => setReloadKey((key) => key + 1)}>다시 시도</button></div>
        ) : visible.rows.length === 0 ? (
          <div className="empty"><Icon name="package" size={42} /><h3>아직 주문 내역이 없어요.</h3><p>CareMarket의 상품을 둘러보세요.</p><button className="btn btn-primary" onClick={() => navigate('products')}>상품 둘러보기</button></div>
        ) : visible.rows.map((order) => {
          const subtotal = order.items.reduce((sum, item) => sum + item.price_at_order * item.quantity, 0)
          const discount = Number(order.discount_amount) || 0
          const delivery = Math.max(0, Number(order.total_price) + discount - subtotal)
          return (
          <div key={order.order_id} className="order-card">
            <div className="order-top">
              <div className="order-id"><b>{order.toss_order_id || order.order_id}</b><span>· {dateText(order.created_at)}</span></div>
              <span className={`status ${order.status === 'delivered' ? 'status-done' : 'status-active'}`}>{STATUS_LABELS[order.status] || order.status}</span>
            </div>
            <div className="order-lines">
              {order.items.map((item) => {
                const activeProduct = products.find(product => Number(product.id) === Number(item.product_id))
                const image = <ProductImage src={item.product?.image_url || item.product?.image} alt="" />
                const name = <>{item.product?.name || '판매 종료 상품'} <span>기본 옵션 · 수량 {item.quantity}개</span></>
                return <div key={item.order_item_id} className="order-line">
                  {activeProduct ? <button type="button" className="order-product-link order-product-image-link" onClick={() => openProduct(activeProduct)} aria-label={`${activeProduct.name} 상품 상세 보기`}>{image}</button> : image}
                  {activeProduct ? <button type="button" className="nm order-product-link order-product-name-link" onClick={() => openProduct(activeProduct)}>{name}</button> : <span className="nm">{name}</span>}
                  <b>{won(item.price_at_order * item.quantity)}</b>
                  <span className="order-review-action">
                    {item.review?.reviewed ? <><span className="order-review-complete">작성 완료</span><button type="button" className="btn btn-text btn-sm" onClick={() => openReviewForm(item.review, item.review.review_rating, 'edit')}>내 리뷰 수정</button></>
                      : order.status === 'delivered' && item.review ? <button type="button" className="btn btn-soft btn-sm" onClick={() => openReviewForm(item.review)}>리뷰 작성</button>
                      : null}
                  </span>
                </div>
              })}
            </div>
            <div className="order-foot">
              <details className="order-detail">
                <summary><span className="receipt-open-label">영수증</span><span className="receipt-close-label">영수증 닫기</span></summary>
                <div className="order-detail-body">
                  <div><span>주문번호</span><strong>{order.toss_order_id || order.order_id}</strong></div>
                  <div><span>주문일시</span><strong>{dateText(order.created_at)}</strong></div>
                  <div><span>상품금액</span><strong>{won(subtotal)}</strong></div>
                  <div><span>쿠폰할인</span><strong>{discount > 0 ? `-${won(discount)}` : won(0)}</strong></div>
                  <div><span>배송비</span><strong>{won(delivery)}</strong></div>
                  <div><span>결제금액</span><strong>{won(order.total_price)}</strong></div>
                  <div><span>받는 분</span><strong>{order.recipient_name || '이전 주문 정보 없음'}</strong></div>
                  <div><span>연락처</span><strong>{order.recipient_phone || '-'}</strong></div>
                  <div className="order-detail-address"><span>배송지</span><strong>{order.address ? `${order.postal_code ? `(${order.postal_code}) ` : ''}${order.address}${order.address_detail ? ` ${order.address_detail}` : ''}` : '이전 주문 정보 없음'}</strong></div>
                  <div className="order-detail-address"><span>배송 요청사항</span><strong>{order.delivery_request || '없음'}</strong></div>
                </div>
              </details>
              <span className="order-total">결제금액 {won(order.total_price)}</span>
            </div>
          </div>
          )
        })}
      </div>
    </div>
  )
}
