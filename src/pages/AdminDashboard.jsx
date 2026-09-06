import { useEffect, useMemo, useState } from 'react'
import AdminGate from '../components/AdminGate'
import Icon from '../components/Icon'
import { useStore } from '../store'
import { won } from '../lib/format'
import {
  fetchAdminCustomerInquiries,
  fetchAdminOrders,
  fetchAdminPartnerships,
  fetchAdminProducts,
  isFulfillmentOrder,
  ORDER_STATUS_LABELS,
} from '../lib/admin'
import { getDashboardMetrics, maskDashboardName, MOCK_CATEGORY_SALES_DATA, MOCK_PAYMENT_CHART_DATA } from '../lib/admin-dashboard'

const DASHBOARD_VIEWS = {
  products: 'adminProducts',
  orders: 'adminOrders',
  partnerships: 'adminPartnerships',
  inquiries: 'adminInquiries',
}

const initialResources = {
  products: { data: [], error: false },
  orders: { data: [], error: false },
  partnerships: { data: [], error: false },
  inquiries: { data: [], error: false },
}

function MetricValue({ value, loading, error, unit = '' }) {
  if (loading) return <span className="admin-dashboard-metric-loading">불러오는 중</span>
  if (error) return <span className="admin-dashboard-metric-error">불러오지 못함</span>
  return <>{value.toLocaleString('ko-KR')}<small>{unit}</small></>
}

function DashboardMetric({ icon, label, value, unit, loading, error, tone = '' }) {
  return <article className={`admin-dashboard-metric ${tone}`}>
    <div className="admin-dashboard-metric-icon"><Icon name={icon} size={18} /></div>
    <div className="admin-dashboard-metric-copy">
      <span>{label}</span>
      <strong><MetricValue value={value} loading={loading} error={error} unit={unit} /></strong>
    </div>
  </article>
}

function PaymentChart() {
  const max = Math.max(...MOCK_PAYMENT_CHART_DATA.map((item) => item.value))
  const chartWidth = 620
  const chartHeight = 178
  const baseline = 143
  const plotHeight = 108
  const startX = 28
  const plotWidth = 566
  const points = MOCK_PAYMENT_CHART_DATA.map((item, index) => {
    const x = startX + (plotWidth / (MOCK_PAYMENT_CHART_DATA.length - 1)) * index
    const y = baseline - (item.value / max) * plotHeight
    return { ...item, x, y }
  })
  return <div className="admin-dashboard-chart-visual">
    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="최근 7일 결제금액 추이 샘플 꺾은선 차트">
      {[0, 1, 2, 3].map((line) => {
        const y = baseline - (plotHeight / 3) * line
        return <line key={line} x1="22" x2="600" y1={y} y2={y} className="admin-dashboard-chart-grid" />
      })}
      <polyline className="admin-dashboard-payment-line" points={points.map((point) => `${point.x},${point.y}`).join(' ')} />
      {points.map((point) => <g key={point.label}>
        <circle className="admin-dashboard-payment-point" cx={point.x} cy={point.y} r="3.5"><title>{`${point.label} ${point.value.toLocaleString('ko-KR')}원`}</title></circle>
        <text className="admin-dashboard-chart-label" x={point.x} y="166" textAnchor="middle">{point.label}</text>
      </g>)}
    </svg>
  </div>
}

function CategoryChart() {
  const max = Math.max(...MOCK_CATEGORY_SALES_DATA.map((item) => item.value))
  return <div className="admin-dashboard-category-chart" role="img" aria-label="카테고리별 판매량 샘플 가로 막대 차트">
    {MOCK_CATEGORY_SALES_DATA.map((item) => <div className="admin-dashboard-category-row" key={item.label}>
      <span>{item.label}</span>
      <div className="admin-dashboard-category-track"><i style={{ width: `${(item.value / max) * 100}%` }} /></div>
      <b>{item.value}</b>
    </div>)}
  </div>
}

function DashboardCard({ title, kicker, action, onAction, children, className = '' }) {
  return <section className={`admin-dashboard-card ${className}`}>
    <div className="admin-dashboard-card-head">
      <div><span>{kicker}</span><h2>{title}</h2></div>
      {action && <button type="button" className="admin-dashboard-card-action" onClick={onAction}>{action}<Icon name="chevron-right" size={14} /></button>}
    </div>
    {children}
  </section>
}

function NeedsAttention({ metrics, loading, errors, navigate }) {
  const items = [
    { key: 'lowStockProducts', label: '재고 부족 상품', unit: '개', view: 'products', icon: 'package', tone: metrics.lowStockProducts > 0 ? 'warning' : '' },
    { key: 'waitingInquiries', label: '답변 대기 문의', unit: '건', view: 'inquiries', icon: 'message-circle', tone: metrics.waitingInquiries > 0 ? 'warning' : '' },
    { key: 'newPartnerships', label: '신규 협업 제안', unit: '건', view: 'partnerships', icon: 'leaf', tone: metrics.newPartnerships > 0 ? 'warning' : '' },
    { key: 'preparingOrders', label: '상품 준비중 주문', unit: '건', view: 'orders', icon: 'clock', tone: metrics.preparingOrders > 0 ? 'warning' : '' },
    { key: 'pendingOrders', label: '결제 미완료 주문', unit: '건', view: 'orders', options: { status: 'pending' }, icon: 'credit-card', tone: metrics.pendingOrders > 0 ? 'warning' : '' },
  ]
  return <div className="admin-dashboard-attention-list">
    {items.map((item) => <button type="button" className={`admin-dashboard-attention-item ${item.tone}`} key={item.key} onClick={() => navigate(DASHBOARD_VIEWS[item.view], item.options)}>
      <span className="admin-dashboard-attention-icon"><Icon name={item.icon} size={16} /></span>
      <span className="admin-dashboard-attention-label">{item.label}</span>
      <strong><MetricValue value={metrics[item.key]} loading={loading} error={errors[item.key]} unit={item.unit} /></strong>
      <Icon name="chevron-right" size={15} />
    </button>)}
  </div>
}

function RecentOrders({ orders, loading, error, navigate }) {
  const recentOrders = useMemo(() => orders.filter(isFulfillmentOrder).slice(0, 5), [orders])
  if (loading) return <div className="admin-dashboard-empty" role="status">주문 데이터를 불러오는 중입니다.</div>
  if (error) return <div className="admin-dashboard-empty" role="alert">최근 주문을 불러오지 못했습니다.</div>
  if (recentOrders.length === 0) return <div className="admin-dashboard-empty">최근 주문이 없습니다.</div>
  return <div className="admin-dashboard-orders-list">
    {recentOrders.map((order) => <button type="button" className="admin-dashboard-order-row" key={order.order_id} onClick={() => navigate('adminOrders')}>
      <span className="admin-dashboard-order-main"><b>{order.toss_order_id || order.order_id}</b><small>{maskDashboardName(order.buyerName)}</small></span>
      <strong>{won(order.total_price)}</strong>
      <span className={`status ${order.status === 'delivered' ? 'status-done' : 'status-active'}`}>{ORDER_STATUS_LABELS[order.status] || order.status}</span>
      <Icon name="chevron-right" size={15} />
    </button>)}
  </div>
}

function AdminDashboardContent() {
  const { navigate } = useStore()
  const [resources, setResources] = useState(initialResources)
  const [loading, setLoading] = useState(true)

  const load = async ({ initial = false } = {}) => {
    if (!initial) setLoading(true)
    const results = await Promise.allSettled([
      fetchAdminProducts(),
      fetchAdminOrders(),
      fetchAdminPartnerships(),
      fetchAdminCustomerInquiries(),
    ])
    const keys = ['products', 'orders', 'partnerships', 'inquiries']
    const nextResources = Object.fromEntries(keys.map((key, index) => {
      const result = results[index]
      return [key, result.status === 'fulfilled'
        ? { data: result.value || [], error: false }
        : { data: [], error: true }]
    }))
    setResources(nextResources)
    setLoading(false)
  }

  // Initial fetch owns the page-level loading transition; retries are user initiated.
  // eslint-disable-next-line react/set-state-in-effect
  useEffect(() => { void load({ initial: true }) }, [])

  const products = resources.products.data
  const orders = resources.orders.data
  const partnerships = resources.partnerships.data
  const inquiries = resources.inquiries.data
  const metrics = useMemo(() => getDashboardMetrics({ products, orders, partnerships, inquiries }), [inquiries, orders, partnerships, products])
  const metricErrors = {
    todayOrders: resources.orders.error,
    todayPayment: resources.orders.error,
    preparingOrders: resources.orders.error,
    waitingInquiries: resources.inquiries.error,
    newPartnerships: resources.partnerships.error,
    lowStockProducts: resources.products.error,
  }
  const hasError = Object.values(resources).some((resource) => resource.error)

  return <div className="wrap page admin-dashboard-page">
    <div className="admin-head admin-dashboard-head">
      <h1>관리자 대시보드</h1>
      <p>오늘의 운영 현황</p>
    </div>

    {loading ? <div className="empty" role="status"><p>대시보드 운영 데이터를 불러오는 중입니다.</p></div> : <>
      <section className="admin-dashboard-metrics" aria-label="주요 운영 현황">
        <DashboardMetric icon="package" label="오늘 주문" value={metrics.todayOrders} unit="건" loading={false} error={metricErrors.todayOrders} />
        <DashboardMetric icon="credit-card" label="오늘 결제금액" value={metrics.todayPayment} unit="원" loading={false} error={metricErrors.todayPayment} />
        <DashboardMetric icon="clock" label="상품 준비중" value={metrics.preparingOrders} unit="건" loading={false} error={metricErrors.preparingOrders} tone={metrics.preparingOrders > 0 ? 'accent' : ''} />
        <DashboardMetric icon="message-circle" label="답변 대기 문의" value={metrics.waitingInquiries} unit="건" loading={false} error={metricErrors.waitingInquiries} tone={metrics.waitingInquiries > 0 ? 'warning' : ''} />
        <DashboardMetric icon="leaf" label="신규 협업 제안" value={metrics.newPartnerships} unit="건" loading={false} error={metricErrors.newPartnerships} tone={metrics.newPartnerships > 0 ? 'warning' : ''} />
        <DashboardMetric icon="alert-circle" label="재고 부족 상품" value={metrics.lowStockProducts} unit="개" loading={false} error={metricErrors.lowStockProducts} tone={metrics.lowStockProducts > 0 ? 'warning' : ''} />
      </section>

      <div className="admin-dashboard-grid admin-dashboard-chart-grid">
        <DashboardCard title="최근 7일 결제금액 추이" kicker="PAYMENT OVERVIEW" className="admin-dashboard-chart-card">
          <PaymentChart />
          <p className="admin-dashboard-demo-note">샘플 데이터 · 실제 결제 집계가 아닙니다.</p>
        </DashboardCard>
        <DashboardCard title="카테고리별 판매량" kicker="CATEGORY MIX" className="admin-dashboard-chart-card">
          <CategoryChart />
          <p className="admin-dashboard-demo-note">데모 데이터 · 추후 실제 집계로 교체할 수 있습니다.</p>
        </DashboardCard>
      </div>

      <div className="admin-dashboard-grid admin-dashboard-operation-grid">
        <DashboardCard title="확인이 필요한 항목" kicker="NEEDS ATTENTION">
          <NeedsAttention metrics={metrics} loading={false} errors={metricErrors} navigate={navigate} />
        </DashboardCard>
        <DashboardCard title="최근 주문" kicker="LATEST ORDERS" action="전체 보기" onAction={() => navigate('adminOrders')}>
          <RecentOrders orders={orders} loading={false} error={resources.orders.error} navigate={navigate} />
        </DashboardCard>
      </div>
      {hasError && <div className="admin-dashboard-refresh" role="status"><span>일부 운영 데이터를 불러오지 못했습니다.</span><button type="button" className="btn btn-ghost btn-sm" onClick={() => void load()}>다시 시도</button></div>}
    </>}
  </div>
}

export default function AdminDashboard() {
  return <AdminGate><AdminDashboardContent /></AdminGate>
}
