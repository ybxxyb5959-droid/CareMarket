import { useState } from 'react'
import { useStore } from '../store'

const SOCIAL_PROVIDERS = [
  { id: 'naver', label: '네이버' },
  { id: 'kakao', label: '카카오' },
  { id: 'google', label: '구글' },
  { id: 'apple', label: '애플' },
]

function SocialMark({ provider }) {
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
  const { login, navigate, showToast } = useStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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
          <button type="submit" className="btn btn-primary btn-lg auth-login-submit" disabled={isSubmitting}>
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
                aria-label={`${provider.label}로 간편 로그인`}
                onClick={() => showToast(`${provider.label} 간편 로그인은 준비 중입니다.`)}
              >
                <SocialMark provider={provider.id} />
              </button>
            ))}
          </div>
          <button type="button" className="social-login-privacy" onClick={() => navigate('privacy')}>
            개인정보처리방침
          </button>
        </section>
      </div>
    </div>
  )
}
