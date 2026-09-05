import { useStore } from '../store'

const GROUPS = [
  { title: 'SHOP', links: [
    ['전체상품', 'products'], ['베스트', null], ['신상품', null], ['오늘의 웰빙 테이블', 'wellness'],
  ] },
  { title: 'ABOUT', links: [
    ['케어마켓 소개', 'about'], ['철학과 원칙', 'principles'], ['클린라벨 정보 기준', 'cleanLabel'],
  ] },
  { title: 'PARTNERS', links: [
    ['브랜드 입점 · 제휴', 'partners'],
  ] },
  { title: 'SUPPORT', links: [
    ['주문 · 배송 조회', 'orders'], ['고객센터', 'support'], ['FAQ', null],
  ] },
  { title: 'POLICY', links: [
    ['이용약관', 'terms'], ['개인정보처리방침', 'privacy'],
  ] },
]

export default function Footer() {
  const { navigate } = useStore()
  const openLink = (view) => {
    if (view === 'wellness') {
      navigate('main')
      window.setTimeout(() => {
        document.querySelector('.wellness-table-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 0)
      return
    }
    navigate(view)
  }

  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-top">
          <div className="footer-brand">
            <span className="nm">CareMarket</span>
            <span className="tl">Pure &amp; Clean Nutrition</span>
          </div>
          <nav className="footer-links" aria-label="서비스 안내">
            {GROUPS.map((group) => (
              <section className="footer-group" key={group.title}>
                <h2>{group.title}</h2>
                <div>
                  {group.links.map(([label, view]) => view ? (
                    <button key={label} type="button" onClick={() => openLink(view)}>{label}</button>
                  ) : (
                    <span key={label} className="footer-link-pending" aria-disabled="true" title="준비 중">{label}</span>
                  ))}
                </div>
              </section>
            ))}
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
