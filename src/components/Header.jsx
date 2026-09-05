import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store'
import { CATEGORIES } from '../data/mock'
import Icon from './Icon'
import ProductImage from './ProductImage'
import { won } from '../lib/format'
import { QUERY_MAX_LENGTH } from '../../supabase/functions/_shared/ai-search-contract.js'

const AI_SEARCH_EXAMPLES = [
  '카페인 없는 영양제 찾아줘',
  '당류 낮고 단백질 높은 간식 찾아줘',
  '나트륨 낮은 식품 찾아줘',
]

// 자동완성: 실제 상품 데이터에서 추천 검색어 vocab을 만든다 (하드코딩 배열 아님)
const SUG_SEED = ['프로틴', '간편식', '건강음료', '건강간식', '영양제', '저당', '저염', '고단백', '카페인 제외']
const SUG_STOP = new Set(['오리지널', '프리미엄', '데일리', '스페셜', '에디션', '오늘', '한입', '리얼', '순수', '고소한', '부드러운', '꾸덕한', '생생', '천연', '국산', '유기농', '무첨가', '무가당', '무염', '저온', '저칼로리', '저지방', '로우', '제로', '하이', '베이스', '믹스', '맛'])

function buildVocab(products) {
  const freq = new Map()
  for (const p of products) {
    for (const raw of String(p.name || '').split(/[\s()·&,%/+]+/)) {
      const t = raw.replace(/\d+([.,]\d+)?\s*(g|kg|ml|l|iu|mg|억|종|정|포|캡슐|알|팩|개입|개|x)?$/i, '').trim()
      if (t.length < 2 || SUG_STOP.has(t) || /^\d/.test(t)) continue
      freq.set(t, (freq.get(t) || 0) + 1)
    }
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0])
}

function buildSuggestions(products, vocab, query) {
  const q = query.trim().toLowerCase()
  if (!q) return { terms: [], items: [] }
  const has = (s) => String(s || '').toLowerCase().includes(q)
  const terms = []
  for (const t of [...SUG_SEED, ...vocab]) {
    if (has(t) && !terms.includes(t)) terms.push(t)
    if (terms.length >= 5) break
  }
  const items = products.filter((p) => has(p.name) || has(p.category) || (p.tags || []).some(has)).slice(0, 3)
  return { terms, items }
}

export default function Header() {
  const {
    navigate, search, setSearch,
    searchMode, setSearchMode, aiQuery, setAiQuery, aiLoading, runAiSearch, clearAiSearch,
    shopCategory, setShopCategory, shopSub, setShopSub,
    wishlist, cartCount, setDrawerOpen, showToast, isLoggedIn, requireCartLogin,
    products, openProduct,
  } = useStore()
  const [aiPlaceholder, setAiPlaceholder] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchInput, setSearchInput] = useState(null)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [sugOpen, setSugOpen] = useState(false)
  const [hi, setHi] = useState(-1)
  const searchInputRef = useRef(null)

  const isAi = searchMode === 'ai'
  // 일반 검색: 클릭(focus) 또는 입력 시 왼쪽 돋보기를 숨기고 오른쪽 검색 버튼을 노출
  const searchDraft = searchInput ?? search
  const normalActive = !isAi && (searchFocused || Boolean(searchDraft))

  // 자동완성 (일반 검색 전용, 실제 상품 데이터 기반)
  const vocab = useMemo(() => buildVocab(products), [products])
  const suggestions = useMemo(() => buildSuggestions(products, vocab, searchDraft), [products, vocab, searchDraft])
  const sugCount = suggestions.terms.length + suggestions.items.length
  const sugVisible = !isAi && searchFocused && sugOpen && searchDraft.trim().length >= 1 && sugCount > 0

  // 카테고리/하위 선택 → 필터 적용 후 상품 목록으로 스크롤
  const openCategory = (c, sub) => {
    setShopCategory(c.name)
    setShopSub(sub)
    navigate('products')
  }

  useEffect(() => {
    if (!isAi) return undefined

    let exampleIndex = 0
    let charIndex = 0
    let isDeleting = false
    let timer

    const typeExample = () => {
      const example = AI_SEARCH_EXAMPLES[exampleIndex]
      charIndex += isDeleting ? -1 : 1
      setAiPlaceholder(example.slice(0, charIndex))

      if (!isDeleting && charIndex === example.length) {
        isDeleting = true
        timer = window.setTimeout(typeExample, 1500)
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false
        exampleIndex = (exampleIndex + 1) % AI_SEARCH_EXAMPLES.length
        timer = window.setTimeout(typeExample, 320)
      } else {
        timer = window.setTimeout(typeExample, isDeleting ? 32 : 62)
      }
    }

    typeExample()
    return () => window.clearTimeout(timer)
  }, [isAi])

  const enterAiMode = () => {
    setSearchMode('ai')
    setSearch('')
  }
  const scrollToResults = () => {
    navigate('products')
  }
  const onSearchSubmit = (e) => {
    e.preventDefault()
    if (isAi) {
      if (!aiLoading) void runAiSearch()
      setMobileSearchOpen(false)
      return
    }
    setSearch(searchDraft.trim())
    setSearchInput(null)
    setSugOpen(false)
    setMobileSearchOpen(false)
    scrollToResults()
  }

  const selectTerm = (t) => { setSearchInput(null); setSearch(t); setSugOpen(false); setHi(-1); setMobileSearchOpen(false); scrollToResults() }
  const selectProduct = (p) => { setSugOpen(false); setHi(-1); openProduct(p) }
  const onSearchKeyDown = (e) => {
    if (e.key === 'Escape') { setSugOpen(false); setHi(-1); return }
    if (!sugVisible) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, sugCount - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, -1)) }
    else if (e.key === 'Enter' && hi >= 0) {
      e.preventDefault()
      if (hi < suggestions.terms.length) selectTerm(suggestions.terms[hi])
      else selectProduct(suggestions.items[hi - suggestions.terms.length])
    }
  }

  return (
    <>
      {/* 공지 스트립 */}
      <div className="announce">
        <div className="announce-inner">
          <b>ORGANIC &amp; CLEAN</b>
          <span>자연에서 온 무첨가 웰빙 식단 · 첫 구매 시 웰빙 스타터 30% 바우처 지급</span>
          <span className="link" onClick={() => navigate('goalSetup')}>내 맞춤 루틴 설계 →</span>
        </div>
      </div>

      {/* GNB */}
      <header className="header">
        <div className="wrap">
          <div className="header-main">
            <div className="brand" onClick={() => navigate('main')}>
              <div className="brand-mark"><Icon name="leaf" size={20} /></div>
              <div>
                <div className="brand-name">CareMarket</div>
                <div className="brand-sub">Pure &amp; Clean Food</div>
              </div>
            </div>

            <form className={`search${isAi ? ' ai' : ''}${normalActive ? ' focused' : ''}${mobileSearchOpen ? ' mobile-open' : ''}`} onSubmit={onSearchSubmit}>
              <button
                type="button"
                className="mobile-search-mode"
                onClick={isAi ? clearAiSearch : enterAiMode}
                aria-label={isAi ? '일반 검색으로 전환' : 'AI 검색으로 전환'}
                title={isAi ? '일반 검색' : 'AI 검색'}
              >
                <Icon name={isAi ? 'chevron-left' : 'sparkles'} size={17} />
              </button>
              {(isAi || !normalActive) && (
                <Icon name={isAi ? 'sparkles' : 'search'} size={17} className={`s-ico${isAi ? ' ai' : ''}`} />
              )}
              {isAi ? (
                <input
                  type="text"
                  placeholder={aiPlaceholder}
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  ref={searchInputRef}
                  aria-label="AI 자연어 검색"
                  maxLength={QUERY_MAX_LENGTH}
                  aria-busy={aiLoading}
                />
              ) : (
                <input
                  type="text"
                  placeholder="상품명 또는 카테고리 검색"
                  value={searchDraft}
                  ref={searchInputRef}
                  onChange={(e) => { setSearchInput(e.target.value); setSugOpen(e.target.value.trim().length >= 1); setHi(-1) }}
                  onFocus={() => { setSearchFocused(true); if (searchDraft.trim()) setSugOpen(true) }}
                  onBlur={() => setSearchFocused(false)}
                  onKeyDown={onSearchKeyDown}
                  aria-label="상품명 또는 카테고리 검색"
                  role="combobox"
                  aria-expanded={sugVisible}
                  aria-autocomplete="list"
                />
              )}
              {isAi && (
                <button type="submit" className="s-ai-submit" disabled={aiLoading}
                  title={aiLoading ? '검색 조건 해석 중' : 'AI 검색 실행'} aria-label="AI 검색 실행">
                  <Icon name={aiLoading ? 'clock' : 'search'} size={17} />
                </button>
              )}
              {normalActive && (
                <button type="submit" className="s-ai-submit" title="검색" aria-label="검색"
                  onMouseDown={(e) => e.preventDefault()}>
                  <Icon name="search" size={17} />
                </button>
              )}
              {isAi
                ? aiQuery && (
                    <button type="button" className="s-clear" onClick={() => setAiQuery('')} aria-label="검색어 지우기">
                      <Icon name="x" size={15} />
                    </button>
                  )
                : searchDraft && (
                    <button type="button" className="s-clear" onClick={() => setSearchInput('')} aria-label="검색어 지우기">
                      <Icon name="x" size={15} />
                    </button>
                  )}

              <button type="button" className="mobile-search-close" onClick={() => { setMobileSearchOpen(false); setSugOpen(false) }} aria-label="검색 닫기">
                <Icon name="x" size={19} />
              </button>

              {sugVisible && (
                <div className="search-sug" role="listbox" onMouseDown={(e) => e.preventDefault()}>
                  {suggestions.terms.length > 0 && (
                    <div className="sug-group">
                      <div className="sug-label">추천 검색어</div>
                      {suggestions.terms.map((t, i) => (
                        <button type="button" key={t} className={`sug-term${hi === i ? ' hi' : ''}`}
                          onMouseEnter={() => setHi(i)} onClick={() => selectTerm(t)}>
                          <Icon name="search" size={14} /> <span>{t}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {suggestions.items.length > 0 && (
                    <div className="sug-group">
                      <div className="sug-label">관련 상품</div>
                      {suggestions.items.map((p, i) => {
                        const idx = suggestions.terms.length + i
                        return (
                          <button type="button" key={p.id} className={`sug-prod${hi === idx ? ' hi' : ''}`}
                            onMouseEnter={() => setHi(idx)} onClick={() => selectProduct(p)}>
                            <span className="sug-thumb"><ProductImage src={p.image} alt="" /></span>
                            <span className="sug-pname">{p.name}</span>
                            <span className="sug-pprice">{won(p.price)}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </form>

            {isAi ? (
              <button type="button" className="search-mode-btn on" onClick={clearAiSearch} title="일반 검색으로 전환">
                <Icon name="chevron-left" size={15} /> <span>일반 검색</span>
              </button>
            ) : (
              <button type="button" className="search-mode-btn" onClick={enterAiMode} title="AI 자연어 검색으로 전환">
                <Icon name="sparkles" size={15} /> <span>AI 검색</span>
              </button>
            )}

            <div className="header-actions">
              <button
                type="button"
                className="icon-btn mobile-search-trigger"
                onClick={() => {
                  setMobileSearchOpen(true)
                  window.requestAnimationFrame(() => searchInputRef.current?.focus())
                }}
                aria-label="검색 열기"
              >
                <Icon name="search" size={20} />
              </button>
              {isLoggedIn ? (
                <>
                  <button
                    className="icon-btn"
                    onClick={() => showToast(`위시리스트 ${wishlist.length}개 보관 중`)}
                    aria-label="위시리스트"
                    style={wishlist.length ? { color: 'var(--danger)' } : undefined}
                  >
                    <Icon name="heart" size={20} fill={wishlist.length ? 'currentColor' : 'none'} />
                  </button>
                  <button className="icon-btn" onClick={() => navigate('mypage')} aria-label="마이페이지">
                    <Icon name="user" size={20} />
                  </button>
                </>
              ) : (
                <button className="btn btn-soft btn-sm header-login-btn" onClick={() => navigate('login')}>
                  <Icon name="user" size={15} /> 로그인
                </button>
              )}
              <button className="cart-btn" onClick={() => { if (requireCartLogin()) setDrawerOpen(true) }}>
                <Icon name="cart" size={17} /> 장바구니
                <span className="qty">{cartCount}</span>
              </button>
            </div>
          </div>

          {/* 제품 카테고리 네비게이션 (iHerb 스타일 · 하위는 드롭다운) */}
          <div className="header-nav no-scrollbar">
            <div className="goal-nav">
              {CATEGORIES.map((c) => (
                c.subs ? (
                  <div key={c.id} className="cat-item">
                    <button
                      className={shopCategory === c.name ? 'on' : ''}
                      onClick={() => openCategory(c, '전체')}
                    >
                      {c.name}<Icon name="chevron-down" size={13} />
                    </button>
                    <div className="cat-dropdown">
                      {['전체', ...c.subs.map((s) => s.name)].map((name) => (
                        <button
                          key={name}
                          className={shopCategory === c.name && shopSub === name ? 'on' : ''}
                          onClick={() => openCategory(c, name)}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <button
                    key={c.id}
                    className={shopCategory === c.name ? 'on' : ''}
                    onClick={() => openCategory(c, '전체')}
                  >
                    {c.name}
                  </button>
                )
              ))}
            </div>
            <div className="header-nav-right">
              <span onClick={() => navigate('orders')} style={{ cursor: 'pointer' }}>콜드체인 배송조회</span>
              <span className="divider-v" />
              <span className="safe"><Icon name="shield-check" size={15} /> 안심 클린라벨 100%</span>
            </div>
          </div>
        </div>
      </header>
    </>
  )
}
