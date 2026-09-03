import { useStore } from '../store'
import { won } from '../lib/format'

export default function AdminOrders() {
  const { orders, updateOrderStatus } = useStore()
  return (
    <div className="wrap page">
      <div className="admin-head" style={{ marginBottom: 26 }}>
        <span className="kicker">ADMIN CONSOLE</span>
        <h1>콜드체인 주문 · 출고 관리</h1>
        <p>실시간 주문 건 확인 및 보랭 출고 처리</p>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>주문번호</th><th>일시</th><th>주문 내역</th><th>결제액</th>
              <th>상태</th><th style={{ textAlign: 'center' }}>출고 액션</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="td-mono" style={{ color: 'var(--ink)', fontWeight: 700 }}>{o.id}</td>
                <td style={{ color: 'var(--faint)', whiteSpace: 'nowrap' }}>{o.date}</td>
                <td className="td-name" style={{ maxWidth: 260, fontWeight: 500, color: 'var(--ink-2)' }}>
                  {o.items.map((i) => `${i.name} (${i.count})`).join(', ')}
                </td>
                <td style={{ fontWeight: 800, color: 'var(--ink)' }}>{won(o.totalAmount)}</td>
                <td>
                  <span className={`status ${o.active ? 'status-active' : 'status-done'}`}>{o.status}</span>
                </td>
                <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                  <button className="btn-mini solid" onClick={() => updateOrderStatus(o.id, '출고완료', true)}>출고</button>{' '}
                  <button className="btn-mini soft" onClick={() => updateOrderStatus(o.id, '배송완료', false)}>완료</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
