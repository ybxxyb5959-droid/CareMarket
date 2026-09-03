import { useStore } from '../store'

export default function Login() {
  const { login, navigate } = useStore()
  return (
    <div className="wrap page">
      <div className="page-slim" style={{ margin: '0 auto' }}>
        <div className="panel">
          <div className="auth-head">
            <h2>로그인</h2>
            <p>CareMarket 맞춤형 웰빙 커머스</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); login() }}>
            <div className="field">
              <label>이메일</label>
              <input type="email" defaultValue="kimcare@caremarket.kr" required />
            </div>
            <div className="field">
              <label>비밀번호</label>
              <input type="password" defaultValue="password1234!" required />
            </div>
            <button type="submit" className="btn btn-primary btn-lg btn-block" style={{ marginTop: 8 }}>
              로그인하기
            </button>
          </form>
          <div className="auth-foot">
            <button onClick={() => navigate('register')}>회원가입</button>
            <span>·</span>
            <span style={{ cursor: 'default' }}>비밀번호 찾기</span>
          </div>
        </div>
      </div>
    </div>
  )
}
