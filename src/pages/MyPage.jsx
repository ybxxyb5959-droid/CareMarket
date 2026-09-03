import { useStore } from '../store'
import Icon from '../components/Icon'

const MENU = [
  { title: '주문 · 배송 조회', desc: '최근 구매한 웰빙 식단 콜드체인 현황', view: 'orders' },
  { title: '건강 목표 및 보조조건 재설정', desc: '상품 카드에 강조되는 영양 지표 변경', view: 'goalSetup' },
  { title: '관리자 콘솔 · 상품 관리', desc: '웰빙 식품 데이터 및 영양 규격 관리', view: 'adminProducts' },
  { title: '관리자 콘솔 · 주문 관리', desc: '고객 주문 출고 처리 및 운송장 갱신', view: 'adminOrders' },
]

export default function MyPage() {
  const { user, goal, subFilters, allergies, navigate } = useStore()
  return (
    <div className="wrap page">
      <div className="page-narrow" style={{ margin: '0 auto' }}>
        <div className="profile">
          <div className="profile-id">
            <div className="avatar">{user.name.slice(0, 1)}</div>
            <div>
              <h2>{user.name} <span className="tag tag-soft">{user.tier}</span></h2>
              <div className="em">{user.email}</div>
            </div>
          </div>
          <div className="profile-stats">
            <div><div className="k">보유 포인트</div><div className="v">{user.points.toLocaleString('ko-KR')}P</div></div>
            <div><div className="k">웰빙 쿠폰</div><div className="v g">{user.coupons}장</div></div>
          </div>
        </div>

        <div className="section-card">
          <div className="sc-head">
            <h3><Icon name="sparkles" size={17} style={{ color: 'var(--brand-500)' }} /> 나의 맞춤 웰빙 프로필</h3>
            <button className="td-link" onClick={() => navigate('goalSetup')} style={{ fontSize: 13 }}>재설정하기</button>
          </div>
          <div className="prof-grid">
            <div className="prof-cell"><div className="k">현재 목표</div><div className="v">{goal}</div></div>
            <div className="prof-cell"><div className="k">선택 보조조건</div><div className="v">{subFilters.join(', ') || '없음'}</div></div>
            <div className="prof-cell"><div className="k">알레르기 제외</div><div className="v r">{allergies.join(', ') || '제외 없음'}</div></div>
          </div>
        </div>

        <div className="menu-list">
          {MENU.map((m, i) => (
            <div key={i} className="menu-row" onClick={() => navigate(m.view)}>
              <div>
                <div className="m-title">{m.title}</div>
                <div className="m-desc">{m.desc}</div>
              </div>
              <Icon name="chevron-right" size={17} style={{ color: 'var(--faint)' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
