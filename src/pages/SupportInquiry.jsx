import { useEffect, useRef, useState } from 'react'
import Icon from '../components/Icon'
import InquiryModeTabs from '../components/InquiryModeTabs'
import { supabase } from '../lib/supabase'
import {
  EMPTY_INQUIRY_FORM,
  INQUIRY_CATEGORIES,
  fetchInquiryOrders,
  submitCustomerInquiry,
  validateCustomerInquiry,
} from '../lib/support'
import { won } from '../lib/format'
import { useStore } from '../store'
import { InquiryHistory } from './SupportInquiries'

function FieldError({ id, message }) {
  if (!message) return null
  return <span id={id} className="support-field-error" role="alert">{message}</span>
}

function orderLabel(order) {
  const date = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(order.created_at))
  return `${date} · ${order.toss_order_id || order.order_id.slice(0, 8)} · ${won(order.total_price)}`
}

function InquiryExperience({ authUserId, user, navigate }) {
  const [values, setValues] = useState(() => ({ ...EMPTY_INQUIRY_FORM, contactEmail: user?.email || '' }))
  const [errors, setErrors] = useState({})
  const [orders, setOrders] = useState([])
  const [ordersState, setOrdersState] = useState('loading')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [result, setResult] = useState(null)
  const submissionLock = useRef(false)

  useEffect(() => {
    let active = true
    fetchInquiryOrders(supabase, authUserId)
      .then((rows) => {
        if (!active) return
        setOrders(rows)
        setOrdersState('ready')
      })
      .catch((error) => {
        console.error('Support inquiry order fetch failed:', { code: error?.code || 'INQUIRY_ORDERS_FAILED' })
        if (active) setOrdersState('error')
      })
    return () => { active = false }
  }, [authUserId])

  const setField = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => current[field] ? { ...current, [field]: undefined } : current)
    setSubmitError('')
  }

  const submit = async (event) => {
    event.preventDefault()
    if (submissionLock.current || submitting || !authUserId) return
    const nextErrors = validateCustomerInquiry(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      document.getElementById(`inquiry-${Object.keys(nextErrors)[0]}`)?.focus()
      return
    }

    submissionLock.current = true
    setSubmitting(true)
    setSubmitError('')
    try {
      setResult(await submitCustomerInquiry(supabase, values, authUserId))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      console.error('Customer inquiry submission failed:', { code: error?.code || 'CUSTOMER_INQUIRY_SUBMIT_FAILED' })
      setSubmitError('문의를 접수하지 못했어요. 입력한 내용을 확인한 뒤 다시 시도해주세요.')
    } finally {
      submissionLock.current = false
      setSubmitting(false)
    }
  }

  const describedBy = (field) => errors[field] ? `inquiry-${field}-error` : undefined

  if (result) {
    const receiptNumber = result.id.split('-')[0].toUpperCase()
    return <section id="inquiry-compose-panel" className="support-inquiry-success" role="tabpanel" aria-label="1:1 문의 작성">
        <span className="support-success-icon"><Icon name="check" size={30} /></span>
        <span className="eyebrow">INQUIRY RECEIVED</span>
        <h1>문의가 접수되었습니다.</h1>
        <p>문의 내용을 확인한 후 답변드리겠습니다.</p>
        <span className="support-receipt">접수번호 <b>{receiptNumber}</b></span>
        <div className="support-success-actions">
          <button type="button" className="btn btn-primary" onClick={() => navigate('supportInquiries')}>내 문의 확인하기</button>
          <button type="button" className="btn btn-text" onClick={() => navigate('support')}>← 고객지원으로 돌아가기</button>
        </div>
    </section>
  }

  return <section id="inquiry-compose-panel" role="tabpanel" aria-label="1:1 문의 작성">
    <header className="support-inquiry-heading">
      <span className="eyebrow">ONE-TO-ONE INQUIRY</span>
      <h1>1:1 문의</h1>
      <p>주문과 서비스 이용 중 확인이 필요한 내용을 남겨주세요.</p>
    </header>

    <form className="support-inquiry-form" onSubmit={submit} noValidate>
      <div className="support-form-note"><span>* 필수 항목</span><p>문의 답변 및 처리를 위해 입력한 정보를 사용합니다.</p></div>
      <div className="support-form-grid">
        <label htmlFor="inquiry-category">문의 유형 <span>*</span>
          <select id="inquiry-category" value={values.category} onChange={(event) => setField('category', event.target.value)} aria-invalid={Boolean(errors.category)} aria-describedby={describedBy('category')}>
            <option value="">선택해 주세요</option>
            {INQUIRY_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
          </select>
          <FieldError id="inquiry-category-error" message={errors.category} />
        </label>

        <label htmlFor="inquiry-orderId">주문번호 <em>선택</em>
          <select id="inquiry-orderId" value={values.orderId} onChange={(event) => setField('orderId', event.target.value)} disabled={ordersState === 'loading' || ordersState === 'error'}>
            <option value="">{ordersState === 'loading' ? '주문내역을 불러오는 중...' : orders.length ? '관련 주문을 선택해 주세요' : '선택할 주문이 없습니다'}</option>
            {orders.map((order) => <option key={order.order_id} value={order.order_id}>{orderLabel(order)}</option>)}
          </select>
          {ordersState === 'error' && <span className="support-field-help">주문내역을 불러오지 못했어요. 문의 내용에 주문번호를 적어주세요.</span>}
        </label>

        <label className="support-field-wide" htmlFor="inquiry-title">제목 <span>*</span>
          <input id="inquiry-title" value={values.title} onChange={(event) => setField('title', event.target.value)} maxLength={160} placeholder="문의 제목을 입력해 주세요." aria-invalid={Boolean(errors.title)} aria-describedby={describedBy('title')} />
          <FieldError id="inquiry-title-error" message={errors.title} />
        </label>

        <label className="support-field-wide" htmlFor="inquiry-content">문의 내용 <span>*</span>
          <textarea id="inquiry-content" value={values.content} onChange={(event) => setField('content', event.target.value)} maxLength={4000} rows={9} placeholder="확인이 필요한 내용을 자세히 적어주세요." aria-invalid={Boolean(errors.content)} aria-describedby={describedBy('content')} />
          <span className="support-character-count">{values.content.length.toLocaleString()} / 4,000</span>
          <FieldError id="inquiry-content-error" message={errors.content} />
        </label>

        <label className="support-field-wide" htmlFor="inquiry-contactEmail">답변 받을 이메일 <span>*</span>
          <input id="inquiry-contactEmail" type="email" value={values.contactEmail} onChange={(event) => setField('contactEmail', event.target.value)} maxLength={254} autoComplete="email" placeholder="email@example.com" aria-invalid={Boolean(errors.contactEmail)} aria-describedby={describedBy('contactEmail')} />
          <FieldError id="inquiry-contactEmail-error" message={errors.contactEmail} />
        </label>
      </div>

      <div className={`support-consent${errors.privacyAgreed ? ' has-error' : ''}`}>
        <label htmlFor="inquiry-privacyAgreed"><input id="inquiry-privacyAgreed" type="checkbox" checked={values.privacyAgreed} onChange={(event) => setField('privacyAgreed', event.target.checked)} aria-invalid={Boolean(errors.privacyAgreed)} aria-describedby={describedBy('privacyAgreed')} /><span>문의 답변 및 처리를 위한 개인정보 수집·이용에 동의합니다. <b>*</b></span></label>
        <a href="/privacy" onClick={(event) => { event.preventDefault(); navigate('privacy') }}>개인정보처리방침 보기</a>
        <FieldError id="inquiry-privacyAgreed-error" message={errors.privacyAgreed} />
      </div>

      {submitError && <div className="support-submit-error" role="alert"><p>{submitError}</p><button type="submit" disabled={submitting}>다시 시도</button></div>}
      <div className="support-form-actions">
        <p>접수된 문의는 CareMarket 운영 확인을 위해 저장됩니다.</p>
        <button className="service-cta" type="submit" disabled={submitting}>{submitting ? '문의 접수 중...' : '문의 접수하기'}{!submitting && <Icon name="chevron-right" size={17} />}</button>
      </div>
    </form>
  </section>
}

function InquiryWorkspace({ authUserId, user, navigate }) {
  const [mode, setMode] = useState('compose')
  const [historyRevision, setHistoryRevision] = useState(0)

  const switchMode = (nextMode) => {
    setMode(nextMode)
    if (nextMode === 'history') setHistoryRevision((current) => current + 1)
  }

  return <>
    <button className="service-back" type="button" onClick={() => navigate('support')}>← 고객지원으로 돌아가기</button>
    <InquiryModeTabs mode={mode} onChange={switchMode} />
    {mode === 'compose' ? <InquiryExperience authUserId={authUserId} user={user} navigate={navigate} /> : <div id="inquiry-history-panel" role="tabpanel" aria-label="1:1 문의 작성내역"><InquiryHistory key={`${authUserId}-${historyRevision}`} authUserId={authUserId} navigate={navigate} showBack={false} showDetailBack={false} /></div>}
  </>
}

export default function SupportInquiry() {
  const { authUserId, authLoading, isLoggedIn, user, navigate } = useStore()

  if (authLoading) {
    return <div className="wrap page page-narrow"><div className="empty" role="status"><Icon name="shield-check" size={42} /><h3>로그인 정보를 확인하고 있습니다.</h3></div></div>
  }

  if (!isLoggedIn || !authUserId) {
    return <div className="wrap page support-login-required">
      <button className="service-back" type="button" onClick={() => navigate('support')}>← 고객지원으로 돌아가기</button>
      <div className="empty">
        <span className="support-login-mark"><Icon name="user" size={28} /></span>
        <h1>1:1 문의는 로그인 후 이용할 수 있어요.</h1>
        <p>회원 정보와 주문 내역을 안전하게 연결해 문의를 접수합니다.</p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('login')}>로그인</button>
      </div>
    </div>
  }

  return <div className="wrap page support-inquiry-page"><InquiryWorkspace key={authUserId} authUserId={authUserId} user={user} navigate={navigate} /></div>
}
