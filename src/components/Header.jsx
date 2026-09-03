import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { GOALS } from '../data/mock'
import Icon from './Icon'

const AI_SEARCH_EXAMPLES = [
  '카페인 없는 영양제 찾아줘',
  '당류 낮고 단백질 높은 간식 찾아줘',
  '나트륨 낮은 식품 찾아줘',
]

export default function Header() {
  const {
    view, navigate, setView, search, setSearch,
    searchMode, setSearchMode, aiQuery, setAiQuery, runAiSearch, clearAiSearch,
    goal, setGoal, wishlist, cartCount, setDrawerOpen, showToast,
  } = useStore()
  const [aiPlaceholder, setAiPlaceholder] = useState('')

  const isAi = searchMode === 'ai'

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
    if (view !== 'main') navigate('main')
  }
  const onSearchSubmit = (e) => {
    e.preventDefault()
    if (isAi) runAiSearch()
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

            <form className={`search${isAi ? ' ai' : ''}`} onSubmit={onSearchSubmit}>
              <Icon name={isAi ? 'sparkles' : 'search'} size={17} className={`s-ico${isAi ? ' ai' : ''}`} />
              {isAi ? (
                <input
                  type="text"
                  placeholder={aiPlaceholder}
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  onFocus={() => view !== 'main' && setView('main')}
                  aria-label="AI 자연어 검색"
                />
              ) : (
                <input
                  type="text"
                  placeholder="상품명 또는 카테고리 검색"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => view !== 'main' && setView('main')}
                  aria-label="상품명 또는 카테고리 검색"
                />
              )}
              {isAi
                ? aiQuery && (
                    <button type="button" className="s-clear" onClick={() => setAiQuery('')} aria-label="검색어 지우기">
                      <Icon name="x" size={15} />
                    </button>
                  )
                : search && (
                    <button type="button" className="s-clear" onClick={() => setSearch('')} aria-label="검색어 지우기">
                      <Icon name="x" size={15} />
                    </button>
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
              <button className="cart-btn" onClick={() => setDrawerOpen(true)}>
                <Icon name="cart" size={17} /> 장바구니
                <span className="qty">{cartCount}</span>
              </button>
            </div>
          </div>

          {/* 목표 서브 네비게이션 */}
          <div className="header-nav no-scrollbar">
            <div className="goal-nav">
              {GOALS.map((g) => (
                <button
                  key={g.id}
                  className={goal === g.name ? 'on' : ''}
                  onClick={() => { setGoal(g.name); navigate('main') }}
                >
                  <Icon name={g.icon} size={15} /> {g.name}
                </button>
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
