import { useEffect, useMemo, useState } from 'react'
import AdminGate from '../components/AdminGate'
import Icon from '../components/Icon'
import { supabase } from '../lib/supabase'
import { fetchAdminReviewReports } from '../lib/reviews'
import { useStore } from '../store'
import { won } from '../lib/format'
import {
  fetchAdminCustomerInquiries,
  fetchAdminOrders,
  fetchAdminPartnerships,
  fetchAdminProducts,
  fetchAdminSalesSummary,
  isFulfillmentOrder,
  ORDER_STATUS_LABELS,
} from '../lib/admin'
import { getDashboardMetrics, maskDashboardName, salesDateRange, validSalesRange, salesChange } from '../lib/admin-dashboard'

const DASHBOARD_VIEWS = {
  reviews: 'adminReviews',
  products: 'adminProducts',
  orders: 'adminOrders',
  partnerships: 'adminPartnerships',
  inquiries: 'adminInquiries',
}

const initialResources = {
  reviews: { data: [], error: false },
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

function DashboardMetric({ icon, label, value, unit, loading, error, tone = '', comparison, onClick }) {
  const content = <>
    <div className="admin-dashboard-metric-icon"><Icon name={icon} size={18} /></div>
    <div className="admin-dashboard-metric-copy">
      <span>{label}</span>
      <strong><MetricValue value={value} loading={loading} error={error} unit={unit} /></strong>
      {!loading && !error && comparison && <small>{comparison}</small>}
    </div>
  </>
  if (onClick) return <button type="button" className={`admin-dashboard-metric ${tone}`} onClick={onClick}>{content}</button>
  return <article className={`admin-dashboard-metric ${tone}`}>{content}</article>
}

function PaymentChart({ data }) {
  const max = Math.max(1, ...data.map((item) => item.value))
  const chartWidth = 620
  const chartHeight = 178
  const baseline = 143
  const plotHeight = 108
  const startX = 28
  const plotWidth = 566
  const labelStep = Math.max(1, Math.ceil((data.length - 1) / 6))
  const points = data.map((item, index) => {
    const x = data.length === 1 ? chartWidth / 2 : startX + (plotWidth / (data.length - 1)) * index
    const y = baseline - (item.value / max) * plotHeight
    return { ...item, x, y }
  })
  return <div className="admin-dashboard-chart-visual">
    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label={`${data[0]?.date || ''}부터 ${data.at(-1)?.date || ''}까지 일자별 결제금액 추이`}>
      {[0, 1, 2, 3].map((line) => {
        const y = baseline - (plotHeight / 3) * line
        return <line key={line} x1="22" x2="600" y1={y} y2={y} className="admin-dashboard-chart-grid" />
      })}
      <polyline className="admin-dashboard-payment-line" points={points.map((point) => `${point.x},${point.y}`).join(' ')} />
      {points.map((point, index) => <g key={point.date}>
        <circle className="admin-dashboard-payment-point" cx={point.x} cy={point.y} r={data.length > 30 ? 2 : 3.5}><title>{`${point.date} ${point.value.toLocaleString('ko-KR')}원`}</title></circle>
        {(index % labelStep === 0 || index === points.length - 1) && <text className="admin-dashboard-chart-label" x={point.x} y="166" textAnchor="middle">{point.label}</text>}
      </g>)}
    </svg>
  </div>
}

function CategoryChart({ data }) {
  const max = Math.max(1, ...data.map((item) => item.value))
  if (!data.length) return <div className="admin-dashboard-empty">선택한 기간의 판매 데이터가 없습니다.</div>
  return <div className="admin-dashboard-category-chart" role="img" aria-label="카테고리별 판매 수량">
    {data.map((item) => <div className="admin-dashboard-category-row" key={item.label}>
      <span>{item.label}</span>
      <div className="admin-dashboard-category-track"><i style={{ width: `${(item.value / max) * 100}%` }} /></div>
      <b>{item.value.toLocaleString('ko-KR')}</b>
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

function useSalesSummary(range) {
  const { start, end } = range
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState({ data: null, error: false, key: '' })
  const key = `${start}:${end}:${revision}`
  useEffect(() => {
    let active = true
    fetchAdminSalesSummary({ start, end }).then(data => {
      if (active) setState({ data, error: false, key })
    }).catch(() => {
      if (active) setState({ data: null, error: true, key })
    })
    return () => { active = false }
  }, [start, end, key])
  return { data: state.key === key ? state.data : null, error: state.key === key && state.error,
    loading: state.key !== key, retry: () => setRevision(n => n + 1) }
}

function SalesCharts({ sales, history = false, navigate }) {
  if (sales.loading) return <div className="admin-dashboard-empty" role="status">판매 현황을 불러오는 중입니다.</div>
  if (sales.error || !sales.data) return <div className="admin-dashboard-refresh" role="alert">판매 현황을 불러오지 못했습니다.<button className="btn btn-ghost btn-sm" onClick={sales.retry}>다시 시도</button></div>
  return <>
    <div className="admin-dashboard-grid admin-dashboard-chart-grid">
      <DashboardCard title={history ? '일자별 결제금액 추이' : '최근 7일 결제금액 추이'} kicker="PAYMENT OVERVIEW" className="admin-dashboard-chart-card" action={!history ? '지난 현황 보기' : undefined} onAction={() => navigate('adminHistory')}>
        <PaymentChart data={sales.data.daily} />
        <p className="admin-dashboard-demo-note">결제 완료 주문 · 쿠폰 할인 후 배송비 포함 · 한국 시간 기준</p>
      </DashboardCard>
      <DashboardCard title="카테고리별 판매량" kicker="CATEGORY MIX" className="admin-dashboard-chart-card">
        <CategoryChart data={sales.data.categories} />
        <p className="admin-dashboard-demo-note">{history ? '선택 기간' : '최근 7일'} 결제 완료 주문의 상품 수량</p>
      </DashboardCard>
    </div>
    {sales.data.order_count === 0 && <p className="admin-dashboard-empty" role="status">선택한 기간의 판매 데이터가 없습니다.</p>}
    {sales.data.legacy_order_count > 0 && <p className="admin-dashboard-demo-note">결제 시각 기록 도입 전 주문 {sales.data.legacy_order_count}건은 주문 생성일로 집계됩니다.</p>}
  </>
}

function AdminHistoryContent() {
  const { navigate } = useStore()
  const [range, setRange] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    const saved = { start: params.get('start') || '', end: params.get('end') || '' }
    return validSalesRange(saved) ? saved : salesDateRange(30)
  })
  const [draft, setDraft] = useState(range)
  const [rangeError, setRangeError] = useState('')
  const sales = useSalesSummary(range)
  const selectRange = next => {
    if (!validSalesRange(next)) {
      setRangeError('시작일과 종료일을 확인해 주세요. 한 번에 최대 3,660일까지 조회할 수 있습니다.')
      return
    }
    setRangeError('')
    setRange(next)
    setDraft(next)
    window.history.replaceState(window.history.state, '', `/admin/history?${new URLSearchParams(next)}`)
  }
  const summary = sales.data
  const metrics = [
    { key: 'total_payment', label: '총 결제금액', unit: '원', icon: 'credit-card' },
    { key: 'order_count', label: '결제 완료 주문', unit: '건', icon: 'package' },
    { key: 'quantity', label: '판매 상품 총수량', unit: '개', icon: 'cart' },
    { key: 'average_payment', label: '주문당 평균 결제금액', unit: '원', icon: 'credit-card' },
  ]
  return <div className="wrap page admin-dashboard-page">
    <div className="admin-head admin-dashboard-head"><h1>지난 현황 보기</h1><p>기간별 판매 현황</p></div>
    <button className="btn btn-ghost btn-sm" onClick={() => navigate('adminDashboard')}>대시보드로 돌아가기</button>
    <section className="admin-dashboard-card admin-sales-filters" aria-label="판매 현황 조회 기간">
      <div className="admin-sales-presets">{[7, 30, 90].map(days => {
        const preset = salesDateRange(days)
        const selected = preset.start === range.start && preset.end === range.end
        return <button key={days} className={`btn btn-sm ${selected ? 'btn-primary' : 'btn-soft'}`} aria-pressed={selected} onClick={() => selectRange(preset)}>최근 {days}일</button>
      })}</div>
      <form className="admin-sales-dates" onSubmit={event => {
        event.preventDefault()
        const values = new FormData(event.currentTarget)
        selectRange({ start: String(values.get('start')), end: String(values.get('end')) })
      }}>
        <label>시작일<input name="start" type="date" required value={draft.start} onChange={event => setDraft({ ...draft, start: event.target.value })} /></label>
        <span aria-hidden="true">~</span>
        <label>종료일<input name="end" type="date" required value={draft.end} onChange={event => setDraft({ ...draft, end: event.target.value })} /></label>
        <button className="btn btn-soft btn-sm" type="submit">기간 조회</button>
      </form>
      {rangeError && <p role="alert">{rangeError}</p>}
      <p className="admin-dashboard-demo-note">조회 기간: {range.start} ~ {range.end} · 직전 동일 길이의 기간과 비교합니다.</p>
    </section>
    <section className="admin-dashboard-metrics admin-sales-metrics" aria-label="기간별 운영 지표">
      {metrics.map(metric => <DashboardMetric key={metric.key} {...metric} value={summary?.[metric.key] || 0} loading={sales.loading} error={sales.error}
        comparison={summary && metric.key !== 'average_payment' ? salesChange(summary[metric.key], summary.previous[metric.key]) : undefined} />)}
    </section>
    <SalesCharts sales={sales} history navigate={navigate} />
    {summary && <DashboardCard title="기간 내 베스트 상품" kicker="BEST PRODUCTS">
      {!summary.best.length ? <div className="admin-dashboard-empty">선택한 기간의 판매 데이터가 없습니다.</div> : <div className="admin-sales-table-wrap"><table className="admin-sales-table">
        <thead><tr><th scope="col">순위</th><th scope="col">상품명</th><th scope="col">판매수량</th><th scope="col">상품금액</th></tr></thead>
        <tbody>{summary.best.map((product, index) => <tr key={product.product_id}><td>{index + 1}</td><td>{product.name}</td><td>{product.quantity.toLocaleString('ko-KR')}개</td><td>{won(product.revenue)}</td></tr>)}</tbody>
      </table></div>}
      <p className="admin-dashboard-demo-note">판매수량 기준 상위 100개 · 상품금액은 주문 당시 단가 × 수량이며 주문 쿠폰 할인과 배송비 배분 전입니다.</p>
    </DashboardCard>}
  </div>
}

function NeedsAttention({ metrics, loading, errors, navigate }) {
  const items = [
    { key: 'waitingReviewReports', label: '리뷰 신고 접수', unit: '건', view: 'reviews', icon: 'message-circle', tone: metrics.waitingReviewReports > 0 ? 'warning' : '' },
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
      <span className="admin-dashboard-order-main"><b className="admin-dashboard-order-number">{order.toss_order_id || order.order_id}</b><small>{maskDashboardName(order.buyerName)}</small></span>
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
  const sales = useSalesSummary(salesDateRange(7))

  const load = async ({ initial = false } = {}) => {
    if (!initial) setLoading(true)
    const results = await Promise.allSettled([
      fetchAdminProducts(),
      fetchAdminOrders(),
      fetchAdminPartnerships(),
      fetchAdminCustomerInquiries(),
      fetchAdminReviewReports(supabase),
    ])
    const keys = ['products', 'orders', 'partnerships', 'inquiries', 'reviews']
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

  useEffect(() => {
    let active = true
    const refreshReports = () => {
      fetchAdminReviewReports(supabase).then(data => { if (active) setResources(current => ({ ...current, reviews: { data, error: false } })) })
        .catch(() => { if (active) setResources(current => ({ ...current, reviews: { ...current.reviews, error: true } })) })
    }
    const timer = window.setInterval(refreshReports, 15000)
    window.addEventListener('focus', refreshReports)
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', refreshReports) }
  }, [])
  const reviewReports = resources.reviews.data
  const products = resources.products.data
  const orders = resources.orders.data
  const partnerships = resources.partnerships.data
  const inquiries = resources.inquiries.data
  const metrics = useMemo(() => getDashboardMetrics({ products, orders, partnerships, inquiries, reviewReports }), [inquiries, orders, partnerships, products, reviewReports])
  const metricErrors = {
    waitingReviewReports: resources.reviews.error,
    todayOrders: sales.error,
    todayPayment: sales.error,
    preparingOrders: resources.orders.error,
    waitingInquiries: resources.inquiries.error,
    newPartnerships: resources.partnerships.error,
    lowStockProducts: resources.products.error,
    pendingOrders: resources.orders.error,
  }
  const hasError = Object.values(resources).some((resource) => resource.error)

  return <div className="wrap page admin-dashboard-page">
    <div className="admin-head admin-dashboard-head">
      <h1>관리자 대시보드</h1>
      <p>오늘의 운영 현황</p>
    </div>

    {loading ? <div className="empty" role="status"><p>대시보드 운영 데이터를 불러오는 중입니다.</p></div> : <>
      <section className="admin-dashboard-metrics" aria-label="주요 운영 현황">
        <DashboardMetric icon="package" label="오늘 주문" value={sales.data?.daily.at(-1)?.orders || 0} unit="건" loading={sales.loading} error={metricErrors.todayOrders} onClick={() => navigate('adminOrders')} />
        <DashboardMetric icon="credit-card" label="오늘 결제금액" value={sales.data?.daily.at(-1)?.value || 0} unit="원" loading={sales.loading} error={metricErrors.todayPayment} onClick={() => navigate('adminHistory')} />
        <DashboardMetric icon="clock" label="상품 준비중" value={metrics.preparingOrders} unit="건" loading={false} error={metricErrors.preparingOrders} tone={metrics.preparingOrders > 0 ? 'accent' : ''} onClick={() => navigate('adminOrders')} />
        <DashboardMetric icon="message-circle" label="답변 대기 문의" value={metrics.waitingInquiries} unit="건" loading={false} error={metricErrors.waitingInquiries} tone={metrics.waitingInquiries > 0 ? 'warning' : ''} onClick={() => navigate('adminInquiries')} />
        <DashboardMetric icon="leaf" label="신규 협업 제안" value={metrics.newPartnerships} unit="건" loading={false} error={metricErrors.newPartnerships} tone={metrics.newPartnerships > 0 ? 'warning' : ''} onClick={() => navigate('adminPartnerships')} />
        <DashboardMetric icon="alert-circle" label="재고 부족 상품" value={metrics.lowStockProducts} unit="개" loading={false} error={metricErrors.lowStockProducts} tone={metrics.lowStockProducts > 0 ? 'warning' : ''} onClick={() => navigate('adminProducts')} />
        <DashboardMetric icon="message-circle" label="리뷰 관리" value={metrics.waitingReviewReports} unit="건" loading={false} error={metricErrors.waitingReviewReports} tone={metrics.waitingReviewReports > 0 ? 'warning' : ''} onClick={() => navigate('adminReviews')} />
      </section>

      <SalesCharts sales={sales} navigate={navigate} />

      <div className="admin-dashboard-grid admin-dashboard-operation-grid">
        <DashboardCard title="확인이 필요한 항목" kicker="NEEDS ATTENTION">
          <NeedsAttention metrics={metrics} loading={false} errors={metricErrors} navigate={navigate} />
        </DashboardCard>
        <div className="admin-dashboard-operation-column">
          <DashboardCard title="최근 주문" kicker="LATEST ORDERS" action="전체 보기" onAction={() => navigate('adminOrders')}>
            <RecentOrders orders={orders} loading={false} error={resources.orders.error} navigate={navigate} />
          </DashboardCard>
          <DashboardCard title="리뷰 관리 내역" kicker="REVIEW REPORTS" action="전체 보기" onAction={() => navigate('adminReviews')} className="admin-dashboard-review-card">
            {resources.reviews.error ? <div className="admin-dashboard-empty" role="alert">신고 내역을 불러오지 못했습니다.</div> : <>
              <div className="admin-dashboard-empty">접수 대기 {metrics.waitingReviewReports}건 · 전체 신고 {reviewReports.length}건</div>
              <div className="admin-dashboard-orders-list">{reviewReports.slice(0, 5).map(report => <button className="admin-dashboard-order-row" key={report.id} onClick={() => navigate('adminReviews')}>
                <span className="admin-dashboard-order-main"><b>{report.product_name}</b><small>{report.reason} · {new Date(report.created_at).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}</small></span>
                <span className={'status ' + (report.status === 'received' ? 'status-active' : 'status-done')}>{report.status === 'received' ? '접수 대기' : report.status === 'deleted' ? '삭제 완료' : '리뷰 유지'}</span><Icon name="chevron-right" size={15} />
              </button>)}</div>
            </>}
          </DashboardCard>
        </div>
      </div>
      {hasError && <div className="admin-dashboard-refresh" role="status"><span>일부 운영 데이터를 불러오지 못했습니다.</span><button type="button" className="btn btn-ghost btn-sm" onClick={() => void load()}>다시 시도</button></div>}
    </>}
  </div>
}

export default function AdminDashboard() {
  const { view } = useStore()
  return <AdminGate>{view === 'adminHistory' ? <AdminHistoryContent /> : <AdminDashboardContent />}</AdminGate>
}
