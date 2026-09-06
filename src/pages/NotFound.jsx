import { useStore } from '../store'
import Icon from '../components/Icon'

export default function NotFound() {
  const { navigate } = useStore()

  return (
    <div className="wrap page page-narrow exception-page">
      <div className="empty" role="status">
        <span className="exception-code">404</span>
        <Icon name="alert-circle" size={42} />
        <h1>페이지를 찾을 수 없습니다.</h1>
        <p>요청하신 페이지가 삭제되었거나 주소가 변경되었을 수 있어요.</p>
        <div className="exception-actions">
          <button type="button" className="btn btn-primary" onClick={() => navigate('main')}>홈으로 돌아가기</button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('products')}>전체 상품 보기</button>
        </div>
      </div>
    </div>
  )
}
