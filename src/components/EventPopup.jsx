import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'

const KEY = 'cm_welcome_dismissed'

export default function EventPopup() {
  const { isLoggedIn, authLoading, view, navigate } = useStore()
  const [open, setOpen] = useState(() => {
    try { return sessionStorage.getItem(KEY) !== '1' } catch { return true }
  })
  const dialog = useRef(null)
  const close = () => {
    try { sessionStorage.setItem(KEY, '1') } catch { /* Storage may be unavailable. */ }
    setOpen(false)
  }
  const visible = !authLoading && !isLoggedIn && view === 'main' && open
  useEffect(() => {
    if (!visible) return
    const previous = document.activeElement
    const modal = dialog.current
    modal?.showModal()
    return () => { modal?.close(); previous?.focus?.() }
  }, [visible])

  if (!visible) return null

  return (
      <dialog ref={dialog} className="ev-modal" aria-labelledby="welcome-title" onCancel={close} onClick={e => { if (e.target === e.currentTarget && (e.clientX < e.currentTarget.getBoundingClientRect().left || e.clientX > e.currentTarget.getBoundingClientRect().right)) close() }}>
        <button className="ev-close" onClick={close} aria-label="닫기">×</button>
        <p className="ev-kicker">CAREMARKET WELCOME</p>
        <h2 className="ev-title" id="welcome-title">반가워요.</h2>
        <p className="ev-sub">신규회원 20% 쿠폰으로<br />건강한 첫 선택을 시작하세요.</p>

        <div className="ev-coupon">
          <div className="ev-coupon-main">
            <div className="cap">WELCOME COUPON</div>
            <div className="off">20%<small>OFF</small></div>
            <div className="use">가입 시 자동 발급 · 상품금액 20% 할인<br />배송비 제외 · 회원당 1회</div>
          </div>
          <div className="ev-coupon-side">
            COUPON
          </div>
        </div>

        <div className="ev-foot">
          <button className="ev-skip" onClick={close}>다음에 볼게요</button>
          <button className="btn btn-primary btn-sm" onClick={() => { close(); navigate('register') }}>혜택 확인하기</button>
        </div>
      </dialog>
  )
}
