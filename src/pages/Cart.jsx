import { isSupplement, ingredientDescription } from '../../supabase/functions/_shared/product-type.js'
import { AllergenBadges } from '../components/GoalBadge'
import { useMemo, useState } from 'react'
import { useStore } from '../store'
import Icon from '../components/Icon'
import { won } from '../lib/format'
import { calculateCartPricing } from '../lib/cart'
import { GOAL_NUTRIENTS, NUTRIENT_META, fmtNutrient } from '../lib/nutrition'
import CartAiInsight from '../components/CartAiInsight'
import { IS_MIDTERM_PRESENTATION } from '../lib/presentation'


export default function Cart() {
  const {
    cart, changeCartQty, removeFromCart, openProduct, navigate,
    checkout, goal, allergies, cartLoading, cartPending, cartError, reloadCart,
  } = useStore()
  const [optimisticQuantities, setOptimisticQuantities] = useState({})
  const [productsExpanded, setProductsExpanded] = useState(false)
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
  const goalKeys = GOAL_NUTRIENTS[goal]?.length ? GOAL_NUTRIENTS[goal] : ['calories']
  const isBusy = cartLoading || cartPending > 0
  const canCollapseProducts = displayCart.length > 3
  const visibleProducts = canCollapseProducts && !productsExpanded ? displayCart.slice(0, 3) : displayCart

  const productNutri = (product) => {
    if (isSupplement(product)) return ingredientDescription(product)
    return goalKeys
      .map((key) => {
        const value = product.nutrition?.[key]
        const available = product.nutritionAvailability?.[key] !== false && value != null && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0
        return `${NUTRIENT_META[key].label} ${available ? fmtNutrient(key, Number(value)) : '정보 없음'}`
      })
      .join(' · ')
  }

  const updateQuantity = async (productId, currentQuantity, delta) => {
    const nextQuantity = Math.max(1, currentQuantity + delta)
    if (delta > 0 && nextQuantity > cart.find(item => item.product.id === productId)?.product.stock) return
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
            <p>{IS_MIDTERM_PRESENTATION ? '담은 상품의 수량과 영양정보 단순 합계를 확인해 주세요.' : '담은 상품과 수량을 확인한 뒤 주문을 진행해 주세요.'}</p>
          </div>
          <span>총 {cart.length}종 · {cartCount}개</span>
        </div>

        {cartLoading && cart.length === 0 ? (
          <div className="empty cart-empty" role="status">
            <Icon name="cart" size={44} />
            <h3>장바구니를 불러오고 있습니다.</h3>
            <p>담아둔 상품을 확인하는 중입니다.</p>
          </div>
        ) : cartError ? (
          <div className="empty cart-empty" role="alert">
            <Icon name="alert-circle" size={44} />
            <h3>장바구니를 불러오지 못했어요.</h3>
            <p>잠시 후 다시 시도해 주세요.</p>
            <button type="button" className="btn btn-primary" onClick={reloadCart}>다시 시도</button>
          </div>
        ) : cart.length === 0 ? (
          <div className="empty cart-empty">
            <Icon name="cart" size={44} />
            <h3>장바구니가 비어 있어요.</h3>
            <p>건강한 선택을 담아보세요.</p>
            <button className="btn btn-primary" onClick={() => navigate('products')}>상품 둘러보기</button>
          </div>
        ) : (
          <>
            <div className="cart-layout">
              <section className="cart-products" aria-labelledby="cart-products-title" aria-busy={isBusy}>
                <div className="cart-section-head">
                  <h2 id="cart-products-title">{IS_MIDTERM_PRESENTATION ? '담은 상품' : '주문 상품'}</h2>
                  <span>{cart.length}종 · {cartCount}개</span>
                </div>

                <div id="cart-product-list">
                {visibleProducts.map(({ product, quantity }) => (
                  <article key={product.id} className="cart-item">
                    <button type="button" className="ci-image-button" onClick={() => openProduct(product)} aria-label={`${product.name} 상세 보기`}>
                      <img src={product.image} alt="" onError={(event) => { event.currentTarget.style.visibility = 'hidden' }} />
                    </button>
                    <div className="ci-info">
                      <div className="ci-brand">{product.brand}</div>
                      <button type="button" className="ci-name" onClick={() => openProduct(product)}>{product.name}</button>
                      <div><AllergenBadges product={product} allergies={allergies} /></div>
                      <div className="ci-nutri">
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
                          <button type="button" aria-label={`${product.name} 수량 증가`} disabled={quantity >= product.stock || isBusy || Boolean(cartError)} onClick={() => updateQuantity(product.id, quantity, 1)}><Icon name="plus" size={14} /></button>
                        </div>
                      </div>
                      {quantity >= product.stock && <small role="status">현재 구매 가능한 최대 수량입니다.</small>}
                      <button type="button" className="del" onClick={() => removeItem(product.id)} disabled={isBusy || Boolean(cartError)}>
                        <Icon name="trash" size={15} /> 삭제
                      </button>
                    </div>
                  </article>
                ))}
                </div>
                {canCollapseProducts && (
                  <button type="button" className="btn btn-soft btn-sm cart-products-toggle" aria-expanded={productsExpanded} aria-controls="cart-product-list" onClick={() => setProductsExpanded((expanded) => !expanded)}>
                    {productsExpanded ? '상품 접기' : `나머지 ${displayCart.length - 3}종 더 보기`}
                    <Icon name={productsExpanded ? 'chevron-up' : 'chevron-down'} size={16} />
                  </button>
                )}
              </section>

              <aside className="summary cart-order-summary" aria-labelledby="cart-summary-title" aria-live="polite">
                <div className="cart-summary-head">
                  <h2 id="cart-summary-title">{IS_MIDTERM_PRESENTATION ? '장바구니 금액' : '주문 금액'}</h2>
                  {cartPending > 0 && <span>금액 반영 중…</span>}
                </div>
                <div className="sum-row"><span>상품금액</span><b>{won(cartTotal)}</b></div>
                {!IS_MIDTERM_PRESENTATION && <><div className="sum-row"><span>배송비</span><b>{deliveryFee === 0 ? '무료' : won(deliveryFee)}</b></div>
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
                <p className="cart-summary-note">결제 단계에서 배송지와 결제수단을 입력합니다.</p></>}
                {IS_MIDTERM_PRESENTATION && <p className="cart-summary-note">결제 기능은 다음 개발 단계에서 연결됩니다.</p>}
              </aside>

              <section className="cart-wellness" aria-labelledby="cart-wellness-title">
                <div className="cart-wellness-content">
                  <CartAiInsight cartOverride={displayCart} />
                </div>
              </section>
            </div>

            {!IS_MIDTERM_PRESENTATION && <div className="cart-mobile-checkout" aria-label="모바일 주문 요약">
              <div><span>예상 결제금액</span><strong>{won(paymentTotal)}</strong></div>
              <button className="btn btn-primary" disabled={isBusy || Boolean(cartError)} onClick={checkout}>{cartCount}개 주문하기</button>
            </div>}
          </>
        )}
      </div>
    </div>
  )
}
