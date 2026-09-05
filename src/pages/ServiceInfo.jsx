import { useStore } from '../store'

const PAGES = {
  philosophy: {
    eyebrow: 'CareMarket', title: '철학과 원칙',
    intro: 'CareMarket은 상품에 등록된 정보가 쇼핑의 출발점이 되어야 한다고 생각합니다.',
    sections: [['상품 정보', '상품명, 원재료, 영양성분, 알레르기 정보 등 판매자가 등록한 정보를 우선해 안내합니다.'], ['선택의 기준', '과도한 표현보다 필요한 정보를 보기 쉽게 정리해, 각자의 식단과 생활에 맞는 선택을 돕습니다.']],
  },
  terms: {
    eyebrow: 'CareMarket', title: '이용약관',
    intro: 'CareMarket 서비스 이용에 필요한 기본 사항을 안내합니다.',
    sections: [['서비스 이용', '회원은 관련 법령과 본 안내를 준수하며 서비스를 이용합니다. 서비스 운영 내용은 필요에 따라 사전 안내 후 변경될 수 있습니다.'], ['주문과 결제', '주문 및 결제는 화면에 표시된 절차에 따라 진행됩니다. 주문 완료 후에는 주문내역에서 처리 상태를 확인할 수 있습니다.']],
  },
  privacy: {
    eyebrow: 'CareMarket', title: '개인정보처리방침',
    intro: 'CareMarket은 서비스 이용과 주문 처리에 필요한 정보만을 다룹니다.',
    sections: [['수집하는 정보', '회원가입과 주문 과정에서 이름, 이메일, 연락처, 배송지 정보를 입력받을 수 있습니다.'], ['이용 목적', '회원 식별, 주문 및 배송 처리, 고객 문의 응대를 위해 사용합니다.'], ['보관과 삭제', '관련 법령에 따라 보관이 필요한 정보를 제외하고, 이용 목적이 끝난 정보는 지체 없이 삭제합니다.']],
  },
  cleanLabel: {
    eyebrow: 'CareMarket', title: '클린라벨 정보 기준',
    intro: '클린라벨은 일률적인 인증 문구가 아니라 상품 페이지의 등록 정보로 확인합니다.',
    sections: [['표기 기준', '원재료, 알레르기, 영양성분 및 카페인 정보는 판매자가 등록한 내용과 상품 표시 정보를 기준으로 안내합니다.'], ['확인 방법', '구매 전 상품 상세의 원재료 및 영양성분 정보를 확인해 주세요. 개인의 알레르기 또는 건강 상태는 전문가와 상담이 필요할 수 있습니다.']],
  },
  support: {
    eyebrow: 'CareMarket', title: '고객센터 안내',
    intro: '주문과 서비스 이용에 관한 문의를 확인할 수 있는 안내 페이지입니다.',
    sections: [['주문 확인', '결제가 완료된 주문은 마이페이지의 주문 · 배송 조회에서 상태를 확인할 수 있습니다.'], ['문의 안내', '서비스 내 주문 정보와 상품 상세 정보를 먼저 확인해 주세요. 추가 지원 채널은 서비스 운영 상황에 맞춰 안내됩니다.']],
  },
}

export default function ServiceInfo() {
  const { view, navigate } = useStore()
  const page = PAGES[view] || PAGES.philosophy
  return <div className="wrap page service-page">
    <button className="service-back" onClick={() => navigate('main')}>← CareMarket으로 돌아가기</button>
    <header className="service-head"><span className="eyebrow">{page.eyebrow}</span><h1>{page.title}</h1><p>{page.intro}</p></header>
    <div className="service-body">{page.sections.map(([title, content]) => <section key={title}><h2>{title}</h2><p>{content}</p></section>)}</div>
  </div>
}
