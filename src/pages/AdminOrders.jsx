import { useEffect, useMemo, useRef, useState } from 'react'
import AdminGate from '../components/AdminGate'
import { useStore } from '../store'
import { won } from '../lib/format'
import {
  NEXT_ORDER_STATUS,
  ORDER_STATUS_LABELS,
  bulkShipAdminOrders,
  fetchAdminOrders,
  isBulkShippableOrder,
  summarizeAdminOrders,
  updateAdminOrderStatus,
} from '../lib/admin'

const FILTERS = ['전체', 'pending', 'paid', 'preparing', 'shipped', 'delivered']
const formatDate = (value) => new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))

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
  const [filter, setFilter] = useState('전체')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updatingOrderId, setUpdatingOrderId] = useState(null)
  const [selectedOrderIds, setSelectedOrderIds] = useState(() => new Set())
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false)
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const selectAllRef = useRef(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    setSelectedOrderIds(new Set())
    try {
      setOrders(await fetchAdminOrders())
    } catch (caught) {
      console.error('Admin orders fetch failed:', caught)
      setError(caught.message || '주문 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const summary = useMemo(() => summarizeAdminOrders(orders), [orders])
  const visibleOrders = useMemo(() => orders.filter((order) => {
    const matchesStatus = filter === '전체' || order.status === filter
    const needle = query.trim().toLowerCase()
    return matchesStatus && (!needle || `${order.toss_order_id} ${order.buyerName} ${order.user_id}`.toLowerCase().includes(needle))
  }), [filter, orders, query])
  const visibleShippableIds = useMemo(() => visibleOrders.filter(isBulkShippableOrder).map((order) => order.order_id), [visibleOrders])
  const allVisibleSelected = visibleShippableIds.length > 0 && visibleShippableIds.every((orderId) => selectedOrderIds.has(orderId))
  const someVisibleSelected = visibleShippableIds.some((orderId) => selectedOrderIds.has(orderId))

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
      console.error('Admin order status update failed:', caught)
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
      console.error('Admin bulk shipping failed:', caught)
      setBulkConfirmOpen(false)
      showToast(caught.message || '선택 주문을 배송처리하지 못했습니다. 주문 상태를 다시 확인해 주세요.')
      await load()
    } finally {
      setBulkProcessing(false)
    }
  }

  const summaryItems = [
    ['전체 주문', summary.total],
    ['상품준비중', summary.preparing],
    ['배송중', summary.shipped],
    ['배송완료', summary.delivered],
    ['확인 필요', summary.needsReview],
  ]

  return <div className="wrap page admin-orders-page">
    <div className="admin-head admin-orders-head"><span className="kicker">ADMIN CONSOLE</span><h1>주문 · 출고 관리</h1><p><b>결제 완료 주문은 상품준비중으로 자동 전환됩니다.</b> 준비된 주문을 선택해 한 번에 배송처리하세요.</p></div>
    <dl className="admin-order-summary" aria-label="주문 운영 요약">{summaryItems.map(([label, count]) => <div key={label} className={label === '확인 필요' && count > 0 ? 'needs-review' : ''}><dt>{label}</dt><dd>{count}<small>건</small></dd></div>)}</dl>
    <div className="admin-toolbar"><div className="admin-filters">{FILTERS.map((item) => <button className={filter === item ? 'on' : ''} key={item} onClick={() => setFilter(item)}>{item === '전체' ? item : ORDER_STATUS_LABELS[item]}</button>)}</div><input className="admin-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="주문번호 또는 주문자 검색" /></div>
    <div className="admin-bulk-bar">
      <span>선택 <b>{selectedOrderIds.size}</b>건</span>
      <button type="button" className="btn btn-primary btn-sm" disabled={selectedOrderIds.size === 0 || bulkProcessing || updatingOrderId !== null} onClick={() => setBulkConfirmOpen(true)}>선택 주문 배송처리</button>
    </div>
    {loading ? <div className="empty"><p>주문 데이터를 불러오는 중입니다.</p></div> : error ? <div className="empty"><h3>주문을 불러오지 못했습니다.</h3><p>{error}</p><button className="btn btn-primary btn-sm" onClick={() => void load()}>다시 시도</button></div> : visibleOrders.length === 0 ? <div className="empty"><h3>해당 상태의 주문이 없습니다.</h3></div> : <div className="table-wrap"><table className="admin-orders-table"><thead><tr><th className="admin-order-select"><input ref={selectAllRef} type="checkbox" checked={allVisibleSelected} disabled={visibleShippableIds.length === 0 || bulkProcessing} aria-label="화면의 상품준비중 주문 전체선택" onChange={toggleAllVisible} /></th><th>주문번호</th><th>주문일시</th><th>주문자</th><th>주문 상품</th><th>결제액</th><th>상태</th><th>처리</th></tr></thead><tbody>{visibleOrders.map((order) => { const nextStatus = NEXT_ORDER_STATUS[order.status]; const shippable = isBulkShippableOrder(order); return <tr key={order.order_id} className={selectedOrderIds.has(order.order_id) ? 'selected' : ''}><td className="admin-order-select"><input type="checkbox" checked={selectedOrderIds.has(order.order_id)} disabled={!shippable || bulkProcessing} aria-label={`${order.toss_order_id} 주문 선택${shippable ? '' : ' (상품준비중 주문만 선택 가능)'}`} onChange={() => toggleOrder(order.order_id)} /></td><td className="td-mono admin-order-id">{order.toss_order_id}</td><td className="admin-date">{formatDate(order.created_at)}</td><td><div className="td-name">{order.buyerName}</div><div className="admin-user-id">{order.user_id.slice(-8)}</div></td><td className="admin-order-items">{(order.order_items || []).map((item) => <div key={item.product_id}>{item.products?.name || `상품 #${item.product_id}`} <span>× {item.quantity}</span></div>)}</td><td className="admin-number">{won(order.total_price)}</td><td><span className={`status ${order.status === 'delivered' ? 'status-done' : 'status-active'}`}>{ORDER_STATUS_LABELS[order.status] || order.status}</span></td><td>{nextStatus ? <button className="btn-mini solid" disabled={updatingOrderId === order.order_id || bulkProcessing} onClick={() => void advance(order)}>{updatingOrderId === order.order_id ? '처리 중...' : `${ORDER_STATUS_LABELS[nextStatus]} 처리`}</button> : <span className="admin-action-muted">{order.status === 'pending' ? '결제 대기' : '처리 완료'}</span>}</td></tr> })}</tbody></table></div>}
    {bulkConfirmOpen && <BulkShipConfirmModal count={selectedOrderIds.size} processing={bulkProcessing} onCancel={() => setBulkConfirmOpen(false)} onConfirm={() => void confirmBulkShipping()} />}
  </div>
}

export default function AdminOrders() { return <AdminGate><AdminOrdersContent /></AdminGate> }
