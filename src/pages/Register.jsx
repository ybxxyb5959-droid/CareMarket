import { useState } from 'react'
import { useStore } from '../store'

export default function Register() {
  const { navigate, register } = useStore()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    await register({ displayName, email, password })
    setIsSubmitting(false)
  }

  return (
    <div className="wrap page">
      <div className="page-slim" style={{ margin: '0 auto' }}>
        <div className="panel">
          <div className="auth-head">
            <h2>간편 회원가입</h2>
            <p>가입 후 웰빙 체질 분석으로 이어집니다.</p>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>이름</label>
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
            </div>
            <div className="field">
              <label>이메일</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label>비밀번호</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-accent btn-lg btn-block" style={{ marginTop: 8 }} disabled={isSubmitting}>
              {isSubmitting ? '가입 중...' : '회원가입 완료 & 건강목표 설정'}
            </button>
          </form>
          <div className="auth-foot">
            이미 계정이 있으신가요?
            <button onClick={() => navigate('login')}>로그인</button>
          </div>
        </div>
      </div>
    </div>
  )
}
