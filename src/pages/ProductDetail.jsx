import { useState } from 'react'
import { useStore } from '../store'
import Icon from '../components/Icon'
import ProductImage from '../components/ProductImage'
import { discountRate, won } from '../lib/format'

const FREE_DELIVERY_THRESHOLD = 40000
const DELIVERY_FEE = 3000
const MAX_PURCHASE_QUANTITY = 99

export default function ProductDetail() {
  const {
    selectedProduct: p, productsLoading, productsError,
    goal, subFilters, allergies, wishlist, toggleWish, addToCart, navigate, setDrawerOpen,
  } = useStore()
  const [tab, setTab] = useState('nutrition')
  const [quantity, setQuantity] = useState(1)
  const [purchasePending, setPurchasePending] = useState(false)

  if (!p) {
    return (
      <div className="wrap page">
        <div className="empty" role={productsError ? 'alert' : undefined}>
          <Icon name={productsError ? 'alert-circle' : 'package'} size={44} />
          <h3>{productsLoading ? '상품을 불러오고 있습니다.' : '선택된 상품이 없습니다.'}</h3>
          <p>{productsError ? '상품 조회 상태를 확인한 뒤 다시 시도해 주세요.' : '잠시만 기다려 주세요.'}</p>
          {!productsLoading && <button className="btn btn-primary" onClick={() => navigate('main')}>상품 목록으로</button>}
        </div>
      </div>
    )
  }

  const wished = wishlist.includes(p.id)
  const n = p.nutrition
  const maxQuantity = Math.max(1, Math.min(Math.floor(p.stock), MAX_PURCHASE_QUANTITY))
  const unavailable = p.stock < 1
  const itemTotal = p.price * quantity
  const estimatedDeliveryFee = itemTotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE
  const estimatedTotal = itemTotal + estimatedDeliveryFee
  const rate = discountRate(p.originalPrice, p.price)
  const matches = {
    저당: n.sugar <= 5,
    저염: n.sodium <= 250,
    고단백: n.protein >= 15,
    '카페인 제외': !p.caffeine,
    '알레르기 제외': !allergies.some((allergen) => p.allergens.includes(allergen)),
  }
  const activeConditions = subFilters.filter((filter) => matches[filter] !== undefined)
  const matchedCount = activeConditions.filter((filter) => matches[filter]).length
  const conditionText = (condition) => {
    if (condition === '알레르기 제외' && allergies.length === 0) return '선택한 제외 성분 정보 없음'
    return `${condition} 탐색 기준과 ${matches[condition] ? '일치' : '다름'}`
  }
  const changeQuantity = (delta) => {
    setQuantity((current) => Math.min(maxQuantity, Math.max(1, current + delta)))
  }
  const addSelectedToCart = async () => {
    if (purchasePending || unavailable) return
    setPurchasePending(true)
    try {
      await addToCart(p, quantity)
    } finally {
      setPurchasePending(false)
    }
  }
  const moveToCartForPurchase = async () => {
    if (purchasePending || unavailable) return
    setPurchasePending(true)
    try {
      if (await addToCart(p, quantity)) {
        setDrawerOpen(false)
        navigate('cart')
      }
    } finally {
      setPurchasePending(false)
    }
  }

  return (
    <div className="wrap page product-detail-page">
      <div className="crumbs">
        <span className="c-link" onClick={() => navigate('main')}>홈</span>
        <Icon name="chevron-right" size={13} />
        <span>{p.category}</span>
        <Icon name="chevron-right" size={13} />
        <span className="cur">{p.name}</span>
      </div>

      <div className="detail-grid">
        <div>
          <div className="detail-media"><ProductImage src={p.image} alt={p.name} /></div>
        </div>

        <section className="detail-info" aria-labelledby="product-title">
          <div className="detail-brand-row">
            <span><b>{p.brand}</b><i aria-hidden="true">·</i>{p.category}</span>
            <button className="detail-wish" onClick={() => toggleWish(p.id)} aria-label={wished ? '위시리스트에서 제외' : '위시리스트에 추가'} style={wished ? { color: 'var(--danger)' } : undefined}>
              <Icon name="heart" size={20} fill={wished ? 'currentColor' : 'none'} />
            </button>
          </div>
          <h1 id="product-title" className="detail-title">{p.name}</h1>

          <div className="detail-price" aria-label="상품 가격">
            {rate > 0 && <span className="disc">{rate}% 할인</span>}
            {p.originalPrice > p.price && <span className="orig">정상가 {won(p.originalPrice)}</span>}
            <span className="amt"><small>판매가</small>{p.price.toLocaleString('ko-KR')}<em>원</em></span>
          </div>

          <div className="detail-delivery">
            <Icon name="truck" size={18} />
            <div>
              <b>{estimatedDeliveryFee === 0 ? '무료배송 적용' : `배송비 ${won(DELIVERY_FEE)}`}</b>
              <span>이 상품 합계 {won(FREE_DELIVERY_THRESHOLD)} 이상 무료배송</span>
            </div>
          </div>

          <div className="detail-order-box">
            <div className="detail-quantity-row">
              <div>
                <b>수량</b>
                <span>{unavailable ? '현재 구매할 수 없습니다.' : `한 번에 최대 ${maxQuantity}개`}</span>
              </div>
              <div className="detail-quantity" role="group" aria-label="상품 수량 선택">
                <button type="button" onClick={() => changeQuantity(-1)} disabled={quantity <= 1 || unavailable} aria-label="수량 줄이기">−</button>
                <output aria-live="polite" aria-label={`선택 수량 ${quantity}개`}>{quantity}</output>
                <button type="button" onClick={() => changeQuantity(1)} disabled={quantity >= maxQuantity || unavailable} aria-label="수량 늘리기">+</button>
              </div>
            </div>
            <div className="detail-total-breakdown">
              <span>상품금액 {won(itemTotal)} + 배송비 {estimatedDeliveryFee === 0 ? '무료' : won(estimatedDeliveryFee)}</span>
              <div><b>예상 결제금액</b><strong>{won(estimatedTotal)}</strong></div>
            </div>
          </div>

          <div className="detail-actions">
            <button className="btn btn-ghost" onClick={addSelectedToCart} disabled={purchasePending || unavailable}>
              <Icon name="cart" size={17} /> {purchasePending ? '처리 중…' : '장바구니 담기'}
            </button>
            <button className="btn btn-primary" onClick={moveToCartForPurchase} disabled={purchasePending || unavailable}>
              {unavailable ? '품절' : '장바구니에서 구매하기'}
            </button>
          </div>
          <p className="detail-purchase-note">선택 수량을 담고 장바구니 확인 단계로 이동합니다. 최종 금액은 장바구니 전체 상품에 따라 달라질 수 있습니다.</p>
        </section>
      </div>

      <section className="detail-description" aria-labelledby="detail-description-title">
        <span>상품 설명</span>
        <h2 id="detail-description-title">{p.name}</h2>
        <p>{p.summary || '등록된 상품 설명이 없습니다.'}</p>
      </section>

      <div className="tabs">
        <div className="tab-nav no-scrollbar">
          {[
            { id: 'nutrition', label: '영양정보' },
            { id: 'info', label: '원재료 및 알레르기' },
            { id: 'qna', label: '배송 · 교환 · 반품' },
          ].map((t) => (
            <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>

        <div className="tab-panel">
          {tab === 'nutrition' && (
            <div className="nutri-card">
              <div className="nutri-head">
                <div>
                  <h4>영양성분 정보</h4>
                  <div className="serv">1회 섭취 기준 · {n.servingSize} · 지방 {n.fat}g</div>
                </div>
                <span className="kcal">{n.calories} kcal</span>
              </div>
              <div className="nutri-grid">
                <div className="nutri-cell"><div className="k">단백질</div><div className="v">{n.protein}g</div></div>
                <div className="nutri-cell"><div className="k">탄수화물</div><div className="v">{n.carbs}g</div></div>
                <div className="nutri-cell"><div className="k">당류</div><div className="v">{n.sugar}g</div></div>
                <div className="nutri-cell"><div className="k">나트륨</div><div className="v">{n.sodium}mg</div></div>
              </div>
            </div>
          )}

          {tab === 'info' && (
            <div className="prose">
              <p>아래 정보는 상품에 등록된 원재료와 영양성분을 바탕으로 안내합니다.</p>
              <div className="box">
                <div>주요 원재료 · {p.mainIngredients.length ? p.mainIngredients.join(', ') : '상품 표시 정보 참조'}</div>
                <div>알레르기 주의 물질 · {p.allergens.length ? p.allergens.join(', ') : '표시된 관리 대상 성분 없음'}</div>
                <div>카페인 · {p.caffeine ? '함유' : '미함유'}</div>
              </div>
            </div>
          )}

          {tab === 'qna' && (
            <div className="prose">
              <p style={{ fontWeight: 700, color: 'var(--ink)' }}>배송 및 주문 안내</p>
              <div className="box">
                <div>· 배송비는 {won(DELIVERY_FEE)}이며, 상품 합계 {won(FREE_DELIVERY_THRESHOLD)} 이상 주문 시 무료입니다.</div>
                <div>· 주문 및 배송 상태는 결제 완료 후 주문내역에서 확인할 수 있습니다.</div>
                <div>· 교환 및 반품의 세부 조건은 현재 등록된 정책 정보가 없어 별도 확인이 필요합니다.</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <section className="detail-match" aria-labelledby="personal-analysis-title">
        <div className="top">
          <span id="personal-analysis-title" className="t"><Icon name="sparkles" size={16} /> 내 목표 기준 분석</span>
        </div>
        {activeConditions.length ? (
          <>
            <div className="detail-match-settings">현재 설정 · {goal} · {activeConditions.join(' · ')}</div>
            <div className="detail-match-list">
              {activeConditions.map((condition) => (
                <span key={condition}>{matches[condition] ? '✓' : '·'} {conditionText(condition)}</span>
              ))}
            </div>
            <p>설정한 탐색 조건 {matchedCount}/{activeConditions.length} 일치</p>
          </>
        ) : (
          <p className="detail-match-empty">보조 조건을 설정하면 이 상품이 내 탐색 기준과 얼마나 맞는지 확인할 수 있습니다.</p>
        )}
      </section>

      <aside className="detail-mobile-buy" aria-label="모바일 구매 영역">
        <div><span>예상 결제금액</span><strong>{won(estimatedTotal)}</strong></div>
        <button className="btn btn-ghost" onClick={addSelectedToCart} disabled={purchasePending || unavailable}>담기</button>
        <button className="btn btn-primary" onClick={moveToCartForPurchase} disabled={purchasePending || unavailable}>{unavailable ? '품절' : '장바구니 확인'}</button>
      </aside>
    </div>
  )
}
