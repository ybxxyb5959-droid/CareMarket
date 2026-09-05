import { useStore } from '../store'

const LINKS = [
  ['철학과 원칙', 'philosophy'], ['이용약관', 'terms'], ['개인정보처리방침', 'privacy'],
  ['클린라벨 정보 기준', 'cleanLabel'], ['고객센터 안내', 'support'],
]

export default function Footer() {
  const { navigate } = useStore()
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-top">
          <div className="footer-brand">
            <span className="nm">CareMarket</span>
            <span className="tl">Pure &amp; Clean Nutrition</span>
          </div>
          <nav className="footer-links" aria-label="서비스 안내">
            {LINKS.map(([label, view]) => <button key={view} onClick={() => navigate(view)}>{label}</button>)}
          </nav>
        </div>
        <div className="footer-fine">
          <p>CareMarket은 건강식품과 식단 상품을 둘러보고 주문할 수 있는 서비스입니다.</p>
          <p>상품 정보와 주문 관련 안내는 각 상품 상세 및 주문내역에서 확인할 수 있습니다.</p>
        </div>
      </div>
    </footer>
  )
}
