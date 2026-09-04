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
          <p>(주) 케어마켓코리아 (CareMarket., Ltd.) • 대표이사: 박용빈 • 사업자등록번호: 214-88-94XXX • 통신판매업신고: 2026-서울성동-10XX호</p>
          <p>본사: 서울특별시 성동구 연무장길 9-16 B02 • 개인정보보호책임자: 박용빈(ybxxyb5959@gmail.com)</p>
        </div>
      </div>
    </footer>
  )
}
