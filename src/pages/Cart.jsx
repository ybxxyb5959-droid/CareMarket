import { useMemo, useState } from 'react'
import { useStore } from '../store'
import Icon from '../components/Icon'
import { won } from '../lib/format'
import { calculateCartPricing } from '../lib/cart'
import { GOAL_NUTRIENTS, NUTRIENT_META, cartNutritionTotals, fmtNutrient } from '../lib/nutrition'
import CartAiInsight from '../components/CartAiInsight'

const SUMMARY_ORDER = ['sodium', 'sugar', 'protein', 'calories']

export default function Cart() {
  const {
    cart, changeCartQty, removeFromCart, openProduct, navigate,
    checkout, goal, cartLoading, cartPending, cartError, reloadCart,
  } = useStore()
  const [optimisticQuantities, setOptimisticQuantities] = useState({})

  const displayCart = useMemo(() => cart.map((item) => ({
    ...item,
    quantity: optimisticQuantities[item.product.id] ?? item.quantity,
  })), [cart, optimisticQuantities])
  const {
    productTotal: cartTotal,
    deliveryFee,
    paymentTotal,
    freeDeliveryRemaining,
  } = calculateCartPricing(displayCart)
  const cartCount = displayCart.reduce((sum, item) => sum + item.quantity, 0)
  const goalKeys = GOAL_NUTRIENTS[goal] || []
  const isSupplement = goal === '영양제 탐색'
  const totals = cartNutritionTotals(displayCart)
  const supplementItems = displayCart.filter((c) => c.product.category === '영양제·비타민')
  const isBusy = cartLoading || cartPending > 0

  const productNutri = (product) => {
    if (isSupplement) return product.nutrition.special || `${product.category} 카테고리`
    return goalKeys
      .map((key) => `${NUTRIENT_META[key].label} ${fmtNutrient(key, product.nutrition[key])}`)
      .join(' · ')
  }

  const updateQuantity = async (productId, currentQuantity, delta) => {
    const nextQuantity = Math.max(1, currentQuantity + delta)
    if (nextQuantity === currentQuantity) return

    setOptimisticQuantities((current) => ({ ...current, [productId]: nextQuantity }))
    await changeCartQty(productId, delta)
    setOptimisticQuantities((current) => {
      if (current[productId] !== nextQuantity) return current
      const next = { ...current }
      delete next[productId]
      return next
    })
  }

  const removeItem = (productId) => {
    setOptimisticQuantities((current) => {
      if (!(productId in current)) return current
      const next = { ...current }
      delete next[productId]
      return next
    })
    return removeFromCart(productId)
  }

  return (
    <div className="wrap page cart-page">
      <div className="page-mid cart-page-inner">
        <div className="page-head cart-page-head">
          <div>
            <h1 className="page-title">장바구니</h1>
            <p>담은 상품과 수량을 확인한 뒤 주문을 진행해 주세요.</p>
          </div>
          <span>총 {cart.length}종 · {cartCount}개</span>
        </div>

        {cartError && <div className="cart-status" role="alert">{cartError} <button className="btn btn-soft btn-sm" onClick={reloadCart}>다시 불러오기</button></div>}
        {cartLoading && <p className="cart-status" role="status">장바구니를 불러오고 있습니다.</p>}
        {cart.length === 0 ? (
          <div className="empty cart-empty">
            <Icon name="cart" size={44} />
            <h3>{cartLoading ? '잠시만 기다려 주세요.' : cartError ? '장바구니를 확인할 수 없습니다.' : '장바구니에 담긴 상품이 없습니다.'}</h3>
            <p>나에게 맞는 웰빙 식품을 둘러보고 장바구니를 채워보세요.</p>
            <button className="btn btn-primary" onClick={() => navigate('main')}>상품 둘러보기</button>
          </div>
        ) : (
          <>
            <div className="cart-layout">
              <section className="cart-products" aria-labelledby="cart-products-title" aria-busy={isBusy}>
                <div className="cart-section-head">
                  <h2 id="cart-products-title">주문 상품</h2>
                  <span>{cart.length}종 · {cartCount}개</span>
                </div>

                {displayCart.map(({ product, quantity }) => (
                  <article key={product.id} className="cart-item">
                    <button type="button" className="ci-image-button" onClick={() => openProduct(product)} aria-label={`${product.name} 상세 보기`}>
                      <img src={product.image} alt="" onError={(event) => { event.currentTarget.style.visibility = 'hidden' }} />
                    </button>
                    <div className="ci-info">
                      <div className="ci-brand">{product.brand}</div>
                      <button type="button" className="ci-name" onClick={() => openProduct(product)}>{product.name}</button>
                      <div className="ci-unit-price"><span>판매가</span><strong>{won(product.price)}</strong></div>
                      <div className="ci-nutri">
                        <span className="ci-nutri-goal">{goal}</span>
                        <span className="ci-nutri-vals">{productNutri(product)}</span>
                      </div>
                    </div>
                    <div className="ci-purchase">
                      <div className="ci-item-total">
                        <span>상품 합계</span>
                        <strong>{won(product.price * quantity)}</strong>
                      </div>
                      <div className="ci-controls">
                        <span className="ci-quantity-label">수량</span>
                        <div className="qty-stepper">
                          <button type="button" aria-label={`${product.name} 수량 감소`} disabled={quantity <= 1 || Boolean(cartError)} onClick={() => updateQuantity(product.id, quantity, -1)}><Icon name="minus" size={14} /></button>
                          <span aria-live="polite">{quantity}</span>
                          <button type="button" aria-label={`${product.name} 수량 증가`} disabled={Boolean(cartError)} onClick={() => updateQuantity(product.id, quantity, 1)}><Icon name="plus" size={14} /></button>
                        </div>
                      </div>
                      <button type="button" className="del" onClick={() => removeItem(product.id)} disabled={isBusy || Boolean(cartError)}>
                        <Icon name="trash" size={15} /> 삭제
                      </button>
                    </div>
                  </article>
                ))}
              </section>

              <aside className="summary cart-order-summary" aria-labelledby="cart-summary-title" aria-live="polite">
                <div className="cart-summary-head">
                  <h2 id="cart-summary-title">주문 금액</h2>
                  {cartPending > 0 && <span>금액 반영 중…</span>}
                </div>
                <div className="sum-row"><span>상품금액</span><b>{won(cartTotal)}</b></div>
                <div className="sum-row"><span>배송비</span><b>{deliveryFee === 0 ? '무료' : won(deliveryFee)}</b></div>
                <div className={`delivery-progress${deliveryFee === 0 ? ' complete' : ''}`}>
                  <Icon name={deliveryFee === 0 ? 'check' : 'truck'} size={15} />
                  <span>{deliveryFee === 0 ? '무료배송이 적용됐어요' : `무료배송까지 ${won(freeDeliveryRemaining)} 남았어요`}</span>
                </div>
                <div className="sum-total">
                  <span className="lbl">예상 결제금액</span>
                  <span className="val">{won(paymentTotal)}</span>
                </div>
                <button className="btn btn-primary btn-lg btn-block cart-checkout-button" disabled={isBusy || Boolean(cartError)} onClick={checkout}>
                  {cartCount}개 상품 주문하기 <Icon name="chevron-right" size={17} />
                </button>
                <p className="cart-summary-note">결제 단계에서 배송지와 결제수단을 입력합니다.</p>
              </aside>

              <details className="cart-wellness">
                <summary>
                  <span><Icon name="leaf" size={17} /> 영양 합산 · AI 분석</span>
                  <small>장바구니 구성을 건강 관점에서 확인해 보세요</small>
                  <Icon name="chevron-down" size={17} />
                </summary>
                <div className="cart-wellness-content">
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
                  <CartAiInsight />
                </div>
              </details>
            </div>

            <div className="cart-mobile-checkout" aria-label="모바일 주문 요약">
              <div><span>예상 결제금액</span><strong>{won(paymentTotal)}</strong></div>
              <button className="btn btn-primary" disabled={isBusy || Boolean(cartError)} onClick={checkout}>{cartCount}개 주문하기</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
