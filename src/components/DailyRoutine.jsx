import { useEffect, useState } from 'react'
import { useStore } from '../store'
import Icon from './Icon'
import ProductImage from './ProductImage'
import { won } from '../lib/format'
import { getDailyRoutine, getRoutineClock } from '../lib/daily-routine'

export default function DailyRoutine() {
  const { products, allergies, productsLoading, productsError, reloadProducts, openProduct } = useStore()
  const [clock, setClock] = useState(getRoutineClock)
  const [selection, setSelection] = useState(null)
  useEffect(() => {
    const refresh = () => setClock(getRoutineClock())
    const timer = window.setInterval(refresh, 30000)
    document.addEventListener('visibilitychange', refresh)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh) }
  }, [])
  const routines = getDailyRoutine(products, clock.day, allergies)
  const selectedId = selection?.dateKey === clock.dateKey && selection?.period === clock.slotId ? selection.id : clock.slotId
  const active = routines.find(slot => slot.id === selectedId)
  const choose = (id) => setSelection({ id, dateKey: clock.dateKey, period: clock.slotId })
  const onTabKeyDown = (event, index) => {
    const next = { ArrowRight: (index + 1) % 4, ArrowDown: (index + 1) % 4, ArrowLeft: (index + 3) % 4, ArrowUp: (index + 3) % 4, Home: 0, End: 3 }[event.key]
    if (next == null) return
    event.preventDefault()
    choose(routines[next].id)
    document.getElementById(`routine-tab-${routines[next].id}`)?.focus()
  }
  return (
    <section className="section daily-routine" aria-labelledby="daily-routine-heading">
      <div className="wrap">
        <div className="routine-heading">
          <div><span className="eyebrow">Well-being daily routine</span><h2 className="serif" id="daily-routine-heading">하루를 채우는 시간대별 웰빙 식단</h2></div>
          <p><time dateTime={clock.dateKey}>{clock.label}</time><span>매일 새롭게 만나는 식단</span></p>
        </div>
        <div className="routine-layout">
          <div className="routine-tabs" role="tablist" aria-label="식단 시간대">
            {routines.map((slot, index) => (
              <button key={slot.id} type="button" role="tab" id={`routine-tab-${slot.id}`} aria-controls="routine-panel" aria-selected={active.id === slot.id} tabIndex={active.id === slot.id ? 0 : -1} onKeyDown={event => onTabKeyDown(event, index)} onClick={() => choose(slot.id)}>
                <span className="routine-time">{slot.time}</span>
                <span className="routine-tab-copy"><strong>{slot.label}</strong><span>{slot.note}</span></span>
                {clock.slotId === slot.id && <span className="routine-now">지금</span>}
              </button>
            ))}
          </div>
          <div className="routine-panel" role="tabpanel" id="routine-panel" aria-labelledby={`routine-tab-${active.id}`} tabIndex={0}>
            <span className="routine-kicker">{active.time} &nbsp; / &nbsp; {active.note}</span>
            <h3 className="serif">{active.title}</h3>
            <p className="routine-description">{active.description}</p>
            {productsLoading ? <p className="routine-status" role="status">오늘의 추천 상품을 고르고 있어요.</p>
              : productsError ? <div className="routine-status" role="status">추천 상품을 불러오지 못했어요. <button type="button" className="more-link" onClick={reloadProducts}>다시 시도</button></div>
                : active.product ? <button type="button" className="routine-product" onClick={() => openProduct(active.product)}>
                  <span className="routine-product-image"><ProductImage src={active.product.image} alt="" /></span>
                  <span className="routine-product-copy"><span>함께 즐기기 좋은 상품</span><strong>{active.product.name}</strong><span className="routine-price">{won(active.product.price)}</span></span>
                  <span className="routine-product-link">자세히 보기 <Icon name="arrow-up-right" size={16} /></span>
                </button> : <p className="routine-status">현재 추천할 수 있는 상품을 준비 중이에요.</p>}
          </div>
        </div>
      </div>
    </section>
  )
}
