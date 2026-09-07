import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store'
import { SUB_FILTERS } from '../data/mock'
import { filterAndSort } from '../lib/catalog'
import { AI_SORT_TO_UI, filterAiProducts } from '../lib/ai-search'
import { availableFilterIds } from '../../supabase/functions/_shared/ai-filter-recommendation-contract.js'
import Icon from '../components/Icon'
import ProductCard from '../components/ProductCard'
import ProductComparisonModal from '../components/ProductComparisonModal'

const AI_EXAMPLES = ['카페인 없는 영양제 찾아줘', '당류 낮고 단백질 높은 간식 찾아줘', '저염 식품 찾아줘']

export default function AllProducts() {
  const {
    goal, search, setSearch, sortBy, setSortBy,
    subFilters, toggleSub, setSubFilters, allergies,
    products, productsLoading, productsError, reloadProducts, navigate,
    searchMode, setSearchMode, aiQuery, setAiQuery, aiResult: aiSearch, aiLoading, aiError, runAiSearch, clearAiSearch,
    shopCategory, shopSub, dealsOnly, setDealsOnly,
    showToast, authUserId,
  } = useStore()
  const allergyKey = `${authUserId || 'anonymous'}:${[...allergies].sort().join('|')}`
  const [shownAllergyKey, setShownAllergyKey] = useState(null)
  const hideAllergens = shownAllergyKey !== allergyKey
  const [compareSelection, setCompareSelection] = useState([])
  const compareIds = compareSelection.map(product => product.id)
  const [compareOpen, setCompareOpen] = useState(false)
  const searchCategory = searchMode === 'ai' ? '전체상품' : shopCategory
  const searchSub = searchMode === 'ai' ? '전체' : shopSub
  const availableIds = useMemo(() => availableFilterIds(searchCategory), [searchCategory])
  const availableFilters = useMemo(
    () => availableIds.map(id => SUB_FILTERS.find(filter => filter.id === id)).filter(Boolean),
    [availableIds],
  )
  const availableTags = useMemo(() => availableFilters.map(filter => filter.tag), [availableFilters])
  useEffect(() => {
    setSubFilters((current) => {
      const next = current.filter(tag => availableTags.includes(tag))
      return next.length === current.length ? current : next
    })
  }, [availableTags, setSubFilters])

  const filtered = useMemo(
    () => filterAndSort(products, {
      search: searchMode === 'ai' ? '' : search,
      subFilters, allergies, sortBy, goal,
      shopCategory: searchCategory, shopSub: searchSub,
      dealsOnly: searchMode === 'ai' ? false : dealsOnly,
      hideAllergens,
    }),
    [products, search, searchMode, subFilters, allergies, sortBy, goal, searchCategory, searchSub, dealsOnly, hideAllergens],
  )

  const supplementBrowse = searchMode === 'normal' && shopCategory === '영양제'
  const aiProducts = useMemo(() => {
    if (searchMode !== 'ai') return filtered
    if (aiLoading || aiError || !aiSearch) return []
    const sort = Object.entries(AI_SORT_TO_UI).find(([, ui]) => ui === sortBy)?.[0] || 'relevance'
    return filterAiProducts(filtered, aiSearch.filters, sort)
  }, [aiSearch, filtered, searchMode, aiLoading, aiError, sortBy])

  const title = searchMode === 'ai' ? 'AI 검색 결과' : dealsOnly ? '특가 상품' : `${shopCategory}${shopSub !== '전체' ? ` · ${shopSub}` : ''}`
  const compareProducts = useMemo(
    () => compareSelection.map((selected) => products.find((product) => product.id === selected.id) || selected),
    [compareSelection, products],
  )
  const toggleCompare = (productId) => {
    if (!compareIds.includes(productId) && compareIds.length >= 3) {
      showToast('상품은 최대 3개까지 비교할 수 있습니다. 비교하기에서 상품을 빼주세요.')
      return
    }
    const product = products.find(product => product.id === productId)
    setCompareSelection(current => current.some(item => item.id === productId)
      ? current.filter(item => item.id !== productId)
      : product && current.length < 3 ? [...current, product] : current)
  }
  const openComparison = () => {
    if (!compareProducts.length) return
    setCompareOpen(true)
  }
  const selectMobileSearchMode = (mode) => {
    if (mode === 'normal') {
      clearAiSearch()
      return
    }
    setSearchMode('ai')
    setSearch('')
  }
  const submitMobileSearch = (event) => {
    event.preventDefault()
    if (searchMode === 'ai') {
      if (!aiLoading) void runAiSearch(aiQuery)
      return
    }
    setSearch(search.trim())
  }

  return (
    <div className="wrap page">
      <div id="product-list" className="page-mid" style={{ margin: '0 auto' }}>
        <div className="page-head">
          <div>
            <span className="eyebrow">현재 구매 목적 · {goal}</span>
            <h1 className="page-title" style={{ marginTop: 6 }}>{title}</h1>
          </div>
          <button className="btn btn-text btn-sm" onClick={() => navigate('main')}>← 홈으로</button>
        </div>

        {supplementBrowse && goal !== '영양제 탐색' && <div className="supplement-catalog-guide">
          <p>현재 구매 목적과 연관된 영양제 상품을 먼저 보여드려요.</p>
        </div>}
        <section className="catalog-mobile-search" aria-label="상품 검색">
          <div className="catalog-mobile-search-modes" role="tablist" aria-label="검색 방식">
            <button type="button" role="tab" aria-selected={searchMode === 'normal'} className={searchMode === 'normal' ? 'on' : ''} onClick={() => selectMobileSearchMode('normal')}>일반검색</button>
            <button type="button" role="tab" aria-selected={searchMode === 'ai'} className={searchMode === 'ai' ? 'on' : ''} onClick={() => selectMobileSearchMode('ai')}>자연어 조건 검색</button>
          </div>
          <form className={`catalog-mobile-search-form${searchMode === 'ai' ? ' ai' : ''}`} onSubmit={submitMobileSearch}>
            <Icon name={searchMode === 'ai' ? 'sparkles' : 'search'} size={17} />
            <input
              type="search"
              value={searchMode === 'ai' ? aiQuery : search}
              onChange={(event) => searchMode === 'ai' ? setAiQuery(event.target.value) : setSearch(event.target.value)}
              placeholder={searchMode === 'ai' ? '예: 당류 낮고 단백질 높은 간식' : '상품명 또는 카테고리 검색'}
              aria-label={searchMode === 'ai' ? 'AI 자연어 검색' : '상품명 또는 카테고리 검색'}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={searchMode === 'ai' && aiLoading}>{aiLoading && searchMode === 'ai' ? '검색 중…' : '검색'}</button>
          </form>
        </section>

        {searchMode === 'normal' && search.trim() && !productsLoading && !productsError && (
          <div className="search-result-summary" aria-live="polite">
            <p><strong>‘{search.trim()}’</strong> 검색 결과 <b>{aiProducts.length}개</b></p>
            <button type="button" onClick={() => setSearch('')} aria-label={`${search.trim()} 검색어 제거`}>
              <span>{search.trim()}</span><Icon name="x" size={14} />
            </button>
          </div>
        )}

        {searchMode === 'ai' && !aiSearch && !aiLoading && !aiError && (
          <div className="ai-hint">
            <span className="ai-hint-label"><Icon name="sparkles" size={14} /> 이렇게 검색해보세요</span>
            {AI_EXAMPLES.map((ex) => (
              <button key={ex} type="button" className="chip" onClick={() => runAiSearch(ex)}>{ex}</button>
            ))}
          </div>
        )}

        {searchMode === 'ai' && aiLoading && (
          <div className="ai-result-summary" role="status">
            <div className="ai-result-head"><h3>검색 조건을 정리하고 있어요.</h3></div>
            <p className="ai-result-count">잠시만 기다려 주세요.</p>
          </div>
        )}

        {searchMode === 'ai' && aiError && (
          <div className="ai-result-summary" role="alert">
            <div className="ai-result-head"><h3>AI 검색을 완료하지 못했어요.</h3></div>
            <p className="ai-result-count">{aiError}</p>
            <div className="ai-error-actions">
              <button className="btn btn-soft btn-sm" onClick={() => runAiSearch()}>다시 시도</button>
              <button className="f-reset" onClick={clearAiSearch}>일반 검색으로 전환</button>
            </div>
          </div>
        )}

        {searchMode === 'ai' && aiSearch && (
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
            <p className="ai-fallback">수치 기준은 의료 기준이 아닌 CareMarket 내부 검색 기준입니다.</p>
            {aiSearch.filters.excluded_allergens.length > 0 && <p className="ai-fallback">등록된 성분 정보 기준으로 제외하며, 알레르기 안전을 보장하지 않습니다.</p>}
            {!productsLoading && !productsError && <p className="ai-result-count">조건에 맞는 상품 <b>{aiProducts.length}</b>개를 찾았습니다.</p>}
          </div>
        )}

        <div className="filterbar" style={{ marginBottom: 26 }}>
          <div className="filterbar-main">
            <div className="f-tags">
              <span className="f-label"><Icon name="sliders" size={15} /> 빠른 조건</span>
              {availableFilters.map((f) => (
                <button key={f.id} className={`chip${subFilters.includes(f.tag) ? ' on' : ''}`} onClick={() => toggleSub(f.tag)} title={f.hint}>
                  {subFilters.includes(f.tag) && <Icon name="check" size={13} strokeWidth={2.6} />}
                  {f.label}
                </button>
              ))}
              {subFilters.length > 0 && (
                <button className="f-reset" onClick={() => setSubFilters([])}>초기화</button>
              )}
            </div>
            {allergies.length > 0 && <div className="allergen-filter">
              <label><input type="checkbox" checked={hideAllergens} onChange={event => setShownAllergyKey(event.target.checked ? null : allergyKey)} /> 내 알레르기 성분 포함 상품 숨기기</label>
              <small>설정된 알레르기: {allergies.join(' · ')}</small>
            </div>}
          </div>
          <div className="f-sort">
            <span>총 <b>{aiProducts.length}</b>개</span>
            <span className="divider-v" />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="recommend">{searchMode === 'ai' ? '관련도순' : supplementBrowse ? goal === '영양제 탐색' ? '기본 정렬순' : '목적 연관순' : '맞춤 추천순'}</option>
              <option value="lowPrice">낮은 가격순</option>
              <option value="highPrice">높은 가격순</option>
              {searchMode === 'ai' && <>
                <option value="protein">단백질 높은순</option>
                <option value="sugar">당류 낮은순</option>
                <option value="sodium">나트륨 낮은순</option>
              </>}
            </select>
          </div>
        </div>

        {(compareProducts.length > 0 || (!productsLoading && !productsError && aiProducts.length > 0)) && (
          <div className="compare-toolbar">
            <div><Icon name="cart" size={15} /><span>비교할 상품을 선택하세요</span><b>{compareIds.length}/3</b></div>
            <button type="button" className="btn btn-soft btn-sm" disabled={!compareProducts.length} onClick={openComparison}>비교하기</button>
          </div>
        )}

        {productsLoading ? (
          <div className="empty" aria-live="polite">
            <Icon name="package" size={44} />
            <h3>상품을 불러오고 있습니다.</h3>
            <p>최신 상품과 영양정보를 확인하는 중입니다.</p>
          </div>
        ) : productsError ? (
          <div className="empty" role="alert">
            <Icon name="alert-circle" size={44} />
            <h3>상품을 불러오지 못했습니다.</h3>
            <p>잠시 후 다시 시도해 주세요.</p>
            <button className="btn btn-primary" onClick={reloadProducts}>다시 불러오기</button>
          </div>
        ) : searchMode === 'ai' && (aiLoading || aiError) ? null : aiProducts.length === 0 ? (
          <div className="empty">
            <Icon name="alert-circle" size={44} />
            <h3>선택하신 조건에 맞는 상품이 없습니다.</h3>
            <p>저당·저염·고단백 등 보조 조건을 조정하거나 검색어를 초기화해 보세요.</p>
            <button className="btn btn-primary" onClick={() => { setSubFilters([]); setSearch(''); setDealsOnly(false); clearAiSearch() }}>조건 전체 초기화</button>
          </div>
        ) : (
          <div className="product-grid">
            {aiProducts.map((p) => (
              <ProductCard key={p.id} product={p} compareSelected={compareIds.includes(p.id)} onCompareToggle={toggleCompare} />
            ))}
          </div>
        )}
      </div>
      {compareOpen && <ProductComparisonModal products={compareProducts} goal={goal} onRemove={toggleCompare} onClear={() => setCompareSelection([])} onClose={() => setCompareOpen(false)} />}
    </div>
  )
}
