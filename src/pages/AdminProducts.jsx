import { useEffect, useMemo, useRef, useState } from 'react'
import AdminGate from '../components/AdminGate'
import ProductImage from '../components/ProductImage'
import Icon from '../components/Icon'
import { useStore } from '../store'
import { won } from '../lib/format'
import { ALLERGEN_OPTIONS, PRODUCT_CATEGORIES, fetchAdminProducts, saveAdminProduct, toAdminProductForm } from '../lib/admin'

const FILTERS = ['전체', '판매중', '비활성', '품절']
const EDITOR_TABS = [
  { id: 'basic', label: '기본 정보' },
  { id: 'sales', label: '판매 · 재고' },
  { id: 'nutrition', label: '영양 정보' },
  { id: 'ingredients', label: '알레르기 · 성분' },
]
const NUTRITION_FIELDS = [
  { field: 'calories', label: '칼로리', unit: 'kcal' },
  { field: 'protein', label: '단백질', unit: 'g' },
  { field: 'carbs', label: '탄수화물', unit: 'g' },
  { field: 'fat', label: '지방', unit: 'g' },
  { field: 'sugar', label: '당류', unit: 'g' },
  { field: 'sodium', label: '나트륨', unit: 'mg' },
]

const snapshotForm = (form) => JSON.stringify(form)

function AdminProductPreview({ form, isNew }) {
  const price = Number(form.price)
  const originalPrice = Number(form.original_price)
  const hasPrice = form.price !== '' && Number.isFinite(price)
  const hasOriginalPrice = form.original_price !== '' && Number.isFinite(originalPrice) && originalPrice > 0
  const discount = hasPrice && hasOriginalPrice && originalPrice > price
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : null
  const status = !form.is_active ? '비활성' : form.stock !== '' && Number(form.stock) === 0 ? '품절' : '판매중'

  return (
    <aside className="admin-editor-preview" aria-label="상품 미리보기">
      <div className="admin-preview-heading">
        <span>LIVE PREVIEW</span>
        <b>상품 미리보기</b>
      </div>
      <div className="admin-preview-card">
        <div className="admin-preview-media">
          {form.image_url
            ? <ProductImage key={form.image_url} src={form.image_url} alt="" />
            : <div className="admin-preview-placeholder"><Icon name="package" size={44} /><span>기본 이미지</span></div>}
          {!isNew && <span className={`admin-preview-status${form.is_active ? '' : ' inactive'}`}>{status}</span>}
        </div>
        <div className="admin-preview-copy">
          <span className="admin-preview-brand">{form.brand.trim() || '브랜드명'}</span>
          <h3>{form.name.trim() || '상품명을 입력해 주세요'}</h3>
          <p>{form.summary.trim() || '입력한 상품 설명이 이곳에 표시됩니다.'}</p>
          <div className="admin-preview-price">
            {hasOriginalPrice && <del>{won(originalPrice)}</del>}
            <div>{discount !== null && <em>{discount}%</em>}<strong>{hasPrice ? won(price) : '판매가 미입력'}</strong></div>
          </div>
          <dl className="admin-preview-meta">
            <div><dt>카테고리</dt><dd>{form.category}</dd></div>
            <div><dt>재고</dt><dd>{form.stock === '' ? '미입력' : `${form.stock}개`}</dd></div>
          </dl>
        </div>
      </div>
      <p className="admin-preview-note">관리자 확인용 미리보기이며 실제 스토어 카드에는 기존 표시 규칙이 적용됩니다.</p>
    </aside>
  )
}

function AdminProductEditor({ product, onCancel, onSaved }) {
  const initialForm = useMemo(() => toAdminProductForm(product), [product])
  const [form, setForm] = useState(initialForm)
  const [activeTab, setActiveTab] = useState('basic')
  const [saving, setSaving] = useState(false)
  const [closing, setClosing] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const closeTimer = useRef(null)
  const modalRef = useRef(null)
  const contentRef = useRef(null)
  const nameInputRef = useRef(null)
  const discardButtonRef = useRef(null)
  const closeIntentFocusRef = useRef(null)
  const [initialSnapshot, setInitialSnapshot] = useState(() => snapshotForm(initialForm))
  const { showToast } = useStore()
  const dirty = snapshotForm(form) !== initialSnapshot

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusFrame = window.requestAnimationFrame(() => nameInputRef.current?.focus())
    return () => {
      document.body.style.overflow = previousOverflow
      window.cancelAnimationFrame(focusFrame)
      window.clearTimeout(closeTimer.current)
    }
  }, [])

  useEffect(() => {
    if (confirmClose) discardButtonRef.current?.focus()
    else if (closeIntentFocusRef.current) {
      const focusTarget = closeIntentFocusRef.current
      closeIntentFocusRef.current = null
      window.requestAnimationFrame(() => (focusTarget.isConnected ? focusTarget : nameInputRef.current)?.focus())
    }
  }, [confirmClose])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (confirmClose) setConfirmClose(false)
        else if (!saving && !closing) {
          if (dirty) {
            closeIntentFocusRef.current = document.activeElement
            setConfirmClose(true)
          }
          else {
            setClosing(true)
            closeTimer.current = window.setTimeout(onCancel, 180)
          }
        }
        return
      }
      if (event.key !== 'Tab') return
      const focusRoot = confirmClose
        ? modalRef.current?.querySelector('.admin-unsaved-dialog')
        : modalRef.current
      const focusable = [...(focusRoot?.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])') || [])]
        .filter((element) => element.offsetParent !== null)
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [closing, confirmClose, dirty, onCancel, saving])

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }))
  const closeEditor = () => {
    if (closing || saving) return
    setClosing(true)
    closeTimer.current = window.setTimeout(onCancel, 180)
  }
  const requestClose = () => {
    if (closing || saving) return
    if (dirty) {
      closeIntentFocusRef.current = document.activeElement
      setConfirmClose(true)
      return
    }
    closeEditor()
  }
  const selectTab = (tabId) => {
    setActiveTab(tabId)
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
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
      await onSaved(saved)
      setInitialSnapshot(snapshotForm(form))
      setClosing(true)
      closeTimer.current = window.setTimeout(onCancel, 180)
    } catch (error) {
      console.error('Admin product save failed:', error)
      showToast(error.message || '상품을 저장하지 못했습니다.')
    } finally { setSaving(false) }
  }

  const editorTitle = product ? `상품 수정 #${product.product_id}` : '신규 상품 등록'
  const price = Number(form.price)
  const originalPrice = Number(form.original_price)
  const discount = form.price !== '' && form.original_price !== '' && Number.isFinite(price) && Number.isFinite(originalPrice) && originalPrice > price && originalPrice > 0
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : null

  return <>
    <button type="button" className={`admin-product-editor-backdrop${closing ? ' closing' : ''}`} onClick={requestClose} aria-label="상품 편집 닫기" />
    <section ref={modalRef} className={`admin-product-editor-shell${closing ? ' closing' : ''}`} role="dialog" aria-modal="true" aria-labelledby="admin-product-editor-title">
      <div className="admin-product-editor-head">
        <div>
          <span>{product ? 'PRODUCT EDIT' : 'NEW PRODUCT'}</span>
          <h2 id="admin-product-editor-title"><Icon name={product ? 'sliders' : 'plus'} size={19} />{editorTitle}</h2>
        </div>
        <button type="button" className="icon-btn" onClick={requestClose} aria-label="닫기"><Icon name="x" size={20} /></button>
      </div>

      <nav className="admin-editor-tabs" aria-label="상품 편집 항목" role="tablist">
        {EDITOR_TABS.map((tab) => <button type="button" role="tab" aria-selected={activeTab === tab.id} aria-controls={`admin-editor-panel-${tab.id}`} className={activeTab === tab.id ? 'active' : ''} key={tab.id} onClick={() => selectTab(tab.id)}>{tab.label}</button>)}
      </nav>

      <form className="admin-product-editor-form" onSubmit={submit} noValidate>
        <div ref={contentRef} className="admin-product-editor-body">
          <div className="admin-editor-layout">
            <div className="admin-editor-fields">
              {activeTab === 'basic' && <section id="admin-editor-panel-basic" className="admin-tab-panel" role="tabpanel">
                <div className="admin-tab-intro"><h3>기본 정보</h3><p>고객에게 가장 먼저 보이는 상품 정보를 입력합니다.</p></div>
                <div className="admin-editor-grid">
                  <label className="admin-field admin-field-wide"><span>상품명</span><input ref={nameInputRef} value={form.name} onChange={(event) => setField('name', event.target.value)} placeholder="상품명을 입력하세요" /></label>
                  <label className="admin-field"><span>브랜드</span><input value={form.brand} onChange={(event) => setField('brand', event.target.value)} placeholder="브랜드명" /></label>
                  <label className="admin-field"><span>카테고리</span><select value={form.category} onChange={(event) => setField('category', event.target.value)}>{PRODUCT_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
                  <label className="admin-field admin-field-wide"><span>이미지 URL</span><input type="url" value={form.image_url} onChange={(event) => setField('image_url', event.target.value)} placeholder="https://example.com/product.jpg" /></label>
                  <label className="admin-field admin-field-wide"><span>상품 설명</span><textarea rows="6" value={form.summary} onChange={(event) => setField('summary', event.target.value)} placeholder="상품의 특징과 고객에게 필요한 정보를 입력하세요" /></label>
                </div>
              </section>}

              {activeTab === 'sales' && <section id="admin-editor-panel-sales" className="admin-tab-panel" role="tabpanel">
                <div className="admin-tab-intro"><h3>판매 · 재고</h3><p>가격과 재고, 스토어 노출 상태를 관리합니다.</p></div>
                <div className="admin-editor-grid admin-sales-grid">
                  <label className="admin-field"><span>판매가</span><div className="admin-input-unit"><input type="number" min="0" value={form.price} onChange={(event) => setField('price', event.target.value)} inputMode="numeric" /><i>원</i></div></label>
                  <label className="admin-field"><span>정상가</span><div className="admin-input-unit"><input type="number" min="0" value={form.original_price} onChange={(event) => setField('original_price', event.target.value)} inputMode="numeric" /><i>원</i></div></label>
                  {discount !== null && <div className="admin-discount-callout"><span>현재 할인율</span><strong>{discount}%</strong><small>정상가와 판매가 기준</small></div>}
                  <label className="admin-field"><span>재고</span><div className="admin-input-unit"><input type="number" min="0" value={form.stock} onChange={(event) => setField('stock', event.target.value)} inputMode="numeric" /><i>개</i></div></label>
                  <label className="admin-toggle"><input type="checkbox" checked={form.is_active} onChange={(event) => setField('is_active', event.target.checked)} /><span>판매 상태</span><b>{form.is_active ? '판매중' : '비활성'}</b></label>
                </div>
              </section>}

              {activeTab === 'nutrition' && <section id="admin-editor-panel-nutrition" className="admin-tab-panel" role="tabpanel">
                <div className="admin-tab-intro"><h3>영양 정보</h3><p>1회 제공량을 기준으로 각 영양성분을 입력합니다.</p></div>
                <div className="admin-editor-grid admin-nutrition-grid">
                  <label className="admin-field admin-field-wide"><span>1회 제공량</span><input value={form.serving_size} onChange={(event) => setField('serving_size', event.target.value)} placeholder="예: 1팩 (200g)" /></label>
                  {NUTRITION_FIELDS.map(({ field, label, unit }) => <label className="admin-field" key={field}><span>{label}</span><div className="admin-input-unit"><input type="number" min="0" step="any" inputMode="decimal" value={form[field]} onChange={(event) => setField(field, event.target.value)} /><i>{unit}</i></div></label>)}
                </div>
              </section>}

              {activeTab === 'ingredients' && <section id="admin-editor-panel-ingredients" className="admin-tab-panel" role="tabpanel">
                <div className="admin-tab-intro"><h3>알레르기 · 성분</h3><p>원재료와 알레르기 유발 성분을 기존 데이터 기준으로 관리합니다.</p></div>
                <div className="admin-editor-grid">
                  <label className="admin-field admin-field-wide"><span>주요 원재료 (쉼표로 구분)</span><textarea rows="4" value={form.main_ingredients} onChange={(event) => setField('main_ingredients', event.target.value)} placeholder="예: 닭가슴살, 현미, 귀리" /></label>
                  <label className="admin-check admin-caffeine-check"><input type="checkbox" checked={form.contains_caffeine} onChange={(event) => setField('contains_caffeine', event.target.checked)} /><span>카페인 포함</span></label>
                  <div className="admin-field admin-field-wide admin-allergen-field">
                    <span>알레르기 유발 성분</span>
                    <div className="admin-check-list">{ALLERGEN_OPTIONS.map((allergen) => <label className={`admin-allergen-chip${form.allergens.includes(allergen) ? ' selected' : ''}`} key={allergen}><input type="checkbox" checked={form.allergens.includes(allergen)} onChange={() => toggleAllergen(allergen)} /><span>{allergen}</span></label>)}</div>
                  </div>
                </div>
              </section>}
            </div>
            <AdminProductPreview form={form} isNew={!product} />
          </div>
        </div>

        <div className="admin-actions">
          <span className={`admin-save-state${dirty ? ' changed' : ''}`}>{dirty ? '저장하지 않은 변경사항이 있습니다.' : '현재 저장된 상태입니다.'}</span>
          <button type="button" className="btn btn-ghost" onClick={requestClose} disabled={saving}>취소</button>
          <button className="btn btn-primary" disabled={saving}>{saving ? '저장 중...' : '변경사항 저장'}</button>
        </div>
      </form>

      {confirmClose && <div className="admin-unsaved-layer">
        <div className="admin-unsaved-dialog" role="alertdialog" aria-modal="true" aria-labelledby="admin-unsaved-title" aria-describedby="admin-unsaved-description">
          <span className="admin-unsaved-icon"><Icon name="alert-circle" size={22} /></span>
          <h3 id="admin-unsaved-title">저장하지 않은 변경사항이 있습니다.</h3>
          <p id="admin-unsaved-description">편집을 종료하면 입력한 내용이 사라집니다.</p>
          <div>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmClose(false)}>계속 편집</button>
            <button ref={discardButtonRef} type="button" className="btn admin-discard-button" onClick={closeEditor}>변경사항 버리기</button>
          </div>
        </div>
      </div>}
    </section>
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
        <button className="btn btn-primary admin-new-product" onClick={() => setEditorProduct(null)}><Icon name="plus" size={17} />신규 상품 등록</button>
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
