import { useStore } from '../store'
import Icon from '../components/Icon'

const PAGES = {
  about: {
    visual: 'selection',
    eyebrow: 'ABOUT CAREMARKET',
    title: '잘 먹고 싶은 마음이,\n좋은 선택으로 이어지도록.',
    intro: [
      '나의 일상에 어울리는 식품을 발견하는 곳, 케어마켓입니다. 상품의 정보를 일상의 맥락과 연결해 좋은 선택을 돕습니다.',
      '바쁜 아침부터 운동을 마친 저녁까지. 지금 나에게 필요한 식품을 이해하고, 자신의 기준으로 골라보세요.',
    ],
    sections: [
      ['01 / INFORMATION', '상품이 가진 사실부터 봅니다', '좋은 선택을 위해 가장 먼저 봐야 하는 것은 상품이 스스로 말해 주는 정보입니다. 원재료, 영양성분, 알레르기 정보처럼 확인 가능한 사실을 선택의 출발점으로 삼습니다.'],
      ['02 / CONTEXT', '정보를 일상의 맥락과 연결합니다', '같은 식품도 아침을 간단히 챙기려는 날, 운동 뒤 간식이 필요한 순간, 카페인을 피하고 싶은 저녁에 의미가 달라집니다. 정보가 실제 생활의 어떤 순간과 연결되는지 함께 보여주고자 합니다.'],
      ['03 / CHOICE', '선택의 주도권을 남겨둡니다', '추천은 답을 대신 정하는 일이 아니라 비교할 기준을 선명하게 만드는 일이라고 믿습니다. 이유를 이해하고 자신의 기준으로 마지막 선택을 내릴 수 있는 경험을 만듭니다.'],
    ],
    sectionIcons: ['package', 'calendar', 'check-circle'],
    cta: { label: '케어마켓 가치관', view: 'principles' },
  },
  principles: {
    visual: 'principles',
    eyebrow: 'OUR PRINCIPLES',
    title: '더 많이 보여주기보다,\n더 잘 고를 수 있도록.',
    intro: [
      '검색부터 추천의 이유, 상품 정보를 전하는 방식까지. 케어마켓은 네 가지 원칙으로 더 나은 선택을 돕습니다.',
    ],
    sections: [
      ['원칙 1', '필요한 제품을 먼저', '많은 상품을 보여주는 것보다 사용자의 생활과 목적에 필요한 상품을 찾을 수 있도록 돕는다.', null, '무엇이 인기 있는가보다 지금 무엇이 필요한가를 먼저 묻는다.'],
      ['원칙 2', '이해할 수 있는 정보', '복잡한 원재료와 영양정보를 사용자가 이해하기 쉬운 방식으로 전달한다.', null, '정보의 의미는 바꾸지 않되 비교할 수 있는 순서와 언어로 정리한다.'],
      ['원칙 3', '추천의 이유를 보여준다', 'AI가 추천했다는 사실보다 왜 해당 상품이 조건과 연결되었는지 이해할 수 있는 경험을 지향한다.', null, '조건과 상품 정보 사이의 연결을 설명해 추천을 직접 검토할 수 있게 한다.'],
      ['원칙 4', '건강을 과장하지 않는다', '식품을 질병의 진단이나 치료를 대신하는 수단으로 표현하지 않으며, 검증되지 않은 효능을 사실처럼 전달하지 않는다.', null, '식품이 할 수 있는 역할과 한계를 분명한 언어로 다룬다.'],
    ],
    sectionIcons: ['search', 'eye', 'sparkles', 'shield-check'],
    closing: '좋은 선택의 기준을, 함께 이어갈 브랜드를 기다립니다.',
    cta: { label: '입점 · 제휴 알아보기', view: 'partners' },
  },
  partners: {
    visual: 'partners',
    eyebrow: 'PARTNER WITH CAREMARKET',
    title: '좋은 제품의 진심이,\n일상에 닿도록.',
    intro: [
      '정성껏 만든 제품과 더 잘 먹고 싶은 마음이 만나는 곳. 케어마켓과 함께 건강한 일상의 선택을 넓혀갈 브랜드를 기다립니다.',
    ],
    sections: [
      ['01 / PRODUCT', '좋은 제품을 함께 소개해요', '원재료와 영양정보를 바탕으로 제품의 가치를 전하고, 필요한 고객이 발견할 수 있도록 돕습니다.'],
      ['02 / CONTENT', '브랜드의 이야기를 전해요', '제품을 만든 마음부터 일상 속 즐기는 방법까지. 고객이 공감할 수 있는 콘텐츠를 함께 만듭니다.'],
      ['03 / PROMOTION', '새로운 만남을 기획해요', '계절과 생활에 어울리는 기획전으로 브랜드와 고객이 자연스럽게 만나는 기회를 만듭니다.'],
    ],
    sectionIcons: ['package', 'leaf', 'sparkles'],
    steps: ['제안 접수', '브랜드 / 상품 검토', '협업 조건 협의', '상품 또는 콘텐츠 반영'],
  },
  terms: {
    eyebrow: 'CareMarket', title: '이용약관',
    intro: ['CareMarket 서비스 이용에 필요한 기본 사항을 안내합니다.'],
    sections: [['서비스 이용', '회원은 관련 법령과 본 안내를 준수하며 서비스를 이용합니다. 서비스 운영 내용은 필요에 따라 사전 안내 후 변경될 수 있습니다.'], ['주문과 결제', '주문 및 결제는 화면에 표시된 절차에 따라 진행됩니다. 주문 완료 후에는 주문내역에서 처리 상태를 확인할 수 있습니다.']],
  },
  privacy: {
    eyebrow: 'CareMarket', title: '개인정보처리방침',
    intro: ['CareMarket은 서비스 이용과 주문 처리에 필요한 정보만을 다룹니다.'],
    sections: [['수집하는 정보', '회원가입과 주문 과정에서 이름, 이메일, 연락처, 배송지 정보를 입력받을 수 있습니다.'], ['이용 목적', '회원 식별, 주문 및 배송 처리, 고객 문의 응대를 위해 사용합니다.'], ['보관과 삭제', '관련 법령에 따라 보관이 필요한 정보를 제외하고, 이용 목적이 끝난 정보는 지체 없이 삭제합니다.']],
  },
  cleanLabel: {
    eyebrow: 'CareMarket', title: '클린라벨 정보 기준',
    intro: ['클린라벨은 일률적인 인증 문구가 아니라 상품 페이지의 등록 정보로 확인합니다.'],
    sections: [['표기 기준', '원재료, 알레르기, 영양성분 및 카페인 정보는 판매자가 등록한 내용과 상품 표시 정보를 기준으로 안내합니다.'], ['확인 방법', '구매 전 상품 상세의 원재료 및 영양성분 정보를 확인해 주세요. 개인의 알레르기 또는 건강 상태는 전문가와 상담이 필요할 수 있습니다.']],
  },
  support: {
    eyebrow: 'CareMarket', title: '고객센터 안내',
    intro: ['주문과 서비스 이용에 관한 문의를 확인할 수 있는 안내 페이지입니다.'],
    sections: [['주문 확인', '결제가 완료된 주문은 마이페이지의 주문 · 배송 조회에서 상태를 확인할 수 있습니다.'], ['문의 안내', '서비스 내 주문 정보와 상품 상세 정보를 먼저 확인해 주세요. 추가 지원 채널은 서비스 운영 상황에 맞춰 안내됩니다.']],
  },
}

function BrandStoryVisual({ type }) {
  if (type === 'partners') return <div className="brand-story-visual partner-visual" role="img" aria-label="브랜드의 정성과 고객의 일상이 만나 함께 자라는 새싹">
    <span className="partner-visual-kicker">GROW TOGETHER</span>
    <svg viewBox="0 0 500 430" className="partner-sprout" aria-hidden="true">
      <circle cx="250" cy="210" r="145" fill="#edf4d9" />
      <path d="M250 327V194" fill="none" stroke="#547943" strokeWidth="4" />
      <path d="M250 247C167 248 133 204 139 151C209 146 252 181 250 247Z" fill="#a4c781" />
      <path d="M250 204C249 130 296 98 356 102C360 165 314 207 250 204Z" fill="#759d59" />
      <path d="M250 247L168 180M250 204L325 130" fill="none" stroke="#547943" strokeWidth="2" />
      <ellipse cx="250" cy="328" rx="76" ry="8" fill="#cadbb4" />
    </svg>
    <span className="partner-seed seed-brand">브랜드의 정성</span><span className="partner-seed seed-life">고객의 일상</span>
    <span className="partner-visual-caption">좋은 만남이 자라는 곳, CareMarket</span>
  </div>
  if (type === 'selection') {
    return <div className="brand-story-visual selection-visual" role="img" aria-label="상품의 정보와 일상의 맥락이 이해할 수 있는 선택으로 이어지는 과정">
      <svg className="brand-story-botanical" viewBox="0 0 560 430" aria-hidden="true">
        <path d="M34 381C154 338 190 224 206 62" />
        <path d="M190 142c-51-6-77-29-88-67 42-3 72 20 88 67Z" />
        <path d="M174 207c42-21 79-16 110 16-36 25-75 20-110-16Z" />
        <path d="M118 302c-43-1-72-20-88-55 39-9 72 10 88 55Z" />
        <circle cx="456" cy="74" r="112" />
        <circle cx="456" cy="74" r="78" />
      </svg>
      <div className="brand-story-seal">
        <span className="brand-story-mark"><Icon name="leaf" size={24} /></span>
        <small>CAREMARKET METHOD</small>
        <strong>정보에서<br />좋은 선택까지</strong>
        <em>PURE &amp; CLEAN</em>
      </div>
      <div className="brand-story-chip chip-information"><span>01</span><b>상품의 정보</b><small>원재료 · 영양정보</small></div>
      <div className="brand-story-chip chip-context"><span>02</span><b>나의 일상</b><small>목적 · 상황 · 조건</small></div>
      <div className="brand-story-chip chip-choice"><Icon name="check-circle" size={16} /><b>이해한 선택</b></div>
    </div>
  }

  return <div className="brand-story-visual principles-visual" role="img" aria-label="필요, 이해, 이유, 정직이라는 네 가지 CareMarket 원칙">
    <svg className="principles-orbit" viewBox="0 0 560 430" aria-hidden="true">
      <circle cx="280" cy="215" r="150" />
      <circle cx="280" cy="215" r="104" />
      <path d="M280 65v300M130 215h300" />
    </svg>
    <div className="principles-center">
      <Icon name="shield-check" size={25} />
      <small>ONE STANDARD</small>
      <strong>더 잘<br />고를 수 있도록</strong>
    </div>
    <span className="principle-word word-need"><i>01</i>필요</span>
    <span className="principle-word word-understand"><i>02</i>이해</span>
    <span className="principle-word word-reason"><i>03</i>이유</span>
    <span className="principle-word word-honest"><i>04</i>정직</span>
    <span className="principles-caption">OUR PRINCIPLES · CAREMARKET</span>
  </div>
}

export default function ServiceInfo() {
  const { view, navigate } = useStore()
  const page = PAGES[view] || PAGES.about
  return <div className={`wrap page service-page${page.visual ? ` story-page ${view}-page` : ''}`}>
    <button className="service-back" onClick={() => navigate('main')}>← CareMarket으로 돌아가기</button>
    <header className={`service-head${page.visual ? ' service-story-head' : ''}`}>
      <div className="service-head-copy">
        <span className="eyebrow">{page.eyebrow}</span>
        <h1>{page.title}</h1>
        {page.intro?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        {view === 'partners' && <a className="btn btn-primary partner-primary" href="/partners/proposal" onClick={(event) => { event.preventDefault(); navigate('partnerProposal') }}>입점 · 제휴 제안하기 <Icon name="arrow-up-right" size={17} /></a>}
      </div>
      {page.visual && <BrandStoryVisual type={page.visual} />}
    </header>
    {page.sections && <div className="service-body">
      {page.sections.map((entry, index) => {
        const [label, title, content, items, note] = entry.length === 2
          ? ['', entry[0], entry[1], null, null]
          : entry
        return <section key={label || title}>
          {(label || page.sectionIcons?.[index]) && <div className="service-section-meta">
            {page.visual === 'principles' && <span className="service-principle-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>}
            {label && <span className="service-section-label">{label}</span>}
            {page.sectionIcons?.[index] && <span className="service-section-icon"><Icon name={page.sectionIcons[index]} size={17} /></span>}
          </div>}
          {(title || content || note) && <div className="service-section-copy">
            {title && <h2>{title}</h2>}
            {content && <p>{content}</p>}
            {note && <p className="service-section-note">{note}</p>}
          </div>}
          {items && <ul className="service-list">{items.map((item) => <li key={item}>{item}</li>)}</ul>}
        </section>
      })}
    </div>}
    {page.steps && <><section className="partner-standard"><span className="service-section-icon"><Icon name="shield-check" size={22} /></span><div><span className="service-section-label">OUR SHARED STANDARD</span><h2>과장 없이 전하는 가치, 함께 지키는 기준.</h2><p>확인 가능한 상품 정보와 일상 속 사용 맥락을 소중히 여깁니다.<br />고객이 이해하고 선택할 수 있도록, 브랜드의 진심을 함께 전합니다.</p></div><button className="service-back" onClick={() => navigate('principles')}>우리의 원칙 보기 →</button></section><section className="service-process">
      <h2>입점 과정</h2>
      <ol>{page.steps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, '0')}</span>{step}{index < page.steps.length - 1 && <Icon name="chevron-right" size={16} className="service-process-arrow" />}</li>)}</ol>
    </section></>}
    {(page.closing || page.cta) && <section className="service-closing">
      {page.closing && <h2>{page.closing}</h2>}
      {page.cta && (view === 'about' || view === 'principles'
        ? <a className="service-next-link" href={view === 'about' ? '/principles' : '/partners'} onClick={(event) => { if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); navigate(page.cta.view) }}><span>{page.cta.label}</span><Icon name="chevron-right" size={15} /></a>
        : <button type="button" className={page.visual ? 'btn btn-primary' : 'service-cta'} onClick={() => navigate(page.cta.view)}>{page.cta.label}{view === 'partners' && <Icon name="arrow-up-right" size={17} />}</button>)}
    </section>}
    {page.unavailableCta && <section className="service-closing service-unavailable">
      <span className="service-cta is-disabled" aria-disabled="true">입점 · 제휴 제안하기</span>
      <p>입점 · 제휴 제안 접수를 준비하고 있습니다.</p>
    </section>}
  </div>
}
