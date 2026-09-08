import { useEffect, useMemo, useRef, useState } from 'react'
import AdminGate from '../components/AdminGate'
import Icon from '../components/Icon'
import { useStore } from '../store'
import { won } from '../lib/format'
import {
  NEXT_ORDER_STATUS,
  ORDER_STATUS_LABELS,
  bulkShipAdminOrders,
  fetchAdminOrders,
  filterAdminOrders,
  isBulkShippableOrder,
  summarizeAdminOrders,
  updateAdminOrderStatus,
} from '../lib/admin'

const FILTERS = [
  { value: 'fulfillment', label: '출고 전체' },
  { value: 'paid', label: ORDER_STATUS_LABELS.paid },
  { value: 'preparing', label: ORDER_STATUS_LABELS.preparing },
  { value: 'shipped', label: ORDER_STATUS_LABELS.shipped },
  { value: 'delivered', label: ORDER_STATUS_LABELS.delivered },
  { value: 'pending', label: ORDER_STATUS_LABELS.pending },
]
const formatDate = (value) => new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
const SHIPPING_SNAPSHOT_FIELDS = ['recipient_name', 'recipient_phone', 'postal_code', 'address', 'address_detail', 'delivery_request']
const displayValue = (value) => String(value ?? '').trim() || '—'
const initialOrderFilter = () => new URLSearchParams(window.location.search).get('status') === 'pending' ? 'pending' : 'fulfillment'

function hasShippingSnapshot(order) {
  return SHIPPING_SNAPSHOT_FIELDS.some((field) => String(order[field] ?? '').trim())
}

function DetailItem({ label, children, wide = false }) {
  return <div className={wide ? 'wide' : ''}><dt>{label}</dt><dd>{children}</dd></div>
}

function OrderDetail({ order, updating, busy, onAdvance, onClose }) {
  const closeButtonRef = useRef(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [busy, onClose])

  const items = order.order_items || []
  const itemSubtotal = items.reduce((sum, item) => sum + (Number(item.price_at_order) * Number(item.quantity)), 0)
  const deliveryFee = Math.max(Number(order.total_price) - itemSubtotal, 0)
  const nextStatus = NEXT_ORDER_STATUS[order.status]
  const shippingAvailable = hasShippingSnapshot(order)

  return <>
    <button type="button" className="admin-product-editor-backdrop" onClick={() => !busy && onClose()} aria-label="주문 상세 닫기" />
    <section className="admin-product-editor-shell admin-order-detail" role="dialog" aria-modal="true" aria-labelledby="admin-order-detail-title">
      <div className="admin-product-editor-head">
        <div><span>ORDER DETAIL</span><h2 id="admin-order-detail-title"><Icon name="package" size={19} />주문 상세</h2></div>
        <button ref={closeButtonRef} type="button" className="icon-btn" onClick={onClose} disabled={busy} aria-label="닫기"><Icon name="x" size={20} /></button>
      </div>
      <div className="admin-product-editor-form">
        <div className="admin-product-editor-body">
          <div className="admin-order-detail-grid">
            <div className="admin-order-detail-copy">
              <section>
                <h3>주문 정보</h3>
                <dl className="admin-order-detail-list">
                  <DetailItem label="주문번호"><span className="td-mono admin-order-number">{order.toss_order_id || order.order_id}</span></DetailItem>
                  <DetailItem label="주문일시">{formatDate(order.created_at)}</DetailItem>
                  <DetailItem label="주문자">{order.buyerName}</DetailItem>
                  <DetailItem label="주문 상태"><span className={`status ${order.status === 'delivered' ? 'status-done' : 'status-active'}`}>{ORDER_STATUS_LABELS[order.status] || order.status}</span></DetailItem>
                </dl>
              </section>

              <section>
                <h3>배송 정보</h3>
                {shippingAvailable ? <dl className="admin-order-detail-list admin-shipping-detail">
                  <DetailItem label="수취인">{displayValue(order.recipient_name)}</DetailItem>
                  <DetailItem label="연락처">{displayValue(order.recipient_phone)}</DetailItem>
                  <DetailItem label="우편번호">{displayValue(order.postal_code)}</DetailItem>
                  <DetailItem label="기본 주소" wide>{displayValue(order.address)}</DetailItem>
                  <DetailItem label="상세 주소" wide>{displayValue(order.address_detail)}</DetailItem>
                  <DetailItem label="배송 요청사항" wide>{displayValue(order.delivery_request)}</DetailItem>
                </dl> : <p className="admin-order-shipping-empty">저장된 배송 정보가 없습니다.</p>}
              </section>

              <section>
                <h3>주문 상품</h3>
                <div className="admin-order-detail-items">
                  {items.map((item) => <div className="admin-order-detail-item" key={item.product_id}>
                    <div><strong>{item.products?.name || `상품 #${item.product_id}`}</strong><span>{item.products?.brand || '브랜드 정보 없음'}</span></div>
                    <span>수량 {item.quantity}개</span>
                    <div><small>주문 당시 단가 {won(item.price_at_order)}</small><b>{won(item.price_at_order * item.quantity)}</b></div>
                  </div>)}
                  {items.length === 0 && <p className="admin-order-items-empty">저장된 주문 상품 정보가 없습니다.</p>}
                </div>
              </section>
            </div>

            <aside className="admin-order-detail-aside">
              <section>
                <h3>결제 정보</h3>
                <dl className="admin-order-payment-list">
                  <div><dt>상품 금액</dt><dd>{won(itemSubtotal)}</dd></div>
                  <div><dt>배송비</dt><dd>{won(deliveryFee)}</dd></div>
                  <div className="total"><dt>총 결제금액</dt><dd>{won(order.total_price)}</dd></div>
                </dl>
              </section>
              <section>
                <h3>주문 처리</h3>
                <p>현재 상태 <b>{ORDER_STATUS_LABELS[order.status] || order.status}</b></p>
                <p>{nextStatus ? `다음 단계는 '${ORDER_STATUS_LABELS[nextStatus]}'입니다.` : order.status === 'pending' ? '결제 완료 전 주문입니다.' : '모든 배송 처리가 완료되었습니다.'}</p>
              </section>
            </aside>
          </div>
        </div>
        <div className="admin-actions">
          <span className="admin-save-state">상태 변경은 기존 순서대로만 처리됩니다.</span>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>닫기</button>
          {nextStatus && <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void onAdvance(order)}>{updating ? '처리 중...' : `${ORDER_STATUS_LABELS[nextStatus]} 처리`}</button>}
        </div>
      </div>
    </section>
  </>
}

function BulkShipConfirmModal({ count, processing, onCancel, onConfirm }) {
  const confirmButtonRef = useRef(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    confirmButtonRef.current?.focus()
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !processing) onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onCancel, processing])

  return (
    <div className="admin-bulk-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !processing && onCancel()}>
      <section className="admin-bulk-modal" role="alertdialog" aria-modal="true" aria-labelledby="admin-bulk-modal-title" aria-describedby="admin-bulk-modal-description">
        <span className="kicker">BULK FULFILLMENT</span>
        <h2 id="admin-bulk-modal-title">선택 주문 배송처리</h2>
        <p id="admin-bulk-modal-description"><b>{count}건</b>의 주문을 배송중으로 변경하시겠습니까?</p>
        <div>
          <button type="button" className="btn btn-ghost" disabled={processing} onClick={onCancel}>취소</button>
          <button ref={confirmButtonRef} type="button" className="btn btn-primary" disabled={processing} onClick={onConfirm}>{processing ? '처리 중...' : '배송처리'}</button>
        </div>
      </section>
    </div>
  )
}

function AdminOrdersContent() {
  const { showToast } = useStore()
  const [orders, setOrders] = useState([])
  const [filter, setFilter] = useState(initialOrderFilter)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updatingOrderId, setUpdatingOrderId] = useState(null)
  const [selectedOrderIds, setSelectedOrderIds] = useState(() => new Set())
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false)
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState(null)
  const selectAllRef = useRef(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    setSelectedOrderIds(new Set())
    try {
      setOrders(await fetchAdminOrders())
    } catch (caught) {
      console.error('Admin orders fetch failed:', { code: caught?.code || 'ADMIN_ORDERS_FETCH_FAILED' })
      setError(caught.message || '주문 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const summary = useMemo(() => summarizeAdminOrders(orders), [orders])
  const visibleOrders = useMemo(() => filterAdminOrders(orders, filter).filter((order) => {
    const needle = query.trim().toLowerCase()
    return !needle || `${order.toss_order_id} ${order.buyerName} ${order.user_id}`.toLowerCase().includes(needle)
  }), [filter, orders, query])
  const visibleShippableIds = useMemo(() => visibleOrders.filter(isBulkShippableOrder).map((order) => order.order_id), [visibleOrders])
  const allVisibleSelected = visibleShippableIds.length > 0 && visibleShippableIds.every((orderId) => selectedOrderIds.has(orderId))
  const someVisibleSelected = visibleShippableIds.some((orderId) => selectedOrderIds.has(orderId))
  const selectedOrder = orders.find((order) => order.order_id === selectedOrderId) || null

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someVisibleSelected && !allVisibleSelected
  }, [allVisibleSelected, someVisibleSelected])

  const toggleOrder = (orderId) => {
    setSelectedOrderIds((current) => {
      const next = new Set(current)
      if (next.has(orderId)) next.delete(orderId)
      else next.add(orderId)
      return next
    })
  }

  const toggleAllVisible = () => {
    setSelectedOrderIds((current) => {
      const next = new Set(current)
      if (allVisibleSelected) visibleShippableIds.forEach((orderId) => next.delete(orderId))
      else visibleShippableIds.forEach((orderId) => next.add(orderId))
      return next
    })
  }

  const advance = async (order) => {
    const nextStatus = NEXT_ORDER_STATUS[order.status]
    if (!nextStatus) return
    if (!window.confirm(`주문 상태를 '${ORDER_STATUS_LABELS[nextStatus]}'(으)로 변경할까요?`)) return
    setUpdatingOrderId(order.order_id)
    try {
      await updateAdminOrderStatus(order.order_id, nextStatus)
      setOrders((current) => current.map((item) => item.order_id === order.order_id ? { ...item, status: nextStatus } : item))
      setSelectedOrderIds((current) => {
        const next = new Set(current)
        next.delete(order.order_id)
        return next
      })
      showToast(`주문 상태를 ${ORDER_STATUS_LABELS[nextStatus]}(으)로 변경했습니다.`)
    } catch (caught) {
      console.error('Admin order status update failed:', { code: caught?.code || 'ORDER_STATUS_UPDATE_FAILED' })
      showToast(caught.message || '주문 상태를 변경하지 못했습니다.')
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const confirmBulkShipping = async () => {
    const orderIds = [...selectedOrderIds]
    if (orderIds.length === 0) return
    setBulkProcessing(true)
    try {
      const updatedOrderIds = await bulkShipAdminOrders(orderIds)
      const updatedSet = new Set(updatedOrderIds)
      setOrders((current) => current.map((order) => updatedSet.has(order.order_id) ? { ...order, status: 'shipped' } : order))
      setSelectedOrderIds(new Set())
      setBulkConfirmOpen(false)
      showToast(`${updatedOrderIds.length}건의 주문을 배송중으로 변경했습니다.`)
    } catch (caught) {
      console.error('Admin bulk shipping failed:', { code: caught?.code || 'BULK_SHIPPING_FAILED' })
      setBulkConfirmOpen(false)
      showToast(caught.message || '선택 주문을 배송처리하지 못했습니다. 주문 상태를 다시 확인해 주세요.')
      await load()
    } finally {
      setBulkProcessing(false)
    }
  }

  const summaryItems = [
    ['전체 주문', summary.total],
    ['결제완료', summary.paid],
    ['상품준비중', summary.preparing],
    ['배송중', summary.shipped],
    ['배송완료', summary.delivered],
  ]

  return <div className="wrap page admin-orders-page">
    <div className="admin-head admin-orders-head"><h1>주문 · 출고 관리</h1><p>결제 이후 주문 처리 현황</p></div>
    <dl className="admin-order-summary" aria-label="주문 운영 요약">{summaryItems.map(([label, count]) => <div key={label}><dt>{label}</dt><dd>{count}<small>건</small></dd></div>)}</dl>
    <div className="admin-toolbar"><div className="admin-filters">{FILTERS.map((item) => <button className={filter === item.value ? 'on' : ''} key={item.value} onClick={() => setFilter(item.value)}>{item.label}</button>)}</div><input className="admin-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="주문번호 또는 주문자 검색" /></div>
    <div className="admin-bulk-bar">
      <span>선택 <b>{selectedOrderIds.size}</b>건</span>
      <button type="button" className="btn btn-primary btn-sm" disabled={selectedOrderIds.size === 0 || bulkProcessing || updatingOrderId !== null} onClick={() => setBulkConfirmOpen(true)}>선택 주문 배송처리</button>
    </div>
    {loading ? <div className="empty" role="status"><p>주문 데이터를 불러오는 중입니다.</p></div> : error ? <div className="empty" role="alert"><h3>주문을 불러오지 못했습니다.</h3><p>잠시 후 다시 시도해 주세요.</p><button className="btn btn-primary btn-sm" onClick={() => void load()}>다시 시도</button></div> : visibleOrders.length === 0 ? <div className="empty"><h3>{orders.length === 0 ? '표시할 주문이 없습니다.' : '현재 조건에 해당하는 주문이 없습니다.'}</h3></div> : <div className="table-wrap"><table role="table" className="admin-mobile-cards admin-orders-table"><thead><tr><th className="admin-order-select"><input ref={selectAllRef} type="checkbox" checked={allVisibleSelected} disabled={visibleShippableIds.length === 0 || bulkProcessing} aria-label="화면의 상품준비중 주문 전체선택" onChange={toggleAllVisible} /></th><th>주문번호</th><th>주문일시</th><th>주문자</th><th>주문 상품</th><th>결제액</th><th>상태</th><th>처리</th></tr></thead><tbody>{visibleOrders.map((order) => { const nextStatus = NEXT_ORDER_STATUS[order.status]; const shippable = isBulkShippableOrder(order); return <tr key={order.order_id} className={selectedOrderIds.has(order.order_id) ? 'selected' : ''}><td data-label="선택" className="admin-order-select"><input type="checkbox" checked={selectedOrderIds.has(order.order_id)} disabled={!shippable || bulkProcessing} aria-label={`${order.toss_order_id} 주문 선택${shippable ? '' : ' (상품준비중 주문만 선택 가능)'}`} onChange={() => toggleOrder(order.order_id)} /></td><td data-label="주문번호" className="td-mono admin-order-id admin-order-number">{order.toss_order_id}</td><td data-label="주문일시" className="admin-date">{formatDate(order.created_at)}</td><td data-label="주문자"><div className="td-name">{order.buyerName}</div><div className="admin-user-id">{order.user_id.slice(-8)}</div></td><td data-label="주문 상품" className="admin-order-items">{(order.order_items || []).map((item) => <div key={item.product_id}>{item.products?.name || `상품 #${item.product_id}`} <span>× {item.quantity}</span></div>)}</td><td data-label="결제액" className="admin-number">{won(order.total_price)}</td><td data-label="상태"><span className={`status ${order.status === 'delivered' ? 'status-done' : 'status-active'}`}>{ORDER_STATUS_LABELS[order.status] || order.status}</span></td><td data-label="처리"><div className="admin-order-row-actions"><button type="button" className="btn-mini soft" onClick={() => setSelectedOrderId(order.order_id)}>상세</button>{nextStatus ? <button className="btn-mini solid" disabled={updatingOrderId === order.order_id || bulkProcessing} onClick={() => void advance(order)}>{updatingOrderId === order.order_id ? '처리 중...' : `${ORDER_STATUS_LABELS[nextStatus]} 처리`}</button> : <span className="admin-action-muted">{order.status === 'pending' ? '결제 대기' : '처리 완료'}</span>}</div></td></tr> })}</tbody></table></div>}
    {bulkConfirmOpen && <BulkShipConfirmModal count={selectedOrderIds.size} processing={bulkProcessing} onCancel={() => setBulkConfirmOpen(false)} onConfirm={() => void confirmBulkShipping()} />}
    {selectedOrder && <OrderDetail order={selectedOrder} updating={updatingOrderId === selectedOrder.order_id} busy={updatingOrderId !== null || bulkProcessing} onClose={() => setSelectedOrderId(null)} onAdvance={advance} />}
  </div>
}

export default function AdminOrders() { return <AdminGate><AdminOrdersContent /></AdminGate> }
