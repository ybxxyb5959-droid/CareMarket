import { useStore } from '../store'
import Icon from '../components/Icon'
import { won } from '../lib/format'

export default function Orders() {
  const { orders, navigate } = useStore()
  return (
    <div className="wrap page">
      <div className="page-mid" style={{ margin: '0 auto' }}>
        <div className="page-head">
          <div>
            <h1 className="page-title">주문 · 배송 내역</h1>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>최근 건강식품 주문과 콜드체인 배송 상황입니다.</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('main')}>쇼핑 계속하기 →</button>
        </div>

        {orders.map((o) => (
          <div key={o.id} className="order-card">
            <div className="order-top">
              <div className="order-id">
                <b>{o.id}</b>
                <span>· {o.date}</span>
              </div>
              <span className={`status ${o.active ? 'status-active' : 'status-done'}`}>{o.status}</span>
            </div>
            <div className="order-lines">
              {o.items.map((it, i) => (
                <div key={i} className="order-line">
                  <span className="nm">{it.name} <span>({it.count}개)</span></span>
                  <b>{won(it.price * it.count)}</b>
                </div>
              ))}
            </div>
            <div className="order-foot">
              <span className="order-track"><Icon name="truck" size={16} style={{ color: 'var(--brand-500)' }} /> 운송장 · <b>{o.tracker}</b></span>
              <span className="order-total">결제금액 {won(o.totalAmount)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
