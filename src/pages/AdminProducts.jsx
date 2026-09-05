import { useEffect, useMemo, useRef, useState } from 'react'
import AdminGate from '../components/AdminGate'
import ProductImage from '../components/ProductImage'
import Icon from '../components/Icon'
import { useStore } from '../store'
import { won } from '../lib/format'
import { ALLERGEN_OPTIONS, PRODUCT_CATEGORIES, fetchAdminProducts, saveAdminProduct, toAdminProductForm } from '../lib/admin'

const FILTERS = ['전체', '판매중', '비활성', '품절']
const NUTRITION_LABELS = { calories: '칼로리', protein: '단백질', carbs: '탄수화물', fat: '지방', sugar: '당류', sodium: '나트륨' }

function AdminProductEditor({ product, onCancel, onSaved }) {
  const [form, setForm] = useState(() => toAdminProductForm(product))
  const [saving, setSaving] = useState(false)
  const [closing, setClosing] = useState(false)
  const closeTimer = useRef(null)
  const { showToast } = useStore()

  useEffect(() => setForm(toAdminProductForm(product)), [product])
  useEffect(() => () => window.clearTimeout(closeTimer.current), [])
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }))
  const requestClose = () => {
    if (closing) return
    setClosing(true)
    closeTimer.current = window.setTimeout(onCancel, 220)
  }
  const toggleAllergen = (allergen) => setForm((current) => ({
    ...current,
    allergens: current.allergens.includes(allergen)
      ? current.allergens.filter((item) => item !== allergen)
      : [...current.allergens, allergen],
  }))
  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const saved = await saveAdminProduct(form, product?.product_id)
      showToast(product ? '상품 정보가 저장되었습니다.' : '새 상품이 등록되었습니다.')
      void onSaved(saved)
      requestClose()
    } catch (error) {
      console.error('Admin product save failed:', error)
      showToast(error.message || '상품을 저장하지 못했습니다.')
    } finally { setSaving(false) }
  }

  const editorTitle = product ? `#${product.product_id} 상품 수정` : '새 상품 등록'

  return <>
    <button type="button" className={`admin-product-editor-backdrop${closing ? ' closing' : ''}`} onClick={requestClose} aria-label="상품 편집 닫기" />
    <aside className={`admin-product-editor-shell${closing ? ' closing' : ''}`} role="dialog" aria-modal="true" aria-labelledby="admin-product-editor-title">
      <div className="admin-product-editor-head">
        <div>
          <span>{product ? 'PRODUCT EDIT' : 'NEW PRODUCT'}</span>
          <h2 id="admin-product-editor-title"><Icon name={product ? 'sliders' : 'plus'} size={19} />{editorTitle}</h2>
        </div>
        <button type="button" className="icon-btn" onClick={requestClose} aria-label="닫기"><Icon name="x" size={20} /></button>
      </div>

      <form className="admin-product-editor-form" onSubmit={submit}>
        <div className="admin-product-editor-body">
          <fieldset className="admin-form-section">
            <legend>기본 정보</legend>
            <div className="admin-editor-grid">
              <label className="admin-field admin-field-wide"><span>상품명</span><input value={form.name} onChange={(event) => setField('name', event.target.value)} required /></label>
              <label className="admin-field"><span>브랜드</span><input value={form.brand} onChange={(event) => setField('brand', event.target.value)} required /></label>
              <label className="admin-field"><span>카테고리</span><select value={form.category} onChange={(event) => setField('category', event.target.value)}>{PRODUCT_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
              <label className="admin-field admin-field-wide"><span>이미지 URL</span><input type="url" value={form.image_url} onChange={(event) => setField('image_url', event.target.value)} required /></label>
              <label className="admin-field admin-field-wide"><span>상품 설명</span><textarea rows="4" value={form.summary} onChange={(event) => setField('summary', event.target.value)} /></label>
            </div>
          </fieldset>

          <fieldset className="admin-form-section">
            <legend>판매 · 재고</legend>
            <div className="admin-editor-grid">
              <label className="admin-field"><span>판매가</span><input type="number" min="0" value={form.price} onChange={(event) => setField('price', event.target.value)} required /></label>
              <label className="admin-field"><span>정상가</span><input type="number" min="0" value={form.original_price} onChange={(event) => setField('original_price', event.target.value)} /></label>
              <label className="admin-field"><span>재고</span><input type="number" min="0" value={form.stock} onChange={(event) => setField('stock', event.target.value)} required /></label>
              <label className="admin-toggle"><input type="checkbox" checked={form.is_active} onChange={(event) => setField('is_active', event.target.checked)} /><span>판매 상태</span><b>{form.is_active ? '판매중' : '비활성'}</b></label>
            </div>
          </fieldset>

          <fieldset className="admin-form-section">
            <legend>영양 · 알레르기</legend>
            <div className="admin-editor-grid">
              <label className="admin-field admin-field-wide"><span>1회 제공량</span><input value={form.serving_size} onChange={(event) => setField('serving_size', event.target.value)} /></label>
              {Object.entries(NUTRITION_LABELS).map(([field, label]) => <label className="admin-field" key={field}><span>{label}</span><input type="number" min="0" step="any" value={form[field]} onChange={(event) => setField(field, event.target.value)} required /></label>)}
              <label className="admin-field admin-field-wide"><span>주요 원재료 (쉼표로 구분)</span><input value={form.main_ingredients} onChange={(event) => setField('main_ingredients', event.target.value)} /></label>
              <label className="admin-check admin-caffeine-check"><input type="checkbox" checked={form.contains_caffeine} onChange={(event) => setField('contains_caffeine', event.target.checked)} /><span>카페인 포함</span></label>
              <div className="admin-field admin-field-wide admin-allergen-field">
                <span>알레르기</span>
                <div className="admin-check-list">{ALLERGEN_OPTIONS.map((allergen) => <label className={`admin-allergen-chip${form.allergens.includes(allergen) ? ' selected' : ''}`} key={allergen}><input type="checkbox" checked={form.allergens.includes(allergen)} onChange={() => toggleAllergen(allergen)} /><span>{allergen}</span></label>)}</div>
              </div>
            </div>
          </fieldset>
        </div>

        <div className="admin-actions">
          <button type="button" className="btn btn-ghost" onClick={requestClose}>취소</button>
          <button className="btn btn-primary" disabled={saving}>{saving ? '저장 중...' : '변경사항 저장'}</button>
        </div>
      </form>
    </aside>
  </>
}

function AdminProductsContent() {
  const { showToast, reloadProducts } = useStore()
  const [products, setProducts] = useState([])
  const [filter, setFilter] = useState('전체')
  const [query, setQuery] = useState('')
  const [editorProduct, setEditorProduct] = useState(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const load = async () => { setLoading(true); setError(null); try { setProducts(await fetchAdminProducts()) } catch (caught) { console.error('Admin products fetch failed:', caught); setError(caught.message || '상품 목록을 불러오지 못했습니다.') } finally { setLoading(false) } }
  useEffect(() => { void load() }, [])
  const visibleProducts = useMemo(() => products.filter((product) => {
    const matchesFilter = filter === '전체' || (filter === '판매중' && product.is_active && product.stock > 0) || (filter === '비활성' && !product.is_active) || (filter === '품절' && product.is_active && product.stock === 0)
    const needle = query.trim().toLowerCase()
    return matchesFilter && (!needle || `${product.name} ${product.brand}`.toLowerCase().includes(needle))
  }), [products, filter, query])
  const saveDone = async () => { await load(); reloadProducts() }
  const toggleActive = async (product) => {
    try { await saveAdminProduct({ ...toAdminProductForm(product), is_active: !product.is_active }, product.product_id); showToast(product.is_active ? '상품을 판매중지했습니다.' : '상품 판매를 재개했습니다.'); await load(); reloadProducts() } catch (caught) { console.error('Admin product activation update failed:', caught); showToast(caught.message || '판매 상태를 변경하지 못했습니다.') }
  }

  return <>
    <div className="wrap page admin-products-page">
      <div className="page-head admin-products-page-head">
        <div className="admin-head"><span className="kicker">ADMIN CONSOLE</span><h1>웰빙 식품 데이터베이스 관리</h1><p>판매 상태와 영양 정보를 실제 상품 데이터에서 관리합니다.</p></div>
        <button className="btn btn-primary admin-new-product" onClick={() => setEditorProduct(null)}><Icon name="plus" size={17} />신규 식품 등록</button>
      </div>
      <div className="admin-toolbar admin-products-toolbar">
        <div className="admin-filters">{FILTERS.map((item) => <button className={filter === item ? 'on' : ''} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div>
        <input className="admin-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="상품명 또는 브랜드 검색" aria-label="상품명 또는 브랜드 검색" />
      </div>
      {loading ? <div className="empty"><p>상품 데이터를 불러오는 중입니다.</p></div> : error ? <div className="empty"><h3>상품을 불러오지 못했습니다.</h3><p>{error}</p><button className="btn btn-primary btn-sm" onClick={() => void load()}>다시 시도</button></div> : visibleProducts.length === 0 ? <div className="empty"><h3>조건에 맞는 상품이 없습니다.</h3></div> : <div className="table-wrap admin-products-table-wrap">
        <table className="admin-products-table">
          <thead><tr><th>ID</th><th>상품</th><th>카테고리</th><th>판매가</th><th>재고</th><th>상태</th><th>관리</th></tr></thead>
          <tbody>{visibleProducts.map((product) => {
            const status = !product.is_active ? 'inactive' : product.stock === 0 ? 'soldout' : 'active'
            return <tr key={product.product_id}>
              <td className="td-mono">#{product.product_id}</td>
              <td><div className="admin-table-product"><ProductImage className="admin-product-thumb" src={product.image_url} alt="" /><div className="admin-product-identity"><div className="td-name">{product.name}</div><div className="admin-product-brand">{product.brand}</div></div></div></td>
              <td><span className="admin-product-category">{product.category}</span></td>
              <td className="admin-number">{won(product.price)}</td>
              <td className="admin-number">{product.stock}</td>
              <td><span className={`admin-product-status ${status}`}>{status === 'active' ? '판매중' : status === 'soldout' ? '품절' : '비활성'}</span></td>
              <td><div className="admin-row-actions"><button className="admin-product-action edit" onClick={() => setEditorProduct(product)}>수정</button><button className={`admin-product-action ${product.is_active ? 'danger' : 'resume'}`} onClick={() => void toggleActive(product)}>{product.is_active ? '판매중지' : '판매재개'}</button></div></td>
            </tr>
          })}</tbody>
        </table>
      </div>}
    </div>
    {editorProduct !== undefined && <AdminProductEditor product={editorProduct} onCancel={() => setEditorProduct(undefined)} onSaved={saveDone} />}
  </>
}

export default function AdminProducts() { return <AdminGate><AdminProductsContent /></AdminGate> }
