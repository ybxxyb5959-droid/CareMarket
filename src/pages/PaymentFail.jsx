import { useStore } from '../store'
import Icon from '../components/Icon'

export default function PaymentFail() {
  const { navigate } = useStore()
  return (
    <div className="wrap page page-narrow">
      <div className="empty">
        <Icon name="alert-circle" size={42} />
        <h2>결제가 완료되지 않았어요</h2>
        <p>결제가 취소되었거나 진행 중 문제가 발생했습니다. 장바구니 상품은 그대로 유지됩니다.</p>
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => navigate('cart')}>장바구니로 돌아가기</button>
          <button className="btn btn-primary" onClick={() => navigate('checkout')}>다시 결제하기</button>
        </div>
      </div>
    </div>
  )
}
