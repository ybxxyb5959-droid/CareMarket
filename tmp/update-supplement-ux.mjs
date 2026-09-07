import fs from 'node:fs'
const edit = (path, fn) => { const original = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n'); fs.writeFileSync(path, fn(original)) }
const replace = (s, a, b) => { if (!s.includes(a)) throw new Error('Missing: '+a); return s.replace(a,b) }
edit('src/StoreProvider.jsx', s => {
  s = replace(s, '  const cart = useMemo(() => {', '  // Demo items stay in memory and never reach cart/order RPCs.\n  const [demoCart, setDemoCart] = useState([])\n  useEffect(() => { setDemoCart([]) }, [authUserId])\n  const cart = useMemo(() => {')
  s = replace(s, '    }))\n  }, [authUserId, cartState.ownerId, cartState.rows])', '    })).concat(demoCart)\n  }, [authUserId, cartState.ownerId, cartState.rows, demoCart])')
  s = replace(s, '  const toggleWish = async (id) => {', "  const toggleWish = async (id) => {\n    if (products.find(product => product.id === id)?.isDemoProduct) { showToast('시연용 상품은 찜 저장을 지원하지 않습니다.'); return false }")
  s = replace(s, '    const saved = await cartController.add(product.id, count)', `    if (product.isDemoProduct) {
      setDemoCart(current => current.some(item => item.product.id === product.id)
        ? current.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + count } : item)
        : [...current, { product, quantity: count }])
      showToast('시연용 장바구니에 담았어요.')
      return true
    }
    const saved = await cartController.add(product.id, count)`)
  s = replace(s, '    ? cartController.changeQuantity(id, delta) : Promise.resolve(false)', `    ? demoCart.some(item => item.product.id === id)
      ? (setDemoCart(current => current.map(item => item.product.id === id ? { ...item, quantity: Math.max(1, Math.min(item.product.stock, item.quantity + delta)) } : item)), Promise.resolve(true))
      : cartController.changeQuantity(id, delta) : Promise.resolve(false)`)
  s = replace(s, '  const removeFromCart = async (id) => {', '  const removeFromCart = async (id) => {\n    if (demoCart.some(item => item.product.id === id)) { setDemoCart(current => current.filter(item => item.product.id !== id)); return true }')
  s = replace(s, '  const checkout = () => {', "  const checkout = () => {\n    if (cart.some(item => item.product.isDemoProduct)) { showToast('시연용 상품을 제외하면 실제 주문을 진행할 수 있습니다.'); return }")
  return s
})
edit('src/components/CartAiInsight.jsx', s => s.replace('const response = await requestCartSummary(requestedSignature)', 'const response = analysisCart.some(item => item.product.isDemoProduct) ? localFallback : await requestCartSummary(requestedSignature)'))
edit('src/pages/AllProducts.jsx', s => {
  s = "import { isSupplement, supplementIngredients } from '../../supabase/functions/_shared/product-type.js'\n" + s
  s = s.replace('  const aiProducts = useMemo', `  const [ingredientFilter, setIngredientFilter] = useState('전체')
  const supplementBrowse = searchMode === 'normal' && shopCategory === '영양제'
  const ingredientType = product => {
    const names = supplementIngredients(product).map(item => item.name).join(' ')
    return /크레아틴/.test(names) ? '크레아틴' : /EPA|DHA|오메가/.test(names) ? '오메가3' : /비타민|마그네슘|아연|미네랄/.test(names) ? '비타민·미네랄' : '기타'
  }
  const ingredientTypes = ['전체', ...new Set(products.filter(isSupplement).map(ingredientType))]
  useEffect(() => { setIngredientFilter('전체') }, [goal, shopCategory, shopSub])
  const aiProducts = useMemo`)
  s = s.replace("if (searchMode !== 'ai') return filtered", "if (searchMode !== 'ai') return supplementBrowse && goal === '영양제 탐색' && ingredientFilter !== '전체' ? filtered.filter(product => ingredientType(product) === ingredientFilter) : filtered")
  s = s.replace('[aiSearch, filtered, searchMode, aiLoading, aiError, sortBy])', '[aiSearch, filtered, searchMode, aiLoading, aiError, sortBy, supplementBrowse, goal, ingredientFilter])')
  s = s.replace('{goal} 기준 영양 강조', '현재 구매 목적 · {goal}')
  s = s.replace('        <section className="catalog-mobile-search"', `        {supplementBrowse && <div className="supplement-catalog-guide">
          <p>{goal === '영양제 탐색' ? '영양제 탐색 목적에서는 특정 상품을 우선하기보다 주요 성분과 함량을 기준으로 상품을 비교할 수 있습니다.' : '현재 구매 목적과 연관된 영양제 상품을 먼저 보여드려요.'}</p>
          {goal === '영양제 탐색' && <div className="f-tags" aria-label="주요 성분 종류">{ingredientTypes.map(type => <button type="button" key={type} className={\`chip\${ingredientFilter === type ? ' on' : ''}\`} aria-pressed={ingredientFilter === type} onClick={() => setIngredientFilter(type)}>{type}</button>)}</div>}
        </div>}
        <section className="catalog-mobile-search"`)
  return s.replace("searchMode === 'ai' ? '관련도순' : '맞춤 추천순'", "searchMode === 'ai' ? '관련도순' : supplementBrowse ? goal === '영양제 탐색' ? '기본 정렬순' : '목적 연관순' : '맞춤 추천순'")
})
edit('src/pages/Home.jsx', s => s.replace('{goal}에 맞춘 추천 상품', "{goal === '영양제 탐색' ? '주요 성분으로 살펴보는 영양제' : `${goal}에 맞춘 추천 상품`}").replace('{GOAL_GUIDE[goal]}', "{goal === '영양제 탐색' ? '특정 상품을 우선하기보다 주요 성분과 함량을 기준으로 상품을 비교할 수 있습니다.' : GOAL_GUIDE[goal]}").replace('추천 상품 더보기 <Icon', "{goal === '영양제 탐색' ? '영양제 전체 보기' : '추천 상품 더보기'} <Icon"))
edit('src/index.css', s => s + `
/* Supplement content only: retain existing page widths and breakpoints. */
.supplement-catalog-guide { margin-bottom: 20px; color: var(--green-deep, #244a3a); }
.supplement-notice { position: relative; margin: 16px 0; color: #244a3a; }
.supplement-info { display: inline; margin-left: 6px; }
.supplement-info button { border: 0; background: transparent; color: inherit; cursor: pointer; padding: 6px; }
.supplement-tooltip { position: absolute; z-index: 5; right: 0; bottom: 100%; width: min(320px, 100%); box-sizing: border-box; padding: 12px 14px; border: 1px solid #dce3db; border-radius: 10px; background: #fffefa; color: #244a3a; font-size: 13px; line-height: 1.65; }
.supplement-detail-actions { display: flex; flex-wrap: wrap; gap: 8px; }
`)
fs.mkdirSync('public/assets/demo', {recursive:true})
for (const [id,label,color] of [[900001,'CREATINE','#305c4e'],[900002,'CATECHIN','#638150'],[900003,'BANABA','#83724d']]) {
  fs.writeFileSync(`public/assets/demo/supplement-${id}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><rect width="600" height="600" fill="#f4f2eb"/><ellipse cx="300" cy="506" rx="143" ry="18" fill="#e5e6dc"/><rect x="185" y="116" width="230" height="56" rx="14" fill="${color}"/><rect x="171" y="164" width="258" height="339" rx="37" fill="#fffefa" stroke="#d7dbd0" stroke-width="2"/><rect x="171" y="249" width="258" height="170" fill="${color}"/><g fill="#fffefa" text-anchor="middle" font-family="Arial,sans-serif"><text x="300" y="289" font-size="18" letter-spacing="3">CARE LABS</text><text x="300" y="341" font-size="30">${label}</text><text x="300" y="385" font-size="12" letter-spacing="2">DEMO CATALOG</text></g><text x="300" y="466" text-anchor="middle" fill="${color}" font-family="Arial" font-size="13">CareMarket portfolio sample</text></svg>`)
}
