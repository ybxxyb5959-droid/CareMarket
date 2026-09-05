import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store'
import Icon from './Icon'
import ProductImage from './ProductImage'
import { won } from '../lib/format'
import {
  WELLNESS_TABLE_THEMES,
  getTodayWellnessConfig,
} from '../lib/wellness-table'

const number = (value) => Number(value) || 0

function useMobileWellnessTable() {
  const query = '(max-width: 760px)'
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    const update = () => setIsMobile(mediaQuery.matches)
    update()
    mediaQuery.addEventListener('change', update)
    return () => mediaQuery.removeEventListener('change', update)
  }, [])

  return isMobile
}

function productText(product) {
  // category는 slot의 허용 카테고리로 별도 비교한다. 여기에는 실제 상품명/설명만 넣어
  // "프로틴음료" 같은 카테고리명이 모든 키워드를 통과시키지 않게 한다.
  return [product.name, product.summary, ...(product.mainIngredients || [])]
    .join(' ')
    .toLocaleLowerCase()
}

function candidatesForSlot(products, slot) {
  return products
    .filter((product) => {
      const includesKeyword = slot.keywords.some((keyword) => productText(product).includes(keyword.toLocaleLowerCase()))
      return slot.categories.includes(product.category)
        && includesKeyword
        && (slot.minProtein == null || number(product.nutrition?.protein) >= slot.minProtein)
        && (slot.maxSugar == null || number(product.nutrition?.sugar) <= slot.maxSugar)
    })
    .sort((a, b) => a.id - b.id)
}

function productForSlot(products, slot, rotation, slotIndex) {
  const candidates = candidatesForSlot(products, slot)
  if (!candidates.length) return null
  return candidates[(rotation + slotIndex) % candidates.length]
}

export default function WellnessTable() {
  const { products, openProduct, addToCart, requireCartLogin } = useStore()
  const isMobile = useMobileWellnessTable()
  const todayConfigs = useMemo(() => getTodayWellnessConfig(), [])
  const [activeThemeId, setActiveThemeId] = useState(todayConfigs[0]?.themeId || 'protein')
  const [activeSpot, setActiveSpot] = useState(null)
  const pinnedSpotRef = useRef(null)
  const timerRef = useRef(null)

  const activeConfig = todayConfigs.find((config) => config.themeId === activeThemeId) || todayConfigs[0]
  const theme = WELLNESS_TABLE_THEMES.find((item) => item.id === activeConfig?.themeId) || WELLNESS_TABLE_THEMES[0]
  const spots = useMemo(() => theme.visual.slots
    .map((slot, index) => {
      const product = productForSlot(products, slot, activeConfig?.rotation || 0, index)
      return product ? { key: `${slot.id}-${product.id}`, product, slot, number: index + 1 } : null
    })
    .filter(Boolean), [products, theme, activeConfig?.rotation])
  const selectedSpot = spots.find((spot) => spot.key === activeSpot)

  const reveal = (key) => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = null
    setActiveSpot(key)
  }
  const hideLater = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setActiveSpot(pinnedSpotRef.current), 140)
  }
  const selectTheme = (id) => {
    pinnedSpotRef.current = null
    setActiveSpot(null)
    setActiveThemeId(id)
  }
  const toggleSpot = (key) => {
    if (pinnedSpotRef.current === key) {
      pinnedSpotRef.current = null
      setActiveSpot(null)
      return
    }
    pinnedSpotRef.current = key
    reveal(key)
  }
  const addTodaysTable = async () => {
    if (!spots.length || !requireCartLogin()) return
    for (const spot of spots) {
      if (!await addToCart(spot.product, 1)) break
    }
  }

  return (
    <section className="section wellness-table-section" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <div className="wtable-heading">
          <div>
            <span className="eyebrow">Today&apos;s Wellness Table</span>
            <h2 className="serif" style={{ fontSize: 26, fontWeight: 400, letterSpacing: '-0.015em' }}>오늘의 웰빙 테이블</h2>
            <p>식탁 위 <b style={{ color: 'var(--brand-600)' }}>+</b>에 마우스를 올려보세요.</p>
          </div>
          <div className="wtable-tabs" role="tablist" aria-label="웰빙 테이블 테마">
            {WELLNESS_TABLE_THEMES.map((item) => (
              <button
                key={item.id}
                role="tab"
                aria-selected={theme.id === item.id}
                className={theme.id === item.id ? 'active' : ''}
                onClick={() => selectTheme(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="wtable-stage">
          <div
            className="wtable-media"
            style={{ backgroundImage: `url(${theme.visual.image})`, backgroundPosition: theme.visual.objectPosition }}
            role="img"
            aria-label={theme.visual.alt}
          >
          </div>
          <div className="wtable-layer">
            {spots.map((spot) => {
              const coordinates = spot.slot.coordinates[isMobile ? 'mobile' : 'desktop']
              return (
              <button
                key={spot.key}
                className={`hotspot${activeSpot === spot.key ? ' on' : ''}`}
                style={{ left: `${coordinates.x}%`, top: `${coordinates.y}%` }}
                onMouseEnter={() => reveal(spot.key)}
                onMouseLeave={hideLater}
                onFocus={() => reveal(spot.key)}
                onClick={() => toggleSpot(spot.key)}
                aria-label={`${spot.product.name} 보기`}
              >
                <Icon name="plus" size={16} strokeWidth={2.5} className="hotspot-ico" />
              </button>
              )
            })}
            {selectedSpot && (
              (() => {
                const coordinates = selectedSpot.slot.coordinates[isMobile ? 'mobile' : 'desktop']
                return (
              <button
                className={`wpop${coordinates.y < 45 ? ' below' : ''}`}
                style={{ left: `${Math.min(Math.max(coordinates.x, 25), 75)}%`, top: `${coordinates.y}%` }}
                onMouseEnter={() => reveal(selectedSpot.key)}
                onMouseLeave={hideLater}
                onClick={() => openProduct(selectedSpot.product)}
              >
                <span className="wpop-media"><ProductImage src={selectedSpot.product.image} alt="" /></span>
                <span className="wpop-copy">
                  <span className="wpop-name">{selectedSpot.product.name}</span>
                  <span className="wpop-price">{won(selectedSpot.product.price)}</span>
                </span>
                <Icon name="chevron-right" size={16} />
              </button>
                )
              })()
            )}
          </div>
        </div>

        {spots.length > 0 && (
          <div className="wstrip" aria-label={`${theme.label} 상품 목록`}>
            {spots.map((spot) => (
              <button
                key={spot.key}
                className={`wstrip-card${activeSpot === spot.key ? ' active' : ''}`}
                onMouseEnter={() => reveal(spot.key)}
                onMouseLeave={hideLater}
                onFocus={() => reveal(spot.key)}
                onClick={() => openProduct(spot.product)}
              >
                <span className="wstrip-index">{String(spot.number).padStart(2, '0')}</span>
                <span className="wstrip-thumb"><ProductImage src={spot.product.image} alt={spot.product.name} /></span>
                <span className="wstrip-info">
                  <span className="wstrip-name">{spot.product.name}</span>
                  <span className="wstrip-price">{won(spot.product.price)}</span>
                </span>
              </button>
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
