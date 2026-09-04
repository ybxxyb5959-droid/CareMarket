import { useStore } from '../store'
import Icon from '../components/Icon'

const MENU = [
  { title: '주문 · 배송 조회', desc: '최근 주문과 배송 현황', view: 'orders' },
  { title: '건강 목표 및 보조조건 재설정', desc: '상품에 강조되는 영양 지표 변경', view: 'goalSetup' },
]

export default function MyPage() {
  const { user, isLoggedIn, goal, subFilters, allergies, navigate, logout } = useStore()

  if (!isLoggedIn || !user) {
    return (
      <div className="wrap page">
        <div className="page-slim" style={{ margin: '0 auto' }}>
          <div className="panel" style={{ textAlign: 'center' }}>
            <div className="auth-head">
              <h2>로그인이 필요합니다</h2>
              <p>로그인하면 맞춤 목표·보조조건과 주문 내역을 확인할 수 있습니다.</p>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 8 }}>
              <button className="btn btn-primary" onClick={() => navigate('login')}>로그인</button>
              <button className="btn btn-ghost" onClick={() => navigate('register')}>회원가입</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

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
            <div><div className="k">쿠폰</div><div className="v g">{user.coupons}장</div></div>
          </div>
        </div>

        <div className="section-card">
          <div className="sc-head">
            <h3><Icon name="sparkles" size={17} style={{ color: 'var(--brand-500)' }} /> 나의 맞춤 쇼핑 기준</h3>
            <button className="td-link" onClick={() => navigate('goalSetup')} style={{ fontSize: 13 }}>재설정하기</button>
          </div>
          <div className="prof-grid">
            <div className="prof-cell"><div className="k">현재 목표</div><div className="v">{goal || '미설정'}</div></div>
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
          <div className="menu-row" onClick={logout}>
            <div>
              <div className="m-title">로그아웃</div>
              <div className="m-desc">현재 계정에서 로그아웃합니다.</div>
            </div>
            <Icon name="chevron-right" size={17} style={{ color: 'var(--faint)' }} />
          </div>
        </div>
      </div>
    </div>
  )
}
