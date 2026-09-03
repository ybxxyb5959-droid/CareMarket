export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-top">
          <div className="footer-brand">
            <span className="nm">CareMarket</span>
            <span className="tl">Pure &amp; Clean Nutrition</span>
          </div>
          <div className="footer-links">
            <span>철학과 원칙</span>
            <span>이용약관</span>
            <span style={{ color: 'var(--ink)', fontWeight: 700 }}>개인정보처리방침</span>
            <span>클린라벨 인증 기준</span>
            <span>고객행복센터 1588-0000</span>
          </div>
        </div>
        <div className="footer-fine">
          <p>(주)케어마켓코리아 · 대표이사 김케어 · 사업자등록번호 120-88-00000 · 통신판매업신고 2026-서울강남-0123호</p>
          <p>본 사이트는 프론트엔드 UI/UX 시연용 프로토타입이며, 표시된 모든 영양 수치와 식품·결제 데이터는 목업입니다.</p>
        </div>
      </div>
    </footer>
  )
}
