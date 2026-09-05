import { useState } from 'react'
import { useStore } from '../store'

const KEY = 'cm_welcome_hide_date'
const today = () => new Date().toISOString().slice(0, 10)

export default function EventPopup() {
  const { isLoggedIn, view, navigate } = useStore()
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(KEY) !== today() } catch { return true }
  })

  if (isLoggedIn || view !== 'main' || !open) return null

  const close = () => setOpen(false)
  const hideToday = () => {
    try { localStorage.setItem(KEY, today()) } catch { /* 비공개 모드 등 무시 */ }
    setOpen(false)
  }

  return (
    <div className="ev-overlay" onClick={close}>
      <div className="ev-modal" onClick={(e) => e.stopPropagation()}>
        <button className="ev-close" onClick={close} aria-label="닫기">×</button>
        <p className="ev-kicker">CAREMARKET WELCOME</p>
        <h2 className="ev-title">신규 회원 20% 쿠폰</h2>
        <p className="ev-sub">회원가입 후 첫 쇼핑에 사용할 수 있어요.</p>

        <div className="ev-coupon">
          <div className="ev-coupon-main">
            <div className="cap">WELCOME COUPON</div>
            <div className="off">20%<small>OFF</small></div>
            <div className="use">회원가입 혜택으로 안내됩니다</div>
          </div>
          <div className="ev-coupon-side">
            COUPON
          </div>
        </div>

        <div className="ev-foot">
          <button className="ev-skip" onClick={hideToday}>오늘 하루 보지 않기</button>
          <button className="btn btn-primary btn-sm" onClick={() => { close(); navigate('register') }}>회원가입하기</button>
        </div>
      </div>
    </div>
  )
}
