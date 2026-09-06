import { useEffect, useState } from 'react'
import { useStore } from '../store'

const SOCIAL_PROVIDERS = [
  { id: 'naver', label: '네이버' },
  { id: 'kakao', label: '카카오' },
  { id: 'google', label: '구글' },
  { id: 'apple', label: '애플' },
]

function SocialMark({ provider }) {
  if (provider === 'google') {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#4285F4" d="M43.61 24.46c0-1.36-.12-2.66-.35-3.92H24v7.42h11a9.4 9.4 0 0 1-4.08 6.18v5.14h6.61c3.87-3.56 6.08-8.81 6.08-14.82Z" />
        <path fill="#34A853" d="M24 44c5.51 0 10.13-1.83 13.51-4.96l-6.61-5.14c-1.83 1.23-4.17 1.97-6.9 1.97-5.32 0-9.84-3.59-11.45-8.43H5.72v5.3A20 20 0 0 0 24 44Z" />
        <path fill="#FBBC05" d="M12.55 27.44a12 12 0 0 1 0-6.88v-5.3H5.72a20 20 0 0 0 0 17.48l6.83-5.3Z" />
        <path fill="#EA4335" d="M24 12.13c3 0 5.68 1.03 7.81 3.05l5.86-5.86C34.12 6.02 29.51 4 24 4A20 20 0 0 0 5.72 15.26l6.83 5.3C14.16 15.72 18.68 12.13 24 12.13Z" />
      </svg>
    )
  }

  if (provider === 'kakao') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5.2c-4.5 0-8.1 2.8-8.1 6.2 0 2.2 1.5 4.1 3.8 5.2l-.8 3 3.5-2.1c.5.1 1 .1 1.6.1 4.5 0 8.1-2.8 8.1-6.2S16.5 5.2 12 5.2Z" />
      </svg>
    )
  }

  if (provider === 'apple') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M17.1 12.7c0-2.4 2-3.6 2.1-3.7a4.5 4.5 0 0 0-3.5-1.9c-1.5-.2-2.9.9-3.6.9-.8 0-1.9-.9-3.1-.9a4.7 4.7 0 0 0-4 2.4c-1.7 2.9-.4 7.3 1.2 9.7.8 1.2 1.8 2.5 3.1 2.4 1.2 0 1.7-.8 3.2-.8s1.9.8 3.2.8 2.2-1.2 3-2.4a10.6 10.6 0 0 0 1.4-2.9c-.1 0-3-.9-3-3.6ZM14.7 5.5a4.1 4.1 0 0 0 1-3 4.3 4.3 0 0 0-2.8 1.4 3.9 3.9 0 0 0-1 2.9 3.6 3.6 0 0 0 2.8-1.3Z" />
      </svg>
    )
  }

  return <span aria-hidden="true">{provider === 'naver' ? 'N' : 'G'}</span>
}

export default function Login() {
  const { login, loginWithOAuth, navigate, showToast } = useStore()
  const [oauthPending, setOauthPending] = useState(null)
  const handleOAuthLogin = async (provider) => {
    if (oauthPending || isSubmitting) return
    setOauthPending(provider)
    if (!await loginWithOAuth(provider)) setOauthPending(null)
  }
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!oauthPending) return undefined
    // Recover if external navigation is blocked, or the user returns using Back.
    const reset = () => setOauthPending(null)
    const timer = window.setTimeout(() => {
      reset()
      showToast('인증 페이지로 이동하지 못했습니다. 일반 브라우저에서 다시 시도해 주세요.', 'auth-error')
    }, 15000)
    window.addEventListener('pageshow', reset)
    return () => { window.clearTimeout(timer); window.removeEventListener('pageshow', reset) }
  }, [oauthPending, showToast])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    await login({ email, password })
    setIsSubmitting(false)
  }

  return (
    <div className="auth-page auth-login-page">
      <div className="auth-container auth-login-container">
        <div className="auth-head auth-head-lg">
          <span className="eyebrow">CareMarket</span>
          <h2>로그인</h2>
          <p>맞춤형 웰빙 커머스를 더 편리하게 이용해 보세요.</p>
        </div>
        <form className="auth-login-form" onSubmit={handleSubmit}>
          <div className="field">
            <label>이메일</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </div>
          <div className="field">
            <label>비밀번호</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </div>
          <button type="submit" className="btn btn-primary btn-lg auth-login-submit" disabled={isSubmitting || Boolean(oauthPending)}>
            {isSubmitting ? '로그인 중...' : '로그인하기'}
          </button>
        </form>
        <div className="auth-foot">
          <button onClick={() => navigate('register')}>회원가입</button>
          <span>·</span>
          <span style={{ cursor: 'default' }}>비밀번호 찾기</span>
        </div>

        <section className="social-login" aria-labelledby="social-login-title">
          <div className="social-login-title">
            <span id="social-login-title">간편 로그인</span>
          </div>
          <div className="social-login-options">
            {SOCIAL_PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                type="button"
                className={`social-login-button social-login-${provider.id}`}
                aria-label={['google', 'kakao'].includes(provider.id) ? `${provider.id === 'google' ? 'Google' : provider.label}로 계속하기` : `${provider.label}로 간편 로그인`}
                title={`${provider.label}로 계속하기`}
                disabled={isSubmitting || Boolean(oauthPending)}
                aria-busy={oauthPending === provider.id}
                onClick={() => ['google', 'kakao'].includes(provider.id) ? handleOAuthLogin(provider.id) : showToast(`${provider.label} 간편 로그인은 준비 중입니다.`)}
              >
                <SocialMark provider={provider.id} />
              </button>
            ))}
          </div>
          {oauthPending && <p className="auth-hint" role="status">{oauthPending === 'google' ? 'Google' : '카카오'}로 이동 중...</p>}
          <button type="button" className="social-login-privacy" onClick={() => navigate('privacy')}>
            개인정보처리방침
          </button>
        </section>
      </div>
    </div>
  )
}
