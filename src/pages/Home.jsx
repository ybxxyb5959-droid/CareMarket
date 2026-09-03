import { useMemo, useState } from 'react'
import { useStore, useAutoSlide } from '../store'
import { GOALS, HERO_SLIDES, ROUTINE, SUB_FILTERS, VALUES, PRODUCTS } from '../data/mock'
import Icon from '../components/Icon'
import ProductCard from '../components/ProductCard'

function filterAndSort(products, { search, subFilters, allergies, sortBy, goal }) {
  let list = products.filter((p) => {
    if (search) {
      const q = search.toLowerCase()
      if (!p.name.toLowerCase().includes(q) && !p.brand.toLowerCase().includes(q) && !p.category.toLowerCase().includes(q)) return false
    }
    for (const tag of subFilters) {
      if (tag === '고단백' && p.nutrition.protein < 15) return false
      if (tag === '저당' && p.nutrition.sugar > 5) return false
      if (tag === '저염' && p.nutrition.sodium > 250) return false
      if (tag === '카페인 제외' && p.caffeine) return false
      if (tag === '알레르기 제외' && allergies.some((a) => p.allergens.includes(a))) return false
    }
    return true
  })
  if (sortBy === 'lowPrice') list = [...list].sort((a, b) => a.price - b.price)
  else if (sortBy === 'highPrice') list = [...list].sort((a, b) => b.price - a.price)
  else if (sortBy === 'review') list = [...list].sort((a, b) => b.reviewCount - a.reviewCount)
  else list = [...list].sort((a, b) => (b.category === goal) - (a.category === goal))
  return list
}

const AI_EXAMPLES = ['카페인 없는 영양제 찾아줘', '당류 낮고 단백질 높은 간식 찾아줘', '저염 식품 찾아줘']

// 주목표별 강조 안내문
const GOAL_GUIDE = {
  '근육량 증가': '순수 단백질 함량을 우선 표시합니다.',
  '체중 관리': '열량과 당류 정보를 우선 표시합니다.',
  '식단 영양 관리': '나트륨과 당류 정보를 우선 표시합니다.',
  '영양제 탐색': '핵심 기능성분 함량을 우선 표시합니다.',
}

export default function Home() {
  const {
    goal, setGoal, search, setSearch, sortBy, setSortBy,
    subFilters, toggleSub, setSubFilters, allergies,
    products, openProduct, navigate, showToast,
    searchMode, aiResult: aiSearch, runAiSearch, clearAiSearch,
    isLoggedIn, logout,
  } = useStore()

  const [slide, setSlide] = useAutoSlide(HERO_SLIDES.length)
  const [routineIdx, setRoutineIdx] = useState(1)
  const [focusGoal, setFocusGoal] = useState(null) // 비로그인 목표 셀렉터: 포커스된 목표
  const hero = HERO_SLIDES[slide]
  const activeGoal = GOALS.find((g) => g.name === focusGoal)

  const filtered = useMemo(
    () => filterAndSort(products, { search, subFilters, allergies, sortBy, goal }),
    [products, search, subFilters, allergies, sortBy, goal],
  )

  const routine = ROUTINE[routineIdx]
  const aiProducts = useMemo(
    () => (aiSearch ? filtered.filter(aiSearch.matches) : filtered),
    [aiSearch, filtered],
  )

  return (
    <div>
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
                onClick={() => { setGoal(hero.goal); showToast(`'${hero.goal}' 컬렉션으로 전환했습니다.`) }}
              >
                {hero.btn} <Icon name="arrow-up-right" size={17} />
              </button>
              <button className="btn btn-ghost btn-lg" onClick={() => navigate('goalSetup')}>
                내 체질 조건 맞추기
              </button>
            </div>
            <div className="hero-badge"><Icon name="shield-check" size={15} /> {hero.badge}</div>
          </div>

          <div className="hero-cards">
            {PRODUCTS.slice(1, 3).map((p) => (
              <div key={p.id} className="hero-card" onClick={() => openProduct(p)}>
                <div className="thumb" style={{ backgroundImage: `url(${p.image})` }} />
                <div className="oc">{p.origin}</div>
                <div className="nm">{p.name}</div>
                <div className="pr">{p.price.toLocaleString('ko-KR')}원</div>
              </div>
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

      {isLoggedIn ? (
        /* ── (로그인) 나의 맞춤 쇼핑 기준 — 카드 없이 텍스트 중심 ── */
        <section style={{ borderBottom: '1px solid var(--line)' }}>
          <div className="wrap" style={{ paddingBlock: 30 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
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
        /* ── (비로그인) 당신의 몸이 지금 필요로 하는 처방 — 텍스트 셀렉터 ── */
        <section className="section">
          <div className="wrap">
            <div style={{ marginBottom: 30 }}>
              <span className="eyebrow">Personalized Wellness</span>
              <h2 className="serif" style={{ fontSize: 30, marginTop: 10 }}>당신의 몸이 지금 필요로 하는 처방</h2>
              <p style={{ color: 'var(--muted)', marginTop: 10, fontSize: 14.5, maxWidth: 560 }}>
                관심 있는 목표를 선택하면, 나머지는 접히고 그 목표에 맞춰 강조되는 영양 정보를 안내해 드립니다.
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
                <span className="eyebrow">Start your routine</span>
                <h3 className="serif" style={{ fontSize: 22, marginTop: 6, color: 'var(--ink)' }}>
                  가입하고 나만의 맞춤 웰빙 마켓을 완성하세요
                </h3>
                <p style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 6, maxWidth: 540 }}>
                  선택한 목표와 보조 조건을 저장해 두면, 방문할 때마다 나에게 맞는 영양 정보를 우선으로 보여드립니다.
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

      {/* ── 웰빙 루틴 플래너 (중앙부 강조) ── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="routine">
            <div className="routine-head">
              <div>
                <span className="eyebrow"><Icon name="calendar" size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 5 }} />Well-being Daily Routine</span>
                <h3>하루를 온전하게 채우는 시간대별 웰빙 식단</h3>
              </div>
              <span className="by"><Icon name="award" size={16} style={{ color: 'var(--brand-500)' }} /> 영양사 &amp; 자연식품 큐레이터 추천</span>
            </div>
            <div className="routine-body">
              <div className="routine-tabs no-scrollbar">
                {ROUTINE.map((r, i) => (
                  <button key={i} className={`routine-tab${i === routineIdx ? ' on' : ''}`} onClick={() => setRoutineIdx(i)}>
                    <div className="r-ico"><Icon name={r.icon} size={19} /></div>
                    <div>
                      <div className="r-time">{r.time}</div>
                      <div className="r-title">{r.title}</div>
                      <div className="r-tag">{r.tag}</div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="routine-detail">
                <span className="rd-time"><Icon name={routine.icon} size={14} /> {routine.time} · {routine.tag}</span>
                <h4>{routine.title}</h4>
                <p>{routine.desc}</p>
                <div className="routine-rec">
                  <div>
                    <div className="rr-label">추천 식품</div>
                    <div className="rr-name">{routine.product}</div>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      const m = PRODUCTS.find((p) => routine.product.includes(p.name.split(' (')[0].slice(0, 8)))
                      if (m) openProduct(m); else navigate('main')
                    }}
                  >
                    자세히 보기 <Icon name="chevron-right" size={15} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 가치 배너 ── */}
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

      {/* ── 필터 & 상품 목록 ── */}
      <section className="section" style={{ paddingTop: 0, paddingBottom: 64 }}>
        <div className="wrap">
          <div className="section-head" style={{ textAlign: 'left', maxWidth: 'none', marginBottom: 20 }}>
            <span className="eyebrow">Curated for you · {goal}</span>
            <h2 className="serif" style={{ fontSize: 26 }}>{goal} 맞춤 셀렉션</h2>
          </div>

          {searchMode === 'ai' && !aiSearch && (
            <div className="ai-hint">
              <span className="ai-hint-label"><Icon name="sparkles" size={14} /> AI 자연어 검색 예시</span>
              {AI_EXAMPLES.map((ex) => (
                <button key={ex} type="button" className="chip" onClick={() => runAiSearch(ex)}>{ex}</button>
              ))}
            </div>
          )}

          {aiSearch && (
            <div className="ai-result-summary">
              <div className="ai-result-head">
                <div>
                  <span className="eyebrow">AI Search Result</span>
                  <h3>AI가 이해한 검색 조건</h3>
                </div>
                <button type="button" className="f-reset" onClick={clearAiSearch}>전체 상품 보기</button>
              </div>
              <p className="ai-query">“{aiSearch.query}”</p>
              <div className="ai-condition-tags">
                {aiSearch.conditions.map((condition) => <span key={condition}>{condition}</span>)}
              </div>
              {aiSearch.message && <p className="ai-fallback">{aiSearch.message}</p>}
              <p className="ai-result-count">조건에 맞는 상품 <b>{aiProducts.length}</b>개를 찾았습니다.</p>
            </div>
          )}

          <div className="filterbar" style={{ marginBottom: 26 }}>
            <div className="f-tags">
              <span className="f-label"><Icon name="sliders" size={15} /> 보조 조건</span>
              {SUB_FILTERS.map((f) => (
                <button key={f.id} className={`chip${subFilters.includes(f.tag) ? ' on' : ''}`} onClick={() => toggleSub(f.tag)} title={f.hint}>
                  {subFilters.includes(f.tag) && <Icon name="check" size={13} strokeWidth={2.6} />}
                  {f.label}
                </button>
              ))}
              {subFilters.length > 0 && (
                <button className="f-reset" onClick={() => setSubFilters([])}>초기화</button>
              )}
            </div>
            <div className="f-sort">
              <span>총 <b>{aiProducts.length}</b>개</span>
              <span className="divider-v" />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="recommend">맞춤 추천순</option>
                <option value="review">리뷰 많은순</option>
                <option value="lowPrice">낮은 가격순</option>
                <option value="highPrice">높은 가격순</option>
              </select>
            </div>
          </div>

          {aiProducts.length === 0 ? (
            <div className="empty">
              <Icon name="alert-circle" size={44} />
              <h3>선택하신 조건에 맞는 상품이 없습니다.</h3>
              <p>저당·저염·고단백 등 보조 조건을 조정하거나 검색어를 초기화해 보세요.</p>
              <button className="btn btn-primary" onClick={() => { setSubFilters([]); setSearch(''); clearAiSearch() }}>조건 전체 초기화</button>
            </div>
          ) : (
            <div className="product-grid">
              {aiProducts.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
