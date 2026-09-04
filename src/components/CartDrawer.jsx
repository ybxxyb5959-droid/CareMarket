import { useStore } from '../store'
import Icon from './Icon'
import { won } from '../lib/format'

export default function CartDrawer() {
  const {
    drawerOpen, setDrawerOpen, cart, changeCartQty, removeFromCart,
    cartTotal, deliveryFee, cartCount, checkout, navigate,
    cartLoading, cartPending, cartError, reloadCart,
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
          {cartError && <div className="cart-status" role="alert">{cartError} <button className="btn btn-soft btn-sm" onClick={reloadCart}>다시 불러오기</button></div>}
          {cartLoading && <p className="cart-status" role="status">장바구니를 불러오고 있습니다.</p>}
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--faint)' }}>
              <Icon name="leaf" size={38} style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: 13 }}>{cartLoading ? '잠시만 기다려 주세요.' : cartError ? '장바구니를 확인할 수 없습니다.' : '담긴 상품이 없습니다.'}</p>
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
                      <button aria-label="수량 감소" disabled={quantity <= 1} onClick={() => changeCartQty(product.id, -1)}><Icon name="minus" size={13} /></button>
                      <span>{quantity}</span>
                      <button aria-label="수량 증가" onClick={() => changeCartQty(product.id, 1)}><Icon name="plus" size={13} /></button>
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
              <button className="btn btn-primary" disabled={cartLoading || cartPending > 0 || Boolean(cartError)} onClick={checkout}>주문하기</button>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
