import { useMemo } from 'react'
import { useStore } from '../store'
import { SUB_FILTERS } from '../data/mock'
import { filterAndSort } from '../lib/catalog'
import { AI_SORT_TO_UI, filterAiProducts } from '../lib/ai-search'
import Icon from '../components/Icon'
import ProductCard from '../components/ProductCard'

const AI_EXAMPLES = ['카페인 없는 영양제 찾아줘', '당류 낮고 단백질 높은 간식 찾아줘', '저염 식품 찾아줘']

export default function AllProducts() {
  const {
    goal, search, setSearch, sortBy, setSortBy,
    subFilters, toggleSub, setSubFilters, allergies,
    products, productsLoading, productsError, reloadProducts, navigate,
    searchMode, aiResult: aiSearch, aiLoading, aiError, runAiSearch, clearAiSearch,
    shopCategory, shopSub,
  } = useStore()

  const filtered = useMemo(
    () => filterAndSort(products, { search: searchMode === 'ai' ? '' : search, subFilters, allergies, sortBy, goal, shopCategory, shopSub }),
    [products, search, searchMode, subFilters, allergies, sortBy, goal, shopCategory, shopSub],
  )

  const aiProducts = useMemo(() => {
    if (searchMode !== 'ai') return filtered
    if (aiLoading || aiError || !aiSearch) return []
    const sort = Object.entries(AI_SORT_TO_UI).find(([, ui]) => ui === sortBy)?.[0] || 'review'
    return filterAiProducts(filtered, aiSearch.filters, sort)
  }, [aiSearch, filtered, searchMode, aiLoading, aiError, sortBy])

  const title = searchMode === 'ai' ? 'AI 검색 결과' : `${shopCategory}${shopSub !== '전체' ? ` · ${shopSub}` : ''}`

  return (
    <div className="wrap page">
      <div id="product-list" className="page-mid" style={{ margin: '0 auto' }}>
        <div className="page-head">
          <div>
            <span className="eyebrow">{goal} 기준 영양 강조</span>
            <h1 className="page-title" style={{ marginTop: 6 }}>{title}</h1>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('main')}>← 홈으로</button>
        </div>

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
            <span className="ai-hint-label"><Icon name="sparkles" size={14} /> AI 자연어 검색 예시</span>
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
              <option value="recommend">{searchMode === 'ai' ? '관련도순' : '맞춤 추천순'}</option>
              <option value="review">리뷰 많은순</option>
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
            <button className="btn btn-primary" onClick={() => { setSubFilters([]); setSearch(''); clearAiSearch() }}>조건 전체 초기화</button>
          </div>
        ) : (
          <div className="product-grid">
            {aiProducts.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  )
}
