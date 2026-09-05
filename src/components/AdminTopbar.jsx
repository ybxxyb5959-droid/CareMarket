import { useStore } from '../store'

export default function AdminTopbar() {
  const { view, navigate, logout } = useStore()
  return (
    <header className="admin-topbar">
      <div className="admin-topbar-inner">
        <button className="admin-wordmark" onClick={() => navigate('adminProducts')}>CareMarket <b>Admin</b></button>
        <nav className="admin-topnav" aria-label="관리자 메뉴">
          <button className={view === 'adminProducts' ? 'on' : ''} onClick={() => navigate('adminProducts')}>상품 관리</button>
          <button className={view === 'adminOrders' ? 'on' : ''} onClick={() => navigate('adminOrders')}>주문 · 출고 관리</button>
          <button className={view === 'adminPartnerships' ? 'on' : ''} onClick={() => navigate('adminPartnerships')}>협업 제안</button>
        </nav>
        <div className="admin-top-actions">
          <button onClick={() => navigate('main')}>스토어 보기</button>
          <button className="admin-logout" onClick={logout}>로그아웃</button>
        </div>
      </div>
    </header>
  )
}
