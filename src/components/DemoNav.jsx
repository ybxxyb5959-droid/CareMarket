import { useStore } from '../store'

const TABS = [
  { id: 'register', label: '1·회원가입' },
  { id: 'login', label: '2·로그인' },
  { id: 'goalSetup', label: '3·목표설정' },
  { id: 'main', label: '4·상품목록' },
  { id: 'detail', label: '5·상품상세' },
  { id: 'cart', label: '6·장바구니' },
  { id: 'mypage', label: '7·마이페이지' },
  { id: 'orders', label: '8·주문내역' },
  { id: 'adminProducts', label: '9·관리자·상품' },
  { id: 'adminOrders', label: '10·관리자·주문' },
]

export default function DemoNav() {
  const { view, navigate, cartCount } = useStore()
  return (
    <div className="demobar">
      <div className="demobar-inner">
        <div className="demobar-brand">
          <span className="dot" />
          CareMarket Prototype
        </div>
        <div className="demobar-tabs no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={view === t.id ? 'on' : ''}
              onClick={() => navigate(t.id)}
            >
              {t.id === 'cart' ? `${t.label}(${cartCount})` : t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
