import { useEffect, useMemo, useState } from 'react'
import AdminGate from '../components/AdminGate'
import { useStore } from '../store'
import { won } from '../lib/format'
import { NEXT_ORDER_STATUS, ORDER_STATUS_LABELS, fetchAdminOrders, updateAdminOrderStatus } from '../lib/admin'

const FILTERS = ['전체', 'pending', 'paid', 'preparing', 'shipped', 'delivered']
const formatDate = (value) => new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))

function AdminOrdersContent() {
  const { showToast } = useStore()
  const [orders, setOrders] = useState([])
  const [filter, setFilter] = useState('전체')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updatingOrderId, setUpdatingOrderId] = useState(null)
  const load = async () => { setLoading(true); setError(null); try { setOrders(await fetchAdminOrders()) } catch (caught) { console.error('Admin orders fetch failed:', caught); setError(caught.message || '주문 목록을 불러오지 못했습니다.') } finally { setLoading(false) } }
  useEffect(() => { void load() }, [])
  const visibleOrders = useMemo(() => orders.filter((order) => {
    const matchesStatus = filter === '전체' || order.status === filter
    const needle = query.trim().toLowerCase()
    return matchesStatus && (!needle || `${order.toss_order_id} ${order.buyerName} ${order.user_id}`.toLowerCase().includes(needle))
  }), [filter, orders, query])
  const advance = async (order) => {
    const nextStatus = NEXT_ORDER_STATUS[order.status]
    if (!nextStatus) return
    if (!window.confirm(`주문 상태를 '${ORDER_STATUS_LABELS[nextStatus]}'(으)로 변경할까요?`)) return
    setUpdatingOrderId(order.order_id)
    try { await updateAdminOrderStatus(order.order_id, nextStatus); setOrders((current) => current.map((item) => item.order_id === order.order_id ? { ...item, status: nextStatus } : item)); showToast(`주문 상태를 ${ORDER_STATUS_LABELS[nextStatus]}(으)로 변경했습니다.`) } catch (caught) { console.error('Admin order status update failed:', caught); showToast(caught.message || '주문 상태를 변경하지 못했습니다.') } finally { setUpdatingOrderId(null) }
  }

  return <div className="wrap page">
    <div className="admin-head admin-orders-head"><span className="kicker">ADMIN CONSOLE</span><h1>주문 · 출고 관리</h1><p><b>결제완료 → 상품 준비 → 배송중 → 배송완료</b> 순서로 주문 상태를 처리합니다.</p></div>
    <div className="admin-toolbar"><div className="admin-filters">{FILTERS.map((item) => <button className={filter === item ? 'on' : ''} key={item} onClick={() => setFilter(item)}>{item === '전체' ? item : ORDER_STATUS_LABELS[item]}</button>)}</div><input className="admin-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="주문번호 또는 주문자 검색" /></div>
    {loading ? <div className="empty"><p>주문 데이터를 불러오는 중입니다.</p></div> : error ? <div className="empty"><h3>주문을 불러오지 못했습니다.</h3><p>{error}</p><button className="btn btn-primary btn-sm" onClick={() => void load()}>다시 시도</button></div> : visibleOrders.length === 0 ? <div className="empty"><h3>해당 상태의 주문이 없습니다.</h3></div> : <div className="table-wrap"><table className="admin-orders-table"><thead><tr><th>주문번호</th><th>주문일시</th><th>주문자</th><th>주문 상품</th><th>결제액</th><th>상태</th><th>처리</th></tr></thead><tbody>{visibleOrders.map((order) => { const nextStatus = NEXT_ORDER_STATUS[order.status]; return <tr key={order.order_id}><td className="td-mono admin-order-id">{order.toss_order_id}</td><td className="admin-date">{formatDate(order.created_at)}</td><td><div className="td-name">{order.buyerName}</div><div className="admin-user-id">{order.user_id.slice(-8)}</div></td><td className="admin-order-items">{(order.order_items || []).map((item) => <div key={item.product_id}>{item.products?.name || `상품 #${item.product_id}`} <span>× {item.quantity}</span></div>)}</td><td className="admin-number">{won(order.total_price)}</td><td><span className={`status ${order.status === 'delivered' ? 'status-done' : 'status-active'}`}>{ORDER_STATUS_LABELS[order.status] || order.status}</span></td><td>{nextStatus ? <button className="btn-mini solid" disabled={updatingOrderId === order.order_id} onClick={() => void advance(order)}>{updatingOrderId === order.order_id ? '처리 중...' : `${ORDER_STATUS_LABELS[nextStatus]} 처리`}</button> : <span className="admin-action-muted">{order.status === 'pending' ? '결제 대기' : '처리 완료'}</span>}</td></tr> })}</tbody></table></div>}
  </div>
}

export default function AdminOrders() { return <AdminGate><AdminOrdersContent /></AdminGate> }
