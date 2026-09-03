import { useStore } from '../store'

export default function Register() {
  const { navigate, showToast } = useStore()
  return (
    <div className="wrap page">
      <div className="page-slim" style={{ margin: '0 auto' }}>
        <div className="panel">
          <div className="auth-head">
            <h2>간편 회원가입</h2>
            <p>가입 후 웰빙 체질 분석으로 이어집니다.</p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              showToast('가입 완료! 웰빙 목표 설정으로 이동합니다.')
              navigate('goalSetup')
            }}
          >
            <div className="field">
              <label>이름</label>
              <input type="text" defaultValue="김케어" required />
            </div>
            <div className="field">
              <label>이메일</label>
              <input type="email" defaultValue="kimcare@caremarket.kr" required />
            </div>
            <div className="field">
              <label>비밀번호</label>
              <input type="password" defaultValue="password1234!" required />
            </div>
            <button type="submit" className="btn btn-accent btn-lg btn-block" style={{ marginTop: 8 }}>
              회원가입 완료 &amp; 건강목표 설정
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
