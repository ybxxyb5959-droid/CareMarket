import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store'
import { getCountdown, getLocalDateKey, selectDailyDeals } from '../lib/deals'
import DealProductCard from './DealProductCard'

export default function TodayDealsSection() {
  const { products, productsLoading, productsError, reloadProducts } = useStore()
  const [clock, setClock] = useState(() => ({
    dateKey: getLocalDateKey(),
    countdown: getCountdown(),
  }))

  const dailyDeals = useMemo(
    () => selectDailyDeals(products, clock.dateKey),
    [products, clock.dateKey],
  )

  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      setClock({ dateKey: getLocalDateKey(now), countdown: getCountdown(now) })
    }
    const interval = window.setInterval(updateClock, 1000)
    return () => window.clearInterval(interval)
  }, [])

  return (
    <section className="today-deals" aria-labelledby="today-deals-title">
      <div className="wrap">
        <div className="today-deals-head">
          <div>
            <span className="eyebrow">TODAY&apos;S DEAL</span>
            <h2 id="today-deals-title" className="serif">오늘의 특가</h2>
            <p className="deal-head-note">판매가에서 한 번 더, 오늘 자정까지만</p>
            <div className="deal-countdown" aria-live="off">
              <span>오늘 특가 남은 시간</span>
              <time>{clock.countdown}</time>
            </div>
          </div>
        </div>
        {productsLoading ? (
          <p className="today-deals-status" aria-live="polite">특가 상품을 불러오고 있습니다.</p>
        ) : productsError ? (
          <div className="home-product-error" role="alert">
            <p><strong>상품을 불러오지 못했어요.</strong><span>잠시 후 다시 시도해 주세요.</span></p>
            <button type="button" className="btn btn-soft btn-sm" onClick={reloadProducts}>다시 시도</button>
          </div>
        ) : dailyDeals.length ? (
          <div className="today-deals-grid">
            {dailyDeals.map((product) => <DealProductCard key={product.id} product={product} />)}
          </div>
        ) : (
          <p className="today-deals-status">현재 판매 중인 할인 상품이 없습니다.</p>
        )}
      </div>
    </section>
  )
}
