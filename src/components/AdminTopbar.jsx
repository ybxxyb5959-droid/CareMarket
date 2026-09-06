import { useStore } from '../store'

export default function AdminTopbar() {
  const { view, navigate, logout } = useStore()
  return (
    <header className="admin-topbar">
      <div className="admin-topbar-inner">
        <button className="admin-wordmark" onClick={() => navigate('adminDashboard')}>CareMarket <b>Admin</b></button>
        <nav className="admin-topnav" aria-label="관리자 메뉴">
          <button className={['adminDashboard', 'adminHistory'].includes(view) ? 'on' : ''} onClick={() => navigate('adminDashboard')}>대시보드</button>
          <button className={view === 'adminProducts' ? 'on' : ''} onClick={() => navigate('adminProducts')}>상품 관리</button>
          <button className={view === 'adminOrders' ? 'on' : ''} onClick={() => navigate('adminOrders')}>주문 · 출고 관리</button>
          <button className={view === 'adminPartnerships' ? 'on' : ''} onClick={() => navigate('adminPartnerships')}>협업 제안</button>
          <button className={view === 'adminInquiries' ? 'on' : ''} onClick={() => navigate('adminInquiries')}>1:1 문의 관리</button>
        </nav>
        <div className="admin-top-actions">
          <button onClick={() => navigate('main')}>스토어 보기</button>
          <button className="admin-logout" onClick={logout}>로그아웃</button>
        </div>
      </div>
    </header>
  )
}
