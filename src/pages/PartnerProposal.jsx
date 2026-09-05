import { useState } from 'react'
import Icon from '../components/Icon'
import { supabase } from '../lib/supabase'
import {
  EMPTY_PARTNERSHIP_FORM,
  PARTNERSHIP_PROPOSAL_TYPES,
  submitPartnershipInquiry,
  validatePartnershipForm,
} from '../lib/partnerships'
import { useStore } from '../store'

function FieldError({ id, message }) {
  if (!message) return null
  return <span id={id} className="proposal-error" role="alert">{message}</span>
}

export default function PartnerProposal() {
  const { navigate } = useStore()
  const [values, setValues] = useState(EMPTY_PARTNERSHIP_FORM)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [result, setResult] = useState(null)

  const setField = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => current[field] ? { ...current, [field]: undefined } : current)
    setSubmitError('')
  }

  const submit = async (event) => {
    event.preventDefault()
    if (submitting) return
    const nextErrors = validatePartnershipForm(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      document.getElementById(`proposal-${Object.keys(nextErrors)[0]}`)?.focus()
      return
    }

    setSubmitting(true)
    setSubmitError('')
    try {
      setResult(await submitPartnershipInquiry(supabase, values))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (caught) {
      console.error('Partnership inquiry submission failed:', { code: caught?.code || 'PARTNERSHIP_SUBMIT_FAILED' })
      setSubmitError('제안을 접수하지 못했습니다. 입력하신 내용은 그대로 유지되어 있으니 잠시 후 다시 시도해 주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  const describedBy = (field) => errors[field] ? `proposal-${field}-error` : undefined

  return <div className="wrap page service-page proposal-page">
    <button className="service-back" onClick={() => navigate('partners')}>← 제휴 안내로 돌아가기</button>
    <header className="proposal-heading">
      <span className="eyebrow">PARTNER APPLICATION</span>
      <h1>좋은 제품의 진심을<br />들려주세요.</h1>
      <p>케어마켓은 브랜드의 규모보다<br />제품을 만드는 기준과 이유를 먼저 살펴봅니다.</p>
    </header>

    <div className="proposal-layout">
      <aside className="proposal-aside">
        <span className="service-section-icon"><Icon name="leaf" size={24} /></span>
        <h2>좋은 제안은,<br />작은 이야기에서부터.</h2>
        <p>브랜드 소개와 대표 제품,<br />함께하고 싶은 협업을 적어주세요.</p>
        <ol><li className={!result ? 'active' : ''}>01 <span>제안 작성</span></li><li className={result ? 'active' : ''}>02 <span>접수 완료</span></li></ol>
        <div className="proposal-notice"><b>제안 검토 안내</b><p>접수된 내용은 CareMarket 담당자가 확인한 뒤 등록하신 연락처로 안내드립니다.</p></div>
      </aside>

      {result ? <section className="proposal-form proposal-success" role="status">
        <span className="proposal-success-icon"><Icon name="check" size={28} /></span>
        <h2>제안이 접수되었습니다.</h2>
        <p>소중한 제안을 보내주셔서 감사합니다.<br />내용을 확인한 후 등록하신 연락처로 안내드리겠습니다.</p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('main')}>케어마켓으로 돌아가기</button>
      </section> : <form className="proposal-form" onSubmit={submit} noValidate>
        <section className="proposal-form-section" aria-labelledby="proposal-brand-heading">
          <div className="proposal-section-heading"><h2 id="proposal-brand-heading">브랜드 정보</h2><span>* 필수 항목</span></div>
          <div className="proposal-fields">
            <label htmlFor="proposal-brandName">브랜드명 <span>*</span><input id="proposal-brandName" value={values.brandName} onChange={(event) => setField('brandName', event.target.value)} maxLength={120} autoComplete="organization" aria-invalid={Boolean(errors.brandName)} aria-describedby={describedBy('brandName')} /><FieldError id="proposal-brandName-error" message={errors.brandName} /></label>
            <label htmlFor="proposal-contactName">담당자명 <span>*</span><input id="proposal-contactName" value={values.contactName} onChange={(event) => setField('contactName', event.target.value)} maxLength={80} autoComplete="name" aria-invalid={Boolean(errors.contactName)} aria-describedby={describedBy('contactName')} /><FieldError id="proposal-contactName-error" message={errors.contactName} /></label>
            <label htmlFor="proposal-email">이메일 <span>*</span><input id="proposal-email" type="email" value={values.email} onChange={(event) => setField('email', event.target.value)} maxLength={254} autoComplete="email" placeholder="hello@brand.com" aria-invalid={Boolean(errors.email)} aria-describedby={describedBy('email')} /><FieldError id="proposal-email-error" message={errors.email} /></label>
            <label htmlFor="proposal-phone">연락처<input id="proposal-phone" type="tel" value={values.phone} onChange={(event) => setField('phone', event.target.value)} maxLength={40} autoComplete="tel" placeholder="010-0000-0000" /></label>
            <label className="proposal-field-wide" htmlFor="proposal-website">브랜드 홈페이지 또는 SNS<input id="proposal-website" type="url" value={values.website} onChange={(event) => setField('website', event.target.value)} maxLength={500} autoComplete="url" placeholder="https://" aria-invalid={Boolean(errors.website)} aria-describedby={describedBy('website')} /><FieldError id="proposal-website-error" message={errors.website} /></label>
          </div>
        </section>

        <section className="proposal-form-section" aria-labelledby="proposal-partnership-heading">
          <div className="proposal-section-heading"><h2 id="proposal-partnership-heading">제휴 정보</h2></div>
          <div className="proposal-fields">
            <label htmlFor="proposal-proposalType">제안 유형 <span>*</span><select id="proposal-proposalType" value={values.proposalType} onChange={(event) => setField('proposalType', event.target.value)} aria-invalid={Boolean(errors.proposalType)} aria-describedby={describedBy('proposalType')}><option value="">선택해 주세요</option>{PARTNERSHIP_PROPOSAL_TYPES.map((type) => <option key={type}>{type}</option>)}</select><FieldError id="proposal-proposalType-error" message={errors.proposalType} /></label>
            <label htmlFor="proposal-productCategory">상품 카테고리 <span>*</span><input id="proposal-productCategory" value={values.productCategory} onChange={(event) => setField('productCategory', event.target.value)} maxLength={100} placeholder="예: 건강 간편식" aria-invalid={Boolean(errors.productCategory)} aria-describedby={describedBy('productCategory')} /><FieldError id="proposal-productCategory-error" message={errors.productCategory} /></label>
            <label className="proposal-field-wide" htmlFor="proposal-productName">대표 제품명<input id="proposal-productName" value={values.productName} onChange={(event) => setField('productName', event.target.value)} maxLength={160} /></label>
          </div>
          <label className="proposal-message" htmlFor="proposal-brandDescription">브랜드와 제품을 소개해주세요 <span>*</span><textarea id="proposal-brandDescription" value={values.brandDescription} onChange={(event) => setField('brandDescription', event.target.value)} maxLength={4000} rows={7} placeholder="제품을 만드는 기준과 브랜드가 중요하게 생각하는 가치를 들려주세요." aria-invalid={Boolean(errors.brandDescription)} aria-describedby={describedBy('brandDescription')} /><FieldError id="proposal-brandDescription-error" message={errors.brandDescription} /></label>
          <p className="proposal-count">{values.brandDescription.length.toLocaleString()} / 4,000</p>
          <label className="proposal-message" htmlFor="proposal-partnershipReason">케어마켓과 함께하고 싶은 이유<textarea id="proposal-partnershipReason" value={values.partnershipReason} onChange={(event) => setField('partnershipReason', event.target.value)} maxLength={3000} rows={5} /></label>
          <p className="proposal-count">{values.partnershipReason.length.toLocaleString()} / 3,000</p>
          <label className={`proposal-privacy${errors.privacyAgreed ? ' has-error' : ''}`} htmlFor="proposal-privacyAgreed"><input id="proposal-privacyAgreed" type="checkbox" checked={values.privacyAgreed} onChange={(event) => setField('privacyAgreed', event.target.checked)} aria-invalid={Boolean(errors.privacyAgreed)} aria-describedby={describedBy('privacyAgreed')} /><span>제안 검토와 회신을 위한 개인정보 수집 및 이용에 동의합니다. <b>*</b></span></label>
          <FieldError id="proposal-privacyAgreed-error" message={errors.privacyAgreed} />
        </section>

        {submitError && <p className="proposal-submit-error" role="alert">{submitError}</p>}
        <div className="proposal-actions"><span>작성하신 내용은 제휴 검토 목적으로만 사용됩니다.</span><button className="service-cta partner-primary" type="submit" disabled={submitting}>{submitting ? '제안 보내는 중...' : '입점·제휴 제안 보내기'}{!submitting && <Icon name="arrow-up-right" size={17} />}</button></div>
      </form>}
    </div>
  </div>
}
