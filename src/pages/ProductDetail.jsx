import { useState } from 'react'
import { useStore } from '../store'
import { REVIEWS } from '../data/mock'
import Icon from '../components/Icon'
import Stars from '../components/Stars'
import ProductImage from '../components/ProductImage'
import GoalBadge from '../components/GoalBadge'
import { discountRate, won } from '../lib/format'

export default function ProductDetail() {
  const {
    selectedProduct: p, productsLoading, productsError,
    goal, subFilters, allergies, wishlist, toggleWish, addToCart, navigate,
  } = useStore()
  const [tab, setTab] = useState('nutrition')
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

  return (
    <div className="wrap page">
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
          <div className="detail-tags">
            {p.tags.map((t) => <span key={t} className="tag tag-soft">#{t}</span>)}
          </div>
        </div>

        <div className="detail-info">
          <div className="detail-brand-row">
            <span className="card-brand">{p.brand}</span>
            <Stars rating={p.rating} count={p.reviewCount} />
          </div>
          <h1 className="detail-title">{p.name}</h1>
          <p className="detail-summary">{p.summary}</p>

          <div className="detail-price">
            <span className="amt">{p.price.toLocaleString('ko-KR')}<small>원</small></span>
            <span className="orig">{won(p.originalPrice)}</span>
            <span className="disc">{discountRate(p.originalPrice, p.price)}% 할인</span>
          </div>

          {/* 목표 강조 배지도 상세에서 재사용 */}
          <div style={{ marginTop: 4 }}><GoalBadge goal={goal} product={p} /></div>

          <div className="detail-meta">
            <div className="dm-row"><Icon name="leaf" size={16} style={{ color: 'var(--brand-500)' }} /> <span>주요 원료 · <b>{p.origin}</b></span></div>
            <div className="dm-row"><Icon name="package" size={16} style={{ color: 'var(--brand-500)' }} /> <span>재고 · <b>{p.stock.toLocaleString('ko-KR')}개</b></span></div>
            <div className="dm-row"><Icon name="truck" size={16} style={{ color: 'var(--brand-500)' }} /> <span>{p.delivery}</span></div>
          </div>

          <div className="detail-match">
            <div className="top">
              <span className="t"><Icon name="sparkles" size={16} /> 내 목표 기준 분석</span>
            </div>
            <div className="detail-match-settings">현재 설정 · {goal}{activeConditions.length ? ` · ${activeConditions.join(' · ')}` : ''}</div>
            {activeConditions.length ? (
              <div className="detail-match-list">
                {activeConditions.map((condition) => (
                  <span key={condition}>{matches[condition] ? '✓' : '·'} {conditionText(condition)}</span>
                ))}
              </div>
            ) : (
              <div className="detail-match-list"><span>· 선택한 보조 조건 없이 상품 영양 정보를 확인하고 있습니다.</span></div>
            )}
            <p>설정한 탐색 조건 {matchedCount}/{activeConditions.length} 일치</p>
          </div>

          <div className="detail-actions">
            <button className="fav" onClick={() => toggleWish(p.id)} aria-label="위시리스트" style={wished ? { color: 'var(--danger)' } : undefined}>
              <Icon name="heart" size={20} fill={wished ? 'currentColor' : 'none'} />
            </button>
            <button className="btn btn-ghost" onClick={() => addToCart(p, 1)}>
              <Icon name="cart" size={17} /> 장바구니 담기
            </button>
            <button className="btn btn-primary" onClick={() => { addToCart(p, 1); navigate('cart') }}>
              바로 구매하기
            </button>
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="tabs">
        <div className="tab-nav no-scrollbar">
          {[
            { id: 'nutrition', label: '영양성분 실측표' },
            { id: 'info', label: '원재료 및 클린 인증' },
            { id: 'reviews', label: `구매평 (${p.reviewCount.toLocaleString('ko-KR')})` },
            { id: 'qna', label: '배송 · 환불 가이드' },
          ].map((t) => (
            <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>

        <div className="tab-panel">
          {tab === 'nutrition' && (
            <div className="nutri-card">
              <div className="nutri-head">
                <div>
                  <h4>공인 분석 영양성분</h4>
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
              <div className="nutri-special">
                <b>주요 원재료</b>
                {n.special}
              </div>
            </div>
          )}

          {tab === 'info' && (
            <div className="prose">
              <p><b>{p.name}</b>은(는) 자연에서 유래한 식재료 본연의 영양소를 파괴하지 않는 저온 공법으로 안전하게 제조되었습니다.</p>
              <div className="box">
                <div>주요 원재료 · {p.mainIngredients.length ? p.mainIngredients.join(', ') : '상품 표시 정보 참조'}</div>
                <div>알레르기 주의 물질 · {p.allergens.length ? p.allergens.join(', ') : '표시된 관리 대상 성분 없음'}</div>
                <div>카페인 · {p.caffeine ? '함유' : '미함유'}</div>
                <div>HACCP 인증 제조원 및 정기 잔류물질 검사 완료</div>
              </div>
            </div>
          )}

          {tab === 'reviews' && (
            <div>
              <div className="review-summary">
                <div className="score">
                  <span className="n">{p.rating}</span>
                  <Stars rating={p.rating} />
                </div>
                <span style={{ fontSize: 12.5, color: 'var(--faint)' }}>100% 실구매 고객 웰빙 리뷰</span>
              </div>
              {REVIEWS.map((r, i) => (
                <div key={i} className="review-item">
                  <div className="r-top">
                    <span><b>{r.user}</b> <span className="g">[{r.goal}]</span></span>
                    <span>{r.date}</span>
                  </div>
                  <p>{r.text}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'qna' && (
            <div className="prose">
              <p style={{ fontWeight: 700, color: 'var(--ink)' }}>신선 콜드체인 배송 안내</p>
              <div className="box">
                <div>· 오후 4시 이전 결제 건은 신선 물얼음 팩과 함께 당일 발송됩니다.</div>
                <div>· 신선 식품 특성상 단순 변심 반품은 어려우나, 변질·파손 시 100% 무상 재발송해 드립니다.</div>
                <div>· 문의 · 고객행복센터 1588-0000 (평일 09–18시)</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
