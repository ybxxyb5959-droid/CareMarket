import { useMemo, useState } from 'react'
import Icon from '../components/Icon'
import { SUPPORT_CATEGORIES, SUPPORT_FAQS, searchSupportFaqs } from '../lib/support'
import { useStore } from '../store'

const FREQUENT = '자주 찾는 질문'

export default function Support() {
  const { navigate } = useStore()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(FREQUENT)
  const [openId, setOpenId] = useState(null)
  const trimmedQuery = query.trim()

  const visibleFaqs = useMemo(() => {
    if (trimmedQuery) return searchSupportFaqs(trimmedQuery)
    if (category === FREQUENT) return SUPPORT_FAQS.filter((faq) => faq.featured).slice(0, 6)
    return SUPPORT_FAQS.filter((faq) => faq.category === category)
  }, [category, trimmedQuery])

  const selectCategory = (nextCategory) => {
    setCategory(nextCategory)
    setQuery('')
    setOpenId(null)
  }

  const updateQuery = (event) => {
    setQuery(event.target.value)
    setOpenId(null)
  }

  return (
    <div className="support-page">
      <header className="support-hero">
        <div className="wrap support-hero-inner">
          <span className="eyebrow">CUSTOMER CARE</span>
          <h1>무엇을 도와드릴까요?</h1>
          <p>CareMarket 이용 중 궁금한 내용을 빠르게 확인해보세요.</p>
          <div className="support-search" role="search">
            <Icon name="search" size={21} />
            <input
              id="support-search-input"
              type="search"
              aria-label="FAQ 검색"
              value={query}
              onChange={updateQuery}
              placeholder="궁금한 내용을 검색해보세요."
              autoComplete="off"
            />
            {query && <button type="button" onClick={() => { setQuery(''); setOpenId(null) }} aria-label="검색어 지우기"><Icon name="x" size={17} /></button>}
          </div>
        </div>
      </header>

      <div className="wrap support-content">
        <nav className="support-categories" aria-label="FAQ 카테고리">
          {[FREQUENT, ...SUPPORT_CATEGORIES].map((item) => (
            <button
              key={item}
              type="button"
              className={category === item && !trimmedQuery ? 'active' : ''}
              onClick={() => selectCategory(item)}
            >
              {item}
            </button>
          ))}
        </nav>

        <section className="support-faq" aria-labelledby="support-faq-title">
          <div className="support-section-head">
            <div>
              <span className="eyebrow">FAQ</span>
              <h2 id="support-faq-title">{trimmedQuery ? `'${trimmedQuery}' 검색 결과` : category}</h2>
            </div>
            <span>{visibleFaqs.length}개</span>
          </div>

          {visibleFaqs.length > 0 ? (
            <div className="support-accordion">
              {visibleFaqs.map((faq) => {
                const expanded = openId === faq.id
                return (
                  <article key={faq.id} className={expanded ? 'open' : ''}>
                    <h3>
                      <button
                        type="button"
                        aria-expanded={expanded}
                        aria-controls={`faq-answer-${faq.id}`}
                        onClick={() => setOpenId(expanded ? null : faq.id)}
                      >
                        <span className="support-faq-category">{faq.category}</span>
                        <span className="support-faq-question"><b>Q.</b> {faq.question}</span>
                        <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={18} />
                      </button>
                    </h3>
                    {expanded && <div id={`faq-answer-${faq.id}`} className="support-faq-answer"><span>A.</span><p>{faq.answer}</p></div>}
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="support-empty">
              <span className="support-empty-mark"><Icon name="search" size={25} /></span>
              <h3>검색 결과가 없어요.</h3>
              <p>다른 검색어를 입력하거나<br />1:1 문의를 이용해주세요.</p>
              <button type="button" className="btn btn-primary" onClick={() => navigate('supportInquiry')}>1:1 문의하기</button>
            </div>
          )}
        </section>

        <section className="support-inquiry-cta">
          <div>
            <span className="eyebrow">ONE-TO-ONE INQUIRY</span>
            <h2>찾는 답변이 없으신가요?</h2>
            <p>1:1 문의를 남겨주세요. 문의 내용을 확인할 수 있도록 안전하게 접수합니다.</p>
          </div>
          <div className="support-inquiry-actions">
            <button type="button" className="service-cta" onClick={() => navigate('supportInquiry')}>1:1 문의하기 <Icon name="chevron-right" size={17} /></button>
            <button type="button" className="btn btn-text" onClick={() => navigate('supportInquiries')}>내 문의 내역 →</button>
          </div>
        </section>
      </div>
    </div>
  )
}
