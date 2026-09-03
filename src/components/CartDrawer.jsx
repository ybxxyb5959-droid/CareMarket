import { useStore } from '../store'
import Icon from './Icon'
import { won } from '../lib/format'

export default function CartDrawer() {
  const {
    drawerOpen, setDrawerOpen, cart, setQty, removeFromCart,
    cartTotal, deliveryFee, cartCount, checkout, navigate,
  } = useStore()

  if (!drawerOpen) return null

  return (
    <>
      <div className="overlay" onClick={() => setDrawerOpen(false)} />
      <aside className="drawer" aria-label="장바구니">
        <div className="drawer-head">
          <div className="dh-title">
            <Icon name="cart" size={19} style={{ color: 'var(--brand-500)' }} />
            <h3>내 장바구니</h3>
            <span className="tag tag-soft">{cartCount}개</span>
          </div>
          <button className="icon-btn" onClick={() => setDrawerOpen(false)} aria-label="닫기">
            <Icon name="x" size={19} />
          </button>
        </div>

        <div className="drawer-body">
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--faint)' }}>
              <Icon name="leaf" size={38} style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: 13 }}>담긴 상품이 없습니다.</p>
            </div>
          ) : (
            cart.map(({ product, quantity }) => (
              <div key={product.id} className="drawer-item">
                <img src={product.image} alt={product.name} onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="di-brand">{product.brand}</div>
                  <div className="di-name">{product.name}</div>
                  <div className="di-price">{won(product.price * quantity)}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                    <div className="qty-stepper">
                      <button onClick={() => setQty(product.id, quantity - 1)}><Icon name="minus" size={13} /></button>
                      <span>{quantity}</span>
                      <button onClick={() => setQty(product.id, quantity + 1)}><Icon name="plus" size={13} /></button>
                    </div>
                    <button className="link-del" onClick={() => removeFromCart(product.id)}>삭제</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="drawer-foot">
            <div className="sum-row"><span>상품 합계</span><b>{won(cartTotal)}</b></div>
            <div className="sum-row"><span>신선 배송비 (4만원 이상 무료)</span><b>{deliveryFee === 0 ? '무료' : won(deliveryFee)}</b></div>
            <div className="sum-total">
              <span className="lbl">결제 예정</span>
              <span className="val">{won(cartTotal + deliveryFee)}</span>
            </div>
            <div className="drawer-cta">
              <button className="btn btn-ghost" onClick={() => { setDrawerOpen(false); navigate('cart') }}>장바구니 상세</button>
              <button className="btn btn-primary" onClick={checkout}>주문하기</button>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
