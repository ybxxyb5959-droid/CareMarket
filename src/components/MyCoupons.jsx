import { useEffect, useId, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store'

const couponDate = value => new Date(value).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })

export default function MyCoupons({ userId, selected = '', onSelect, disabled = false }) {
  const { reviewRevision } = useStore()
  const titleId = useId()
  const [state, setState] = useState({ rows: [], error: false, key: '' })
  const [revision, setRevision] = useState(0)
  const [choice, setChoice] = useState(selected)
  const key = `${userId}:${revision}:${reviewRevision}`
  const loading = state.key !== key
  const rows = loading ? [] : state.rows
  const available = rows.filter(coupon => !coupon.used_at)
  const applied = available.find(coupon => coupon.id === selected)
  useEffect(() => {
    let active = true
    Promise.resolve(supabase.from('user_coupons')
      .select('id,issued_at,used_at,coupons(name,percent)').eq('user_id', userId).order('issued_at', { ascending: false }))
      .then(({ data, error }) => { if (active) setState({ rows: data || [], error: Boolean(error), key }) })
      .catch(() => { if (active) setState({ rows: [], error: true, key }) })
    return () => { active = false }
  }, [userId, key])

  return <section className={onSelect ? 'checkout-section checkout-coupons' : 'mypage-section'} aria-labelledby={titleId}>
    <div className={onSelect ? 'checkout-section-head' : 'mypage-section-head'}>
      <h2 id={titleId}>{onSelect ? '쿠폰 적용' : '나의 쿠폰'}</h2>
      {!loading && !state.error && <small>사용 가능 {available.length}장</small>}
    </div>
    {loading ? <p role="status">쿠폰을 불러오고 있습니다.</p> : state.error ? <p role="alert">쿠폰을 불러오지 못했어요. <button type="button" className="btn btn-text" onClick={() => setRevision(n => n + 1)}>다시 시도</button></p>
      : onSelect ? <>
        {!available.length && <p>사용 가능한 쿠폰이 없습니다.</p>}
          <div className="coupon-controls">
            <label className="field coupon-field">쿠폰 선택<select value={choice} disabled={disabled || !available.length} onChange={event => setChoice(event.target.value)}>
              <option value="">{available.length ? '쿠폰을 선택해 주세요' : '선택 가능한 쿠폰 없음'}</option>
              {available.map(coupon => <option key={coupon.id} value={coupon.id}>{coupon.coupons.name} · 상품금액 {coupon.coupons.percent}% 할인</option>)}
            </select></label>
            <button type="button" className="btn btn-soft btn-sm" disabled={disabled || !choice || choice === selected || !available.some(c => c.id === choice)} onClick={() => onSelect(choice, available.find(coupon => coupon.id === choice))}>쿠폰 적용</button>
          </div>
          {applied && <div className="coupon-applied" role="status"><span><strong>{applied.coupons.name}</strong> 쿠폰이 적용되었습니다.</span><button type="button" className="btn btn-text" disabled={disabled} onClick={() => { setChoice(''); onSelect('', null) }}>적용 취소</button></div>}
          {available.length > 0 && <p className="cart-summary-note">상품금액에만 할인 적용 · 배송비 제외 · 주문당 쿠폰 1장</p>}
      </> : !rows.length ? <p>보유한 쿠폰이 없습니다.</p> : <>
        <div className="coupon-list">{rows.map(coupon => <article className="coupon-row" key={coupon.id}>
          <div><strong>{coupon.coupons.name}</strong><p>상품금액 {coupon.coupons.percent}% 할인 · 배송비 제외</p><small>발급일 {couponDate(coupon.issued_at)}{coupon.used_at ? ` · 사용일 ${couponDate(coupon.used_at)}` : ''}</small></div>
          <span className={`status ${coupon.used_at ? 'status-done' : 'status-active'}`}>{coupon.used_at ? '사용 완료' : '사용 가능'}</span>
        </article>)}</div>
        {available.length > 0 && <p className="cart-summary-note">사용 가능한 쿠폰은 주문/결제에서 선택해 적용할 수 있습니다.</p>}
      </>}
  </section>
}
