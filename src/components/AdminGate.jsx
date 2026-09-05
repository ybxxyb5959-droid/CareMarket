import Icon from './Icon'
import { useStore } from '../store'

export default function AdminGate({ children }) {
  const { authLoading, profileLoading, isLoggedIn, isAdmin, navigate } = useStore()

  if (authLoading || (isLoggedIn && profileLoading)) {
    return <div className="wrap page"><div className="empty"><p>관리자 권한을 확인하고 있습니다.</p></div></div>
  }

  if (!isLoggedIn) {
    return (
      <div className="wrap page"><div className="empty">
        <Icon name="shield-alert" size={34} />
        <h3>로그인이 필요한 페이지입니다.</h3>
        <p>관리자 상품 및 주문 관리는 로그인 후 이용할 수 있습니다.</p>
        <button className="btn btn-primary" onClick={() => navigate('login')}>로그인하기</button>
      </div></div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="wrap page"><div className="empty">
        <Icon name="shield-alert" size={34} />
        <h3>관리자 권한이 필요한 페이지입니다.</h3>
        <p>현재 계정으로는 관리자 데이터에 접근할 수 없습니다.</p>
        <button className="btn btn-primary" onClick={() => navigate('main')}>상품 둘러보기</button>
      </div></div>
    )
  }

  return children
}
