import { useState } from 'react'
import { useStore } from '../store'
import Icon from './Icon'

const KEY = 'cm_welcome_hide_date'
const today = () => new Date().toISOString().slice(0, 10)

const BENEFITS = [
  { icon: 'check-circle', title: '즉시 발급', desc: '가입과 함께 바로 발급' },
  { icon: 'leaf', title: '다양한 상품', desc: '건강한 라이프를 위한 엄선 상품' },
  { icon: 'award', title: '추가 혜택', desc: '이벤트·쿠폰 소식 우선 안내' },
]

export default function EventPopup() {
  const { isLoggedIn, view } = useStore()
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
        <button className="ev-close" onClick={close} aria-label="닫기"><Icon name="x" size={18} /></button>

        <span className="ev-badge"><Icon name="leaf" size={14} /> Welcome to CareMarket</span>
        <h2 className="ev-title">반가워요</h2>
        <p className="ev-sub">CareMarket에 오신 것을 환영합니다.</p>
        <p className="ev-lead">신규 가입 고객님께 드리는 특별한 혜택</p>

        <div className="ev-coupon">
          <div className="ev-coupon-main">
            <div className="cap">신규 가입 쿠폰</div>
            <div className="off">20%<small>OFF</small></div>
            <div className="use">지금 바로 사용해 보세요!</div>
          </div>
          <div className="ev-coupon-side">
            <Icon name="leaf" size={22} />
            COUPON
          </div>
        </div>

        <div className="ev-benefits">
          {BENEFITS.map((b) => (
            <div key={b.title} className="ev-benefit">
              <div className="b-ico"><Icon name={b.icon} size={18} /></div>
              <div className="b-t">{b.title}</div>
              <div className="b-d">{b.desc}</div>
            </div>
          ))}
        </div>

        <div className="ev-foot">
          <button className="ev-skip" onClick={hideToday}>오늘 하루 보지 않기</button>
          <button className="btn btn-primary btn-sm" onClick={close}>닫기</button>
        </div>
      </div>
    </div>
  )
}
