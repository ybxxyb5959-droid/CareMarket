import { useRef, useState } from 'react'
import { useStore } from '../store'
import Icon from './Icon'
import ProductImage from './ProductImage'
import { won } from '../lib/format'

// 추천 상품군이 함께 차려진 건강식 식탁 이미지 (장식용 · 상품 이미지가 아님)
const TABLE_IMAGE =
  'https://images.unsplash.com/photo-1547592180-85f173990554?w=1400&auto=format&fit=crop&q=80'

// 퍼센트 좌표 기반 핫스팟 — 실제 products.category와 연결한다 (가짜 상품 미생성)
const HOTSPOTS = [
  { key: 'chicken', label: '닭가슴살', category: '닭가슴살·고단백 식품', x: 27, y: 46 },
  { key: 'meal', label: '간편식', category: '도시락·간편식', x: 50, y: 30 },
  { key: 'drink', label: '저당 음료', category: '음료·프로틴음료', x: 74, y: 44 },
  { key: 'snack', label: '건강 간식', category: '프로틴바·건강간식', x: 45, y: 70 },
]

export default function WellnessTable() {
  const { products, openProduct, addToCart, requireCartLogin } = useStore()
  const [active, setActive] = useState(null)
  const pinnedRef = useRef(null)
  const timerRef = useRef(null)

  // 각 핫스팟을 실제 상품과 매칭 (해당 카테고리의 첫 상품)
  const spots = HOTSPOTS
    .map((h) => ({ ...h, product: products.find((p) => p.category === h.category) }))
    .filter((h) => h.product)

  const activeSpot = spots.find((h) => h.key === active)

  const show = (key) => {
    if (timerRef.current) { window.clearTimeout(timerRef.current); timerRef.current = null }
    setActive(key)
  }
  const scheduleHide = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setActive(pinnedRef.current), 170)
  }
  const togglePin = (key) => {
    if (pinnedRef.current === key) { pinnedRef.current = null; setActive(null) }
    else { pinnedRef.current = key; show(key) }
  }

  const feature = (p) => `단백질 ${p.nutrition.protein}g · ${p.nutrition.calories}kcal`

  const addTodaysTable = async () => {
    if (!spots.length || !requireCartLogin()) return
    for (const spot of spots) {
      if (!await addToCart(spot.product, 1)) break
    }
  }

  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <div className="section-head" style={{ textAlign: 'left', maxWidth: 'none', marginBottom: 20 }}>
          <span className="eyebrow">Today&apos;s Wellness Table</span>
          <h2 className="serif" style={{ fontSize: 26 }}>오늘의 웰빙 테이블</h2>
          <p style={{ color: 'var(--muted)', marginTop: 8, fontSize: 14 }}>
            식탁 위 <b style={{ color: 'var(--brand-600)' }}>+</b> 에 마우스를 올리면 오늘의 추천 식품을 확인할 수 있어요.
          </p>
        </div>

        <div className="wtable-stage">
          <div
            className="wtable-media"
            style={{ backgroundImage: `url(${TABLE_IMAGE})` }}
            role="img"
            aria-label="오늘의 웰빙 테이블"
          />

          <div className="wtable-layer">
            {spots.map((h) => (
              <button
                key={h.key}
                className={`hotspot${active === h.key ? ' on' : ''}`}
                style={{ left: `${h.x}%`, top: `${h.y}%` }}
                onMouseEnter={() => show(h.key)}
                onMouseLeave={scheduleHide}
                onClick={() => togglePin(h.key)}
                aria-label={`${h.label} 추천 상품 보기`}
              >
                <Icon name="plus" size={16} strokeWidth={2.4} className="hotspot-ico" />
              </button>
            ))}

            {activeSpot && (
              <div
                className={`wpop${activeSpot.y < 45 ? ' below' : ''}`}
                style={{ left: `${Math.min(Math.max(activeSpot.x, 26), 74)}%`, top: `${activeSpot.y}%` }}
                onMouseEnter={() => show(activeSpot.key)}
                onMouseLeave={scheduleHide}
              >
                <div className="wpop-media">
                  <ProductImage src={activeSpot.product.image} alt={activeSpot.product.name} />
                </div>
                <div className="wpop-feat">{feature(activeSpot.product)}</div>
                <div className="wpop-name">{activeSpot.product.name}</div>
                <div className="wpop-price">{won(activeSpot.product.price)}</div>
                <div className="wpop-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => openProduct(activeSpot.product)}>상세보기</button>
                  <button className="btn btn-primary btn-sm" onClick={() => addToCart(activeSpot.product, 1)}>
                    <Icon name="cart" size={15} /> 담기
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 이미지 하단 상품 스트립 — 핫스팟과 양방향 연동 */}
        {spots.length > 0 && (
          <div className="wstrip">
            {spots.map((h) => (
              <div
                key={h.key}
                className={`wstrip-card${active === h.key ? ' active' : ''}`}
                onMouseEnter={() => show(h.key)}
                onMouseLeave={scheduleHide}
                onClick={() => openProduct(h.product)}
              >
                <div className="wstrip-thumb"><ProductImage src={h.product.image} alt={h.product.name} /></div>
                <div className="wstrip-info">
                  <div className="wstrip-cat">{h.label}</div>
                  <div className="wstrip-name">{h.product.name}</div>
                  <div className="wstrip-price">{won(h.product.price)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {spots.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18 }}>
            <button className="btn btn-primary" onClick={addTodaysTable}>
              <Icon name="cart" size={16} /> 오늘의 식단 한 번에 담기
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
