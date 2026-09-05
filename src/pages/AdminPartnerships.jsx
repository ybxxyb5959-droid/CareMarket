import { useEffect, useMemo, useRef, useState } from 'react'
import AdminGate from '../components/AdminGate'
import Icon from '../components/Icon'
import { fetchAdminPartnerships, updateAdminPartnership } from '../lib/admin'
import { PARTNERSHIP_PROPOSAL_TYPES, PARTNERSHIP_STATUS_LABELS } from '../lib/partnerships'
import { useStore } from '../store'

const STATUS_FILTERS = ['all', 'new', 'reviewing', 'approved', 'rejected']
const formatDate = (value, withTime = false) => new Intl.DateTimeFormat('ko-KR', withTime
  ? { dateStyle: 'long', timeStyle: 'short' }
  : { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value))

function safeWebsite(value) {
  if (!value) return null
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

function DetailItem({ label, children }) {
  return <div><dt>{label}</dt><dd>{children || '—'}</dd></div>
}

function PartnershipDetail({ inquiry, authUserId, onClose, onSaved }) {
  const { showToast } = useStore()
  const [status, setStatus] = useState(inquiry.status)
  const [adminNote, setAdminNote] = useState(inquiry.admin_note || '')
  const [saving, setSaving] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const closeButtonRef = useRef(null)
  const website = safeWebsite(inquiry.website)
  const dirty = status !== inquiry.status || adminNote !== (inquiry.admin_note || '')
  const dirtyRef = useRef(dirty)
  const savingRef = useRef(saving)
  const onCloseRef = useRef(onClose)
  dirtyRef.current = dirty
  savingRef.current = saving
  onCloseRef.current = onClose

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !savingRef.current) {
        if (dirtyRef.current) setConfirmClose(true)
        else onCloseRef.current()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  const requestClose = () => {
    if (saving) return
    if (dirty) setConfirmClose(true)
    else onClose()
  }

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(inquiry.email)
      showToast('이메일 주소를 복사했습니다.')
    } catch {
      showToast('이메일 주소를 복사하지 못했습니다.')
    }
  }

  const save = async (event) => {
    event.preventDefault()
    if (saving || !dirty) return
    setSaving(true)
    try {
      const updated = await updateAdminPartnership(inquiry.id, { status, adminNote, reviewedBy: authUserId })
      onSaved(updated)
      showToast('협업 제안 처리 내용을 저장했습니다.')
    } catch (caught) {
      console.error('Admin partnership update failed:', caught)
      showToast(caught.message || '협업 제안 처리 내용을 저장하지 못했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return <>
    <button type="button" className="admin-product-editor-backdrop" onClick={requestClose} aria-label="협업 제안 상세 닫기" />
    <section className="admin-product-editor-shell admin-partnership-detail" role="dialog" aria-modal="true" aria-labelledby="admin-partnership-detail-title">
      <div className="admin-product-editor-head">
        <div><span>PARTNERSHIP DETAIL</span><h2 id="admin-partnership-detail-title"><Icon name="leaf" size={19} />{inquiry.brand_name}</h2></div>
        <button ref={closeButtonRef} type="button" className="icon-btn" onClick={requestClose} disabled={saving} aria-label="닫기"><Icon name="x" size={20} /></button>
      </div>
      <form className="admin-product-editor-form" onSubmit={save}>
        <div className="admin-product-editor-body">
          <div className="admin-partnership-detail-grid">
            <div className="admin-partnership-copy">
              <section><h3>브랜드 정보</h3><dl className="admin-partnership-dl">
                <DetailItem label="브랜드명">{inquiry.brand_name}</DetailItem>
                <DetailItem label="담당자명">{inquiry.contact_name}</DetailItem>
                <DetailItem label="이메일"><span className="admin-partnership-inline">{inquiry.email}<button type="button" onClick={() => void copyEmail()}>복사</button></span></DetailItem>
                <DetailItem label="연락처">{inquiry.phone}</DetailItem>
                <DetailItem label="홈페이지 / SNS">{website ? <a href={website} target="_blank" rel="noreferrer">새 탭에서 열기 <Icon name="arrow-up-right" size={13} /></a> : inquiry.website}</DetailItem>
              </dl></section>
              <section><h3>제안 정보</h3><dl className="admin-partnership-dl">
                <DetailItem label="제안 유형">{inquiry.proposal_type}</DetailItem>
                <DetailItem label="상품 카테고리">{inquiry.product_category}</DetailItem>
                <DetailItem label="대표 제품">{inquiry.product_name}</DetailItem>
              </dl></section>
              <section><h3>브랜드 소개</h3><p>{inquiry.brand_description}</p></section>
              <section><h3>제휴 희망 이유</h3><p>{inquiry.partnership_reason || '작성되지 않았습니다.'}</p></section>
            </div>

            <aside className="admin-partnership-operations">
              <section><h3>접수 정보</h3><dl className="admin-partnership-dl compact">
                <DetailItem label="접수일시">{formatDate(inquiry.created_at, true)}</DetailItem>
                <DetailItem label="현재 상태"><span className={`admin-partnership-status ${inquiry.status}`}>{PARTNERSHIP_STATUS_LABELS[inquiry.status]}</span></DetailItem>
              </dl></section>
              <label className="admin-field"><span>상태</span><select value={status} onChange={(event) => setStatus(event.target.value)}>{Object.entries(PARTNERSHIP_STATUS_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
              <label className="admin-field"><span>관리자 메모</span><textarea rows="9" maxLength={4000} value={adminNote} onChange={(event) => setAdminNote(event.target.value)} placeholder="담당 MD 확인 필요&#10;원재료 인증 자료 요청 예정" /><small>{adminNote.length.toLocaleString()} / 4,000</small></label>
            </aside>
          </div>
        </div>
        <div className="admin-actions">
          <span className={`admin-save-state${dirty ? ' changed' : ''}`}>{dirty ? '저장하지 않은 변경사항이 있습니다.' : '현재 저장된 상태입니다.'}</span>
          <button type="button" className="btn btn-ghost" onClick={requestClose} disabled={saving}>닫기</button>
          <button className="btn btn-primary" disabled={saving || !dirty}>{saving ? '저장 중...' : '변경사항 저장'}</button>
        </div>
      </form>
      {confirmClose && <div className="admin-unsaved-layer"><div className="admin-unsaved-dialog" role="alertdialog" aria-modal="true" aria-labelledby="admin-partnership-unsaved-title"><span className="admin-unsaved-icon"><Icon name="alert-circle" size={22} /></span><h3 id="admin-partnership-unsaved-title">저장하지 않은 변경사항이 있습니다.</h3><p>상세 화면을 닫으면 입력한 처리 내용이 사라집니다.</p><div><button type="button" className="btn btn-ghost" onClick={() => setConfirmClose(false)}>계속 편집</button><button type="button" className="btn admin-discard-button" onClick={onClose}>변경사항 버리기</button></div></div></div>}
    </section>
  </>
}

function AdminPartnershipsContent() {
  const { authUserId } = useStore()
  const [inquiries, setInquiries] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      setInquiries(await fetchAdminPartnerships())
    } catch (caught) {
      console.error('Admin partnerships fetch failed:', caught)
      setError(caught.message || '협업 제안 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    fetchAdminPartnerships()
      .then((rows) => { if (active) setInquiries(rows) })
      .catch((caught) => {
        if (!active) return
        console.error('Admin partnerships fetch failed:', caught)
        setError(caught.message || '협업 제안 목록을 불러오지 못했습니다.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const summary = useMemo(() => inquiries.reduce((counts, inquiry) => {
    counts.total += 1
    counts[inquiry.status] += 1
    return counts
  }, { total: 0, new: 0, reviewing: 0, approved: 0, rejected: 0 }), [inquiries])

  const visibleInquiries = useMemo(() => inquiries.filter((inquiry) => {
    const needle = query.trim().toLowerCase()
    const matchesQuery = !needle || `${inquiry.brand_name} ${inquiry.contact_name} ${inquiry.email}`.toLowerCase().includes(needle)
    return matchesQuery
      && (statusFilter === 'all' || inquiry.status === statusFilter)
      && (typeFilter === 'all' || inquiry.proposal_type === typeFilter)
  }), [inquiries, query, statusFilter, typeFilter])

  const saved = (updated) => {
    setInquiries((current) => current.map((item) => item.id === updated.id ? updated : item))
    setSelected(updated)
  }

  return <>
    <div className="wrap page admin-partnerships-page">
      <div className="admin-head admin-orders-head"><span className="kicker">ADMIN CONSOLE</span><h1>협업 제안</h1><p>CareMarket에 접수된 브랜드 입점 및 협업 제안을 확인하고 처리합니다.</p></div>
      <dl className="admin-order-summary" aria-label="협업 제안 상태 요약">{[
        ['전체 제안', summary.total], ['신규', summary.new], ['검토중', summary.reviewing], ['승인', summary.approved], ['거절', summary.rejected],
      ].map(([label, count]) => <div key={label}><dt>{label}</dt><dd>{count}<small>건</small></dd></div>)}</dl>

      <div className="admin-toolbar admin-partnership-toolbar">
        <div className="admin-filters">{STATUS_FILTERS.map((status) => <button className={statusFilter === status ? 'on' : ''} key={status} onClick={() => setStatusFilter(status)}>{status === 'all' ? '전체' : PARTNERSHIP_STATUS_LABELS[status]}</button>)}</div>
        <div className="admin-partnership-tools"><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="제안 유형 필터"><option value="all">모든 제안 유형</option>{PARTNERSHIP_PROPOSAL_TYPES.map((type) => <option key={type}>{type}</option>)}</select><input className="admin-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="브랜드명, 담당자명 또는 이메일 검색" aria-label="협업 제안 검색" /></div>
      </div>

      {loading ? <div className="empty"><p>협업 제안을 불러오는 중입니다.</p></div> : error ? <div className="empty"><h3>협업 제안을 불러오지 못했습니다.</h3><p>{error}</p><button className="btn btn-primary btn-sm" onClick={() => void load()}>다시 시도</button></div> : visibleInquiries.length === 0 ? <div className="empty"><h3>조건에 맞는 협업 제안이 없습니다.</h3></div> : <div className="table-wrap admin-partnership-table-wrap"><table className="admin-partnership-table"><thead><tr><th>브랜드</th><th>제안 유형</th><th>상품 카테고리</th><th>담당자</th><th>접수일</th><th>상태</th><th>관리</th></tr></thead><tbody>{visibleInquiries.map((inquiry) => <tr key={inquiry.id}><td><div className="td-name">{inquiry.brand_name}</div><div className="admin-product-brand">{inquiry.email}</div></td><td>{inquiry.proposal_type}</td><td>{inquiry.product_category}</td><td>{inquiry.contact_name}</td><td className="admin-date">{formatDate(inquiry.created_at)}</td><td><span className={`admin-partnership-status ${inquiry.status}`}>{PARTNERSHIP_STATUS_LABELS[inquiry.status]}</span></td><td><button className="admin-product-action edit" onClick={() => setSelected(inquiry)}>보기</button></td></tr>)}</tbody></table></div>}
    </div>
    {selected && <PartnershipDetail inquiry={selected} authUserId={authUserId} onClose={() => setSelected(null)} onSaved={saved} />}
  </>
}

export default function AdminPartnerships() { return <AdminGate><AdminPartnershipsContent /></AdminGate> }
