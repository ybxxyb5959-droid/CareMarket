import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import Icon from '../components/Icon'
import { openPostcode } from '../lib/postcode'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const AGREEMENTS = [
  {
    key: 'terms',
    label: '서비스 이용약관 동의',
    required: true,
    doc: 'CareMarket는 건강식품 큐레이션·주문 서비스를 제공합니다. 회원은 관련 법령과 본 약관을 준수하며, 서비스 운영 내용은 필요한 경우 사전 안내 후 변경될 수 있습니다.',
  },
  {
    key: 'privacy',
    label: '개인정보 수집·이용 동의',
    required: true,
    doc: '이름·이메일·연락처·주소를 회원 식별과 주문·배송 처리를 위해 수집·이용합니다. 회원 탈퇴 시 관계 법령에 따른 보관분을 제외하고 지체 없이 파기합니다.',
  },
  {
    key: 'marketing',
    label: '마케팅 정보 수신 동의 (선택)',
    required: false,
    doc: '신상품·혜택·이벤트 소식을 이메일 등으로 받아보실 수 있습니다. 동의하지 않아도 서비스 이용에 제한이 없으며, 언제든지 수신을 해지할 수 있습니다.',
  },
]

export default function Register() {
  const { navigate, register, checkEmailExists, user, profile, oauthRegistrationRequired, completeOAuthRegistration, logout } = useStore()
  const oauthSignup = Boolean(user?.oauth)
  const [step, setStep] = useState(1)

  // STEP 1 — 약관
  const [agree, setAgree] = useState({ terms: false, privacy: false, marketing: false })
  const [openDoc, setOpenDoc] = useState(null)

  // STEP 2 — 회원정보
  const [form, setForm] = useState({
    email: oauthSignup ? user.email : '', password: '', passwordConfirm: '',
    displayName: oauthSignup ? user.name : '', phone: oauthSignup ? profile.phone : '',
    postalCode: oauthSignup ? profile.postalCode : '', address: oauthSignup ? profile.address : '', addressDetail: oauthSignup ? profile.addressDetail : '',
  })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const emailDebounce = useRef(null)

  useEffect(() => {
    if (oauthSignup && oauthRegistrationRequired === false) navigate('main')
  }, [oauthSignup, oauthRegistrationRequired, navigate])

  // 이메일 입력이 멈추면(디바운스) 이미 가입된 이메일인지 실시간 확인
  useEffect(() => {
    if (oauthSignup) return undefined
    const value = form.email.trim()
    if (emailDebounce.current) window.clearTimeout(emailDebounce.current)
    if (!EMAIL_RE.test(value)) return undefined
    emailDebounce.current = window.setTimeout(async () => {
      const exists = await checkEmailExists(value)
      // 확인이 끝나는 사이 값이 바뀌지 않았을 때만 반영
      if (exists && value === form.email.trim()) setEmailError('이미 가입되어 있는 이메일입니다.')
    }, 450)
    return () => window.clearTimeout(emailDebounce.current)
  }, [form.email, checkEmailExists, oauthSignup])

  const pwFilled = form.passwordConfirm.length > 0
  const pwMatch = pwFilled && form.password === form.passwordConfirm
  const allChecked = agree.terms && agree.privacy && agree.marketing
  const requiredDone = agree.terms && agree.privacy
  const setField = (name, value) => {
    if (name === 'email') setEmailError('')
    setForm((c) => ({ ...c, [name]: value }))
  }

  const toggleAll = () => {
    const next = !allChecked
    setAgree({ terms: next, privacy: next, marketing: next })
  }
  const toggleOne = (key) => setAgree((c) => ({ ...c, [key]: !c[key] }))

  const findPostcode = () => {
    openPostcode(({ zonecode, address }) => {
      setForm((c) => ({ ...c, postalCode: zonecode, address }))
    }).catch(() => setError('우편번호 서비스를 불러오지 못했습니다. 직접 입력해 주세요.'))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (isSubmitting || (oauthSignup && oauthRegistrationRequired !== true)) return
    setError('')
    setEmailError('')
    if (!requiredDone) return setError('필수 약관에 동의해 주세요.')
    if (!oauthSignup && form.password.length < 6) return setError('비밀번호는 6자 이상 입력해 주세요.')
    if (!oauthSignup && form.password !== form.passwordConfirm) return setError('비밀번호가 일치하지 않습니다.')
    setIsSubmitting(true)
    const result = await (oauthSignup ? completeOAuthRegistration : register)({
      email: form.email,
      password: form.password,
      displayName: form.displayName,
      phone: form.phone,
      postalCode: form.postalCode,
      address: form.address,
      addressDetail: form.addressDetail,
      termsAgreed: agree.terms,
      privacyAgreed: agree.privacy,
      marketingAgreed: agree.marketing,
    })
    setIsSubmitting(false)
    if (!result.ok) {
      if (result.reason === 'duplicate-email') setEmailError('가입되어 있는 이메일입니다.')
      else if (oauthSignup) setError('추가정보를 저장하지 못했습니다. 입력한 정보를 확인하고 다시 시도해 주세요.')
      else setError('회원가입에 실패했습니다. 잠시 후 다시 시도해 주세요.')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-head auth-head-lg">
          <span className="eyebrow">Join CareMarket</span>
          <h2>회원가입</h2>
          <p>{oauthSignup ? '간편 로그인 인증이 완료되었습니다. 약관 동의와 배송 정보를 입력하면 가입이 완료됩니다.' : '약관에 동의하고 회원정보를 입력해 주세요.'}</p>
        </div>

        <div className="auth-steps">
                <span className={`auth-step${step === 1 ? ' on' : ''}`}><i>1</i> 약관 동의</span>
                <span className="auth-step-line" />
                <span className={`auth-step${step === 2 ? ' on' : ''}`}><i>2</i> 회원정보 입력</span>
        </div>

              {step === 1 ? (
                <div>
                  <button type="button" className={`agree-all${allChecked ? ' on' : ''}`} onClick={toggleAll}>
                    <span className="agree-box"><Icon name="check" size={13} strokeWidth={3} /></span>
                    전체 약관에 동의합니다
                  </button>

                  <ul className="agree-list">
                    {AGREEMENTS.map((a) => (
                      <li key={a.key} className="agree-item">
                        <div className="agree-row">
                          <button type="button" className={`agree-check${agree[a.key] ? ' on' : ''}`} onClick={() => toggleOne(a.key)}>
                            <span className="agree-box"><Icon name="check" size={12} strokeWidth={3} /></span>
                            <span className="agree-label">
                              {a.required && <em className="agree-req">필수</em>}
                              {a.label}
                            </span>
                          </button>
                          <button
                            type="button"
                            className="agree-doc-toggle"
                            onClick={() => setOpenDoc(openDoc === a.key ? null : a.key)}
                            aria-expanded={openDoc === a.key}
                          >
                            전문보기 <Icon name={openDoc === a.key ? 'chevron-up' : 'chevron-down'} size={13} />
                          </button>
                        </div>
                        {openDoc === a.key && <p className="agree-doc">{a.doc}</p>}
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    className="btn btn-accent btn-lg btn-block auth-form-button"
                    style={{ marginTop: 20 }}
                    disabled={!requiredDone}
                    onClick={() => setStep(2)}
                  >
                    다음
                  </button>
                  {!requiredDone && <p className="auth-hint">필수 약관에 동의해야 다음 단계로 진행할 수 있습니다.</p>}
                </div>
              ) : (
                <form onSubmit={submit}>
                  <div className="auth-fields">
                    <div className="field">
                      <label>이메일</label>
                      <input className={emailError ? 'input-warning' : ''} type="email" value={form.email} readOnly={oauthSignup} placeholder={oauthSignup && !form.email ? '제공되지 않음' : undefined} onChange={(e) => setField('email', e.target.value)} autoComplete="email" aria-describedby={emailError ? 'email-error' : undefined} required={!oauthSignup} />
                      {emailError && <p id="email-error" className="auth-field-error" role="alert">{emailError}</p>}
                    </div>
                    <div className="field">
                      <label>이름</label>
                      <input type="text" value={form.displayName} onChange={(e) => setField('displayName', e.target.value)} autoComplete="name" required />
                    </div>
                    {!oauthSignup && <><div className="field">
                      <label>비밀번호</label>
                      <div className="pw-field">
                        <input type={showPw ? 'text' : 'password'} value={form.password} onChange={(e) => setField('password', e.target.value)} autoComplete="new-password" minLength={6} aria-describedby="password-hint" required />
                        <button type="button" className="pw-toggle" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 보기'}>
                          <Icon name={showPw ? 'eye-off' : 'eye'} size={17} />
                        </button>
                      </div>
                      <p id="password-hint" className="auth-field-hint">비밀번호는 6자리 이상 입력해 주세요.</p>
                    </div>
                    <div className="field">
                      <label>비밀번호 확인</label>
                      <div className="pw-field">
                        <input
                          className={pwFilled ? (pwMatch ? 'input-ok' : 'input-warning') : ''}
                          type={showPw ? 'text' : 'password'}
                          value={form.passwordConfirm}
                          onChange={(e) => setField('passwordConfirm', e.target.value)}
                          autoComplete="new-password"
                          aria-describedby="password-confirm-msg"
                          required
                        />
                      </div>
                      {pwFilled && (
                        <p id="password-confirm-msg" className={pwMatch ? 'auth-field-ok' : 'auth-field-error'} role="status">
                          {pwMatch ? '비밀번호가 일치합니다.' : '비밀번호가 일치하지 않습니다.'}
                        </p>
                      )}
                    </div>
                    </>}
                    <div className="field">
                      <label>휴대전화번호</label>
                      <input type="tel" inputMode="tel" value={form.phone} onChange={(e) => setField('phone', e.target.value)} autoComplete="tel" placeholder="010-0000-0000" required />
                    </div>
                    <div className="field span-2">
                      <label>우편번호</label>
                      <div className="postcode-row">
                        <input type="text" value={form.postalCode} onChange={(e) => setField('postalCode', e.target.value)} placeholder="우편번호" readOnly />
                        <button type="button" className="btn btn-ghost btn-sm" onClick={findPostcode}>우편번호 찾기</button>
                      </div>
                    </div>
                    <div className="field span-2">
                      <label>기본주소</label>
                      <input type="text" value={form.address} onChange={(e) => setField('address', e.target.value)} autoComplete="street-address" placeholder="주소 찾기로 입력됩니다" required />
                    </div>
                    <div className="field span-2">
                      <label>상세주소</label>
                      <input type="text" value={form.addressDetail} onChange={(e) => setField('addressDetail', e.target.value)} autoComplete="address-line2" placeholder="상세주소를 입력해 주세요" />
                    </div>
                  </div>

                  {error && <p className="auth-error-msg" role="alert">{error}</p>}

                  <div className="auth-actions">
                    <button type="button" className="btn btn-accent btn-lg auth-form-button" onClick={() => setStep(1)}>이전</button>
                    <button type="submit" className="btn btn-accent btn-lg auth-form-button auth-submit" disabled={isSubmitting}>
                      {isSubmitting ? '가입 중...' : '가입 완료'}
                    </button>
                  </div>
                </form>
              )}
        <div className="auth-foot">
          {oauthSignup ? <button onClick={logout} disabled={isSubmitting}>나중에 완료하고 로그아웃</button> : <>이미 계정이 있으신가요?<button onClick={() => navigate('login')}>로그인</button></>}
        </div>
      </div>
    </div>
  )
}
