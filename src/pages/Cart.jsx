import { useStore } from '../store'
import Icon from '../components/Icon'
import { won } from '../lib/format'
import { GOAL_NUTRIENTS, NUTRIENT_META, cartNutritionTotals, fmtNutrient } from '../lib/nutrition'

const SUMMARY_ORDER = ['sodium', 'sugar', 'protein', 'calories']

export default function Cart() {
  const {
    cart, setQty, removeFromCart, openProduct, navigate,
    cartTotal, deliveryFee, checkout, showToast, goal,
  } = useStore()

  const goalKeys = GOAL_NUTRIENTS[goal] || []
  const isSupplement = goal === '영양제 탐색'
  const totals = cartNutritionTotals(cart)
  const supplementItems = cart.filter((c) => c.product.category === '영양제 탐색')

  // 상품별 · 현재 목표 기준 핵심 영양(1회 제공량 기준)
  const productNutri = (p) => {
    if (isSupplement) return p.nutrition.special || `${p.category} 카테고리`
    return goalKeys
      .map((k) => `${NUTRIENT_META[k].label} ${fmtNutrient(k, p.nutrition[k])}`)
      .join(' · ')
  }

  return (
    <div className="wrap page">
      <div className="page-mid" style={{ margin: '0 auto' }}>
        <div className="page-head">
          <h1 className="page-title">장바구니</h1>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>총 {cart.length}개 식품</span>
        </div>

        {cart.length === 0 ? (
          <div className="empty">
            <Icon name="cart" size={44} />
            <h3>장바구니에 담긴 상품이 없습니다.</h3>
            <p>나에게 맞는 웰빙 식단을 둘러보세요.</p>
            <button className="btn btn-primary" onClick={() => navigate('main')}>식품 둘러보기</button>
          </div>
        ) : (
          <div className="cart-layout">
            <div>
              {cart.map(({ product, quantity }) => (
                <div key={product.id} className="cart-item">
                  <img src={product.image} alt={product.name} onClick={() => openProduct(product)} onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />
                  <div className="ci-info">
                    <div className="ci-brand">{product.brand}</div>
                    <div className="ci-name" onClick={() => openProduct(product)}>{product.name}</div>
                    <div className="ci-price">{won(product.price * quantity)}<small>({won(product.price)}/개)</small></div>
                    {/* 상품별 목표 맞춤 영양정보 (1회 제공량 기준) */}
                    <div className="ci-nutri">
                      <span className="ci-nutri-goal">현재 목표 · {goal}</span>
                      <span className="ci-nutri-vals">{productNutri(product)}</span>
                    </div>
                  </div>
                  <div className="ci-ctrl">
                    <div className="qty-stepper">
                      <button onClick={() => setQty(product.id, quantity - 1)}><Icon name="minus" size={14} /></button>
                      <span>{quantity}</span>
                      <button onClick={() => setQty(product.id, quantity + 1)}><Icon name="plus" size={14} /></button>
                    </div>
                    <button className="del" onClick={() => { removeFromCart(product.id); showToast('상품을 삭제했습니다.') }} aria-label="삭제">
                      <Icon name="trash" size={17} />
                    </button>
                  </div>
                </div>
              ))}

              {/* 장바구니 전체 영양 합산 요약 */}
              <div className="nutri-summary">
                <div className="ns-head">
                  <h3>내 장바구니 영양 요약</h3>
                  <span className="ns-goal">현재 목표 · {goal}</span>
                </div>
                <div className="ns-grid">
                  {SUMMARY_ORDER.map((key) => {
                    const on = goalKeys.includes(key)
                    return (
                      <div key={key} className={`ns-cell${on ? ' on' : ''}`}>
                        <div className="ns-k">{NUTRIENT_META[key].total}</div>
                        <div className="ns-v">{fmtNutrient(key, totals[key])}</div>
                      </div>
                    )
                  })}
                </div>

                {isSupplement && supplementItems.length > 0 && (
                  <div className="ns-supp">
                    <div className="ns-supp-title"><Icon name="pill" size={14} /> 담긴 영양제 주요 성분</div>
                    {supplementItems.map(({ product, quantity }) => (
                      <div key={product.id}>· {product.name.split(' (')[0]} <b>×{quantity}</b> — {product.nutrition.special}</div>
                    ))}
                  </div>
                )}

                <p className="ns-note">장바구니 상품과 수량을 기준으로 계산한 단순 합산 정보입니다.</p>
              </div>
            </div>

            <div className="summary">
              <h3>결제 금액 안내</h3>
              <div className="sum-row"><span>총 상품금액</span><b>{won(cartTotal)}</b></div>
              <div className="sum-row"><span>신선 보랭 배송비</span><b>{deliveryFee === 0 ? '무료배송' : won(deliveryFee)}</b></div>
              <div className="sum-row" style={{ color: 'var(--brand-600)', fontWeight: 700 }}><span>웰빙 회원 특별할인</span><span>- 0원</span></div>
              <div className="sum-total">
                <span className="lbl">총 결제금액</span>
                <span className="val">{won(cartTotal + deliveryFee)}</span>
              </div>
              <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: 18 }} onClick={checkout}>
                <Icon name="credit-card" size={17} /> 주문서 작성 및 결제
              </button>
              <p style={{ fontSize: 11.5, color: 'var(--faint)', textAlign: 'center', marginTop: 12 }}>
                실제 결제가 이루어지지 않는 가상 결제입니다.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
