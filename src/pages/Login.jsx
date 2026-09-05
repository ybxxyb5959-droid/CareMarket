import { useState } from 'react'
import { useStore } from '../store'

export default function Login() {
  const { login, navigate } = useStore()
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
      </div>
    </div>
  )
}
