import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { supabase } from '../lib/supabase'
import { adaptProductRow } from '../lib/products'
import ProductCard from '../components/ProductCard'

export default function ProductCollection() {
  const { view } = useStore()
  const [state, setState] = useState({ loading: true, products: [], error: false })
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    const query = view === 'best' ? supabase.rpc('get_best_products')
      : supabase.from('products').select('*').eq('is_active', true).order('created_at', { ascending: false }).order('product_id').limit(100)
    Promise.resolve(query).then(({ data, error }) => {
      if (active) setState({ loading: false, products: error ? [] : (data || []).map(adaptProductRow), error: Boolean(error) })
    }).catch(() => { if (active) setState({ loading: false, products: [], error: true }) })
    return () => { active = false }
  }, [view, retry])
  const best = view === 'best'
  return <div className="wrap page"><div className="page-mid">
    <div className="page-head"><div><h1 className="page-title">{best ? '베스트' : '신상품'}</h1>
      <p>{best ? '결제가 완료된 주문의 판매 수량을 기준으로 만나보세요.' : '최근 등록된 상품부터 만나보세요.'}</p></div></div>
    {state.loading ? <p role="status">상품을 불러오고 있습니다.</p> : state.error ? <div className="empty" role="alert"><p>상품을 불러오지 못했어요.</p><button className="btn btn-soft" onClick={() => { setState({ loading: true, products: [], error: false }); setRetry(n => n + 1) }}>다시 시도</button></div>
      : state.products.length ? <div className="product-grid">{state.products.map(p => <ProductCard key={p.id} product={p} />)}</div>
        : <div className="empty"><h3>{best ? '아직 판매 집계된 상품이 없어요.' : '등록된 상품이 없어요.'}</h3></div>}
  </div></div>
}
