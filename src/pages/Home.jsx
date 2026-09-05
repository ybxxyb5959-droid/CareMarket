import { useEffect, useMemo, useState } from 'react'
import { useStore, useAutoSlide } from '../store'
import { CATEGORIES, GOALS, HERO_SLIDES, VALUES } from '../data/mock'
import Icon from '../components/Icon'
import ProductCard from '../components/ProductCard'
import WellnessTable from '../components/WellnessTable'
import { filterAndSort } from '../lib/catalog'
import { getCountdown, getLocalDateKey, selectDailyDeals } from '../lib/deals'
import DealProductCard from '../components/DealProductCard'

// 주목표별 강조 안내문
const GOAL_GUIDE = {
  '근육량 증가': '순수 단백질 함량을 우선 표시합니다.',
  '체중 관리': '열량과 당류 정보를 우선 표시합니다.',
  '식단 영양 관리': '나트륨과 당류 정보를 우선 표시합니다.',
  '영양제 탐색': '핵심 기능성분 함량을 우선 표시합니다.',
}

const CATEGORY_META = {
  전체상품: { icon: 'package', description: '전체 상품 보기' },
  프로틴: { icon: 'dumbbell', description: '단백질 음료와 간식' },
  간편식: { icon: 'apple', description: '균형 잡힌 한 끼' },
  건강음료: { icon: 'droplets', description: '저당 음료와 대체유' },
  건강간식: { icon: 'sun', description: '견과와 건강 스낵' },
  영양제: { icon: 'pill', description: '일상 영양 케어' },
}

export default function Home() {
  const {
    goal, setGoal, subFilters, setSubFilters, allergies,
    products, productsLoading, openProduct, navigate,
    isLoggedIn, logout, setShopCategory, setShopSub, setSortBy,
    setDealsOnly, setSearch, clearAiSearch,
  } = useStore()

  const [slide, setSlide] = useAutoSlide(HERO_SLIDES.length)
  const [focusGoal, setFocusGoal] = useState(null) // 비로그인 목표 셀렉터: 포커스된 목표
  const [clock, setClock] = useState(() => ({
    dateKey: getLocalDateKey(),
    countdown: getCountdown(),
  }))
  const hero = HERO_SLIDES[slide]
  const activeGoal = GOALS.find((g) => g.name === focusGoal)

  // 맞춤 추천 4개 (목표 기반, 필터 무관)
  const recommended = useMemo(
    () => filterAndSort(products, { search: '', subFilters: [], allergies, sortBy: 'recommend', goal, shopCategory: '전체상품', shopSub: '전체' }).slice(0, 4),
    [products, allergies, goal],
  )

  const dailyDeals = useMemo(
    () => selectDailyDeals(products, clock.dateKey),
    [products, clock.dateKey],
  )

  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      setClock({ dateKey: getLocalDateKey(now), countdown: getCountdown(now) })
    }
    const interval = window.setInterval(updateClock, 1000)
    return () => window.clearInterval(interval)
  }, [])

  // Hero 컬렉션 CTA → 컬렉션 필터 설정 후 전체상품 페이지로 이동
  const applyCollection = (col) => {
    if (!col) return
    setShopCategory(col.category)
    setShopSub(col.sub)
    setSubFilters(col.subFilters || [])
    navigate('products')
  }
  const goToProducts = (opts = {}) => {
    setDealsOnly(false)
    setShopCategory('전체상품')
    setShopSub('전체')
    if (opts.recommend) setSortBy('recommend')
    navigate('products')
  }
  const goToDeals = () => {
    clearAiSearch()
    setSearch('')
    setSubFilters([])
    setShopCategory('전체상품')
    setShopSub('전체')
    setSortBy('recommend')
    setDealsOnly(true)
    navigate('products')
  }
  const goToCategory = (category) => {
    clearAiSearch()
    setSearch('')
    setSubFilters([])
    setDealsOnly(false)
    setShopCategory(category)
    setShopSub('전체')
    navigate('products')
  }

  return (
    <div className="home-page">
      {/* ── 히어로 ── */}
      <section className="hero">
        {HERO_SLIDES.map((s, i) => (
          <div
            key={s.id}
            className="hero-bg"
            style={{ backgroundImage: `url(${s.image})`, opacity: i === slide ? 1 : 0 }}
          />
        ))}
        <div className="hero-scrim" />
        <div className="hero-inner">
          <div className="hero-copy">
            <span className="hero-eyebrow"><Icon name="leaf" size={14} /> {hero.tag}</span>
            <h1>{hero.title}</h1>
            <p>{hero.desc}</p>
            <div className="hero-cta">
              <button
                className="btn btn-primary btn-lg"
                onClick={() => applyCollection(hero.collection)}
              >
                {hero.btn} <Icon name="arrow-up-right" size={17} />
              </button>
            </div>
            <div className="hero-badge"><Icon name="shield-check" size={15} /> {hero.badge}</div>
          </div>

          <div className="hero-cards">
            {products.slice(1, 3).map((p) => (
              <button key={p.id} type="button" className="hero-card" onClick={() => openProduct(p)}>
                <div className="thumb" style={{ backgroundImage: `url(${p.image})` }} />
                <div className="oc">{p.origin}</div>
                <div className="nm">{p.name}</div>
                <div className="pr">{p.price.toLocaleString('ko-KR')}원</div>
              </button>
            ))}
          </div>
        </div>

        <div className="hero-dots">
          <div className="hero-dots-inner">
            <div className="dots">
              {HERO_SLIDES.map((_, i) => (
                <button key={i} className={i === slide ? 'on' : ''} onClick={() => setSlide(i)} aria-label={`슬라이드 ${i + 1}`} />
              ))}
            </div>
            <div className="hero-arrows">
              <button onClick={() => setSlide((slide - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)} aria-label="이전"><Icon name="chevron-left" size={17} /></button>
              <button onClick={() => setSlide((slide + 1) % HERO_SLIDES.length)} aria-label="다음"><Icon name="chevron-right" size={17} /></button>
            </div>
          </div>
        </div>
      </section>

      <nav className="home-categories" aria-label="상품 카테고리 바로가기">
        <div className="wrap">
          <div className="home-category-head">
            <div>
              <span className="eyebrow">빠른 상품 찾기</span>
              <h2>무엇을 찾고 계세요?</h2>
            </div>
            <button type="button" className="more-link" onClick={() => goToProducts()}>전체 상품 보기 →</button>
          </div>
          <div className="home-category-grid">
            {CATEGORIES.map((category) => {
              const meta = CATEGORY_META[category.name]
              return (
                <button key={category.id} type="button" onClick={() => goToCategory(category.name)}>
                  <span className="home-category-icon"><Icon name={meta.icon} size={20} /></span>
                  <span><strong>{category.name}</strong><small>{meta.description}</small></span>
                  <Icon name="chevron-right" size={15} />
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      {/* ── 오늘의 특가: 실제 할인 상품의 날짜별 큐레이션 ── */}
      <section className="today-deals" aria-labelledby="today-deals-title">
        <div className="wrap">
          <div className="today-deals-head">
            <div>
              <span className="eyebrow">TODAY&apos;S DEAL</span>
              <h2 id="today-deals-title" className="serif">오늘의 특가</h2>
              <div className="deal-countdown" aria-live="off">
                <span>오늘의 특가 갱신까지</span>
                <time>{clock.countdown}</time>
              </div>
            </div>
            <button type="button" className="more-link" onClick={goToDeals}>특가 상품 더보기 →</button>
          </div>
          {productsLoading ? (
            <p className="today-deals-status" aria-live="polite">특가 상품을 불러오고 있습니다.</p>
          ) : dailyDeals.length ? (
            <div className="today-deals-grid">
              {dailyDeals.map((product) => <DealProductCard key={product.id} product={product} />)}
            </div>
          ) : (
            <p className="today-deals-status">현재 판매 중인 할인 상품이 없습니다.</p>
          )}
        </div>
      </section>

      {/* ── 맞춤 추천 상품: 설명 콘텐츠보다 먼저 구매 진입점을 제공 ── */}
      <section className="section home-recommended">
        <div className="wrap">
          <div className="home-section-heading">
            <div className="section-head">
              <span className="eyebrow">맞춤 추천</span>
              <h2 className="serif">{goal}에 맞춘 추천 상품</h2>
              <p>{GOAL_GUIDE[goal]}</p>
            </div>
            <button type="button" className="more-link" onClick={() => goToProducts({ recommend: true })}>
              추천 상품 더보기 <Icon name="chevron-right" size={15} />
            </button>
          </div>
          {productsLoading ? (
            <div className="empty" aria-live="polite"><Icon name="package" size={40} /><h3>추천 상품을 불러오고 있습니다.</h3></div>
          ) : (
            <div className="product-grid">
              {recommended.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </section>

      {isLoggedIn ? (
        /* ── (로그인) 나의 맞춤 쇼핑 기준 — 카드 없이 텍스트 중심 ── */
        <section className="home-personalization home-personalization-member">
          <div className="wrap">
            <div className="home-personalization-row">
              <div>
                <span className="eyebrow">나의 맞춤 쇼핑 기준</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--serif)', fontSize: 25, fontWeight: 500, letterSpacing: '-0.015em', color: 'var(--ink)' }}>
                    {goal}
                  </span>
                  {subFilters.length > 0 && (
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--brand-600)' }}>
                      {subFilters.join(' · ')}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 8 }}>{GOAL_GUIDE[goal]}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                <button
                  onClick={() => navigate('goalSetup')}
                  style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-600)', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}
                >
                  설정 변경 →
                </button>
                <button onClick={logout} style={{ fontSize: 13, fontWeight: 600, color: 'var(--faint)', whiteSpace: 'nowrap' }}>
                  로그아웃
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        /* ── (비로그인) 지금 나에게 맞는 쇼핑 기준 — 텍스트 셀렉터 ── */
        <section className="section home-personalization">
          <div className="wrap">
            <div style={{ marginBottom: 30 }}>
              <span className="eyebrow">맞춤 쇼핑</span>
              <h2 className="serif" style={{ fontSize: 30, marginTop: 10 }}>나에게 맞는 케어</h2>
              <p style={{ color: 'var(--muted)', marginTop: 10, fontSize: 14.5, maxWidth: 560 }}>
                관심있는 케어를 선택해 보세요.
              </p>
            </div>

            <div className="goal-select">
              {!activeGoal ? (
                <div className="gsel-row">
                  {GOALS.map((g, i) => (
                    <button
                      key={g.id}
                      className="gsel"
                      style={{ animationDelay: `${i * 0.06}s` }}
                      onClick={() => { setFocusGoal(g.name); setGoal(g.name) }}
                    >
                      <span className="gsel-en"><Icon name={g.icon} size={14} /> {g.en}</span>
                      <span className="gsel-name">{g.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="gsel-focus" key={focusGoal}>
                  <button className="gsel-current" onClick={() => setFocusGoal(null)} title="다른 목표 보기">
                    <span className="gsel-en"><Icon name={activeGoal.icon} size={14} /> {activeGoal.en}</span>
                    <span className="gsel-name">{activeGoal.name}</span>
                  </button>
                  <div className="gsel-focus-desc">
                    <p className="gsel-desc-text">{activeGoal.desc}</p>
                    <div className="gsel-guide"><Icon name="sparkles" size={14} /> {GOAL_GUIDE[activeGoal.name]}</div>
                    <button className="gsel-back" onClick={() => setFocusGoal(null)}>← 다른 목표 보기</button>
                  </div>
                </div>
              )}
            </div>

            {/* 비로그인 가입 안내 — 카드 없이 배경 위 텍스트 + 얇은 구분선 */}
            <div
              style={{
                marginTop: 44,
                paddingTop: 30,
                borderTop: '1px solid var(--line)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 24,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <span className="eyebrow">회원 맞춤 혜택</span>
                <h3 className="serif" style={{ fontSize: 22, marginTop: 6, color: 'var(--ink)' }}>
                  나만의 맞춤 웰빙 마켓을 완성하세요
                </h3>
                <p style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 6, maxWidth: 540 }}>
                  나에게 맞는 제품을 보여드립니다.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                <button className="btn btn-primary" onClick={() => navigate('register')}>
                  회원가입 <Icon name="arrow-up-right" size={16} />
                </button>
                <button className="btn btn-ghost" onClick={() => navigate('login')}>로그인</button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── 오늘의 웰빙 테이블 (Shoppable image) ── */}
      <WellnessTable />

      {/* ── 가치 배너 (Trust) ── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="values">
            {VALUES.map((v, i) => (
              <div key={i} className="value">
                <div className="v-ico"><Icon name={v.icon} size={19} /></div>
                <div>
                  <h4>{v.title}</h4>
                  <p>{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}
