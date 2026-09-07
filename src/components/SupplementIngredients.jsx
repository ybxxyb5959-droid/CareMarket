import { registeredServing, measuredSupplementIngredients } from '../../supabase/functions/_shared/product-type.js'

export default function SupplementIngredients({ product }) {
  const ingredients = measuredSupplementIngredients(product)
  const cells = items => <div className="nutri-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))' }}>{items.map(item => <div className="nutri-cell" key={item.key}>
    <div className="k">{item.name}</div><div className="v">{item.amount}</div>
  </div>)}</div>
  return <section className="nutri-card" aria-label="주요 성분 함량">
    <div className="nutri-head"><div><h4>주요 성분 함량</h4><div className="serv">등록 섭취 기준 · {registeredServing(product)}</div></div></div>
    {ingredients.length ? cells(ingredients.slice(0, 6)) : <p>등록된 주요 성분 정보가 없습니다.</p>}
    {ingredients.length > 6 && <details><summary>전체 성분 보기</summary>{cells(ingredients.slice(6))}</details>}
  </section>
}
