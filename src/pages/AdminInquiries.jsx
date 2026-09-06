import { useEffect, useMemo, useRef, useState } from 'react'
import AdminGate from '../components/AdminGate'
import Icon from '../components/Icon'
import { answerAdminCustomerInquiry, fetchAdminCustomerInquiries } from '../lib/admin'
import { inquiryStatusLabel, isAnsweredInquiry, validateAdminInquiryAnswer } from '../lib/support'
import { useStore } from '../store'

const FILTERS = [
  { value: 'all', label: '전체' },
  { value: 'waiting', label: '답변 대기' },
  { value: 'answered', label: '답변 완료' },
]
const formatDate = (value, withTime = false) => new Intl.DateTimeFormat('ko-KR', withTime
  ? { dateStyle: 'long', timeStyle: 'short' }
  : { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value))

function StatusBadge({ status }) {
  return <span className={`admin-inquiry-status ${isAnsweredInquiry(status) ? 'answered' : 'waiting'}`}>{inquiryStatusLabel(status)}</span>
}

function DetailItem({ label, children, wide = false }) {
  return <div className={wide ? 'wide' : ''}><dt>{label}</dt><dd>{children || '—'}</dd></div>
}

function InquiryDetail({ inquiry, onClose, onAnswered }) {
  const { showToast } = useStore()
  const [answer, setAnswer] = useState(inquiry.admin_answer || '')
  const [answerError, setAnswerError] = useState('')
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const closeButtonRef = useRef(null)
  const answered = isAnsweredInquiry(inquiry)
  const orderNumber = inquiry.orders?.toss_order_id || inquiry.order_id

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !savingRef.current) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const submit = async (event) => {
    event.preventDefault()
    if (savingRef.current || answered) return
    const nextError = validateAdminInquiryAnswer(answer)
    setAnswerError(nextError)
    if (nextError) return

    savingRef.current = true
    setSaving(true)
    try {
      const updated = await answerAdminCustomerInquiry(inquiry.id, answer)
      onAnswered({ ...inquiry, ...updated, orders: inquiry.orders })
      showToast('답변이 등록되었습니다.')
    } catch (caught) {
      console.error('Admin customer inquiry answer failed:', { code: caught?.code || 'ADMIN_INQUIRY_ANSWER_FAILED' })
      showToast(caught.message || '답변을 등록하지 못했습니다.')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  return <>
    <button type="button" className="admin-product-editor-backdrop" onClick={() => !saving && onClose()} aria-label="1:1 문의 상세 닫기" />
    <section className="admin-product-editor-shell admin-inquiry-detail" role="dialog" aria-modal="true" aria-labelledby="admin-inquiry-detail-title">
      <div className="admin-product-editor-head"><div><span>INQUIRY DETAIL</span><h2 id="admin-inquiry-detail-title"><Icon name="message-circle" size={19} />1:1 문의 상세</h2></div><button ref={closeButtonRef} type="button" className="icon-btn" onClick={onClose} disabled={saving} aria-label="닫기"><Icon name="x" size={20} /></button></div>
      <form className="admin-product-editor-form" onSubmit={submit}>
        <div className="admin-product-editor-body">
          <div className="admin-inquiry-detail-grid">
            <div className="admin-inquiry-copy">
              <section><h3>문의 정보</h3><dl className="admin-partnership-dl">
                <DetailItem label="문의 유형">{inquiry.category}</DetailItem>
                <DetailItem label="제목">{inquiry.title}</DetailItem>
                <DetailItem label="접수일">{formatDate(inquiry.created_at, true)}</DetailItem>
                <DetailItem label="현재 상태"><StatusBadge status={inquiry.status} /></DetailItem>
              </dl></section>
              <section><h3>고객 정보</h3><dl className="admin-partnership-dl"><DetailItem label="이메일">{inquiry.contact_email}</DetailItem></dl></section>
              <section><h3>연결 주문</h3><p className="admin-inquiry-order">{orderNumber || '연결된 주문 없음'}</p></section>
              <section><h3>문의 내용</h3><p>{inquiry.content}</p></section>
            </div>
            <aside className="admin-partnership-operations admin-inquiry-answer-panel">
              <section><h3>관리자 답변</h3>{answered && <p className="admin-inquiry-answered-at">답변일 {formatDate(inquiry.answered_at, true)}</p>}</section>
              <label className="admin-field"><span>답변 내용</span><textarea rows="12" maxLength={4000} value={answer} readOnly={answered} onChange={(event) => { setAnswer(event.target.value); setAnswerError('') }} placeholder="고객에게 전달할 답변을 입력해 주세요." aria-invalid={Boolean(answerError)} aria-describedby={answerError ? 'admin-inquiry-answer-error' : undefined} />
                <small>{answer.length.toLocaleString()} / 4,000</small>{answerError && <em id="admin-inquiry-answer-error" className="admin-inquiry-answer-error" role="alert">{answerError}</em>}
              </label>
            </aside>
          </div>
        </div>
        <div className="admin-actions"><span className="admin-save-state">{answered ? '등록된 답변입니다.' : '답변 등록 후에는 수정할 수 없습니다.'}</span><button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>닫기</button>{!answered && <button className="btn btn-primary" disabled={saving}>{saving ? '답변 등록 중...' : '답변 등록'}</button>}</div>
      </form>
    </section>
  </>
}

function AdminInquiriesContent() {
  const [inquiries, setInquiries] = useState([])
  const [filter, setFilter] = useState('all')
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(false)
    try {
      setInquiries(await fetchAdminCustomerInquiries())
    } catch (caught) {
      console.error('Admin customer inquiries fetch failed:', { code: caught?.code || 'ADMIN_INQUIRIES_FETCH_FAILED' })
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    fetchAdminCustomerInquiries()
      .then((rows) => { if (active) setInquiries(rows) })
      .catch((caught) => {
        if (!active) return
        console.error('Admin customer inquiries fetch failed:', { code: caught?.code || 'ADMIN_INQUIRIES_FETCH_FAILED' })
        setError(true)
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const summary = useMemo(() => inquiries.reduce((counts, inquiry) => {
    counts.total += 1
    counts[isAnsweredInquiry(inquiry) ? 'answered' : 'waiting'] += 1
    return counts
  }, { total: 0, waiting: 0, answered: 0 }), [inquiries])
  const visibleInquiries = inquiries.filter((inquiry) => filter === 'all' || (filter === 'answered') === isAnsweredInquiry(inquiry))
  const selected = inquiries.find((inquiry) => inquiry.id === selectedId)

  const answered = (updated) => {
    setInquiries((current) => current.map((item) => item.id === updated.id ? updated : item))
  }

  return <>
    <div className="wrap page admin-partnerships-page admin-inquiries-page">
      <div className="admin-head admin-orders-head"><h1>1:1 문의 관리</h1><p>고객 문의 및 답변</p></div>
      <dl className="admin-order-summary admin-inquiry-summary" aria-label="1:1 문의 상태 요약">
        <div><dt>전체</dt><dd>{summary.total}<small>건</small></dd></div>
        <div className={summary.waiting ? 'needs-review' : ''}><dt>답변 대기</dt><dd>{summary.waiting}<small>건</small></dd></div>
        <div><dt>답변 완료</dt><dd>{summary.answered}<small>건</small></dd></div>
      </dl>
      <div className="admin-toolbar"><div className="admin-filters">{FILTERS.map((item) => <button className={filter === item.value ? 'on' : ''} key={item.value} onClick={() => setFilter(item.value)}>{item.label}</button>)}</div></div>
      {loading ? <div className="empty" role="status"><p>문의 목록을 불러오는 중입니다.</p></div> : error ? <div className="empty" role="alert"><h3>문의 목록을 불러오지 못했습니다.</h3><button className="btn btn-primary btn-sm" onClick={() => void load()}>다시 시도</button></div> : visibleInquiries.length === 0 ? <div className="empty"><h3>{inquiries.length === 0 ? '접수된 1:1 문의가 없습니다.' : '현재 조건에 해당하는 문의가 없습니다.'}</h3></div> : <div className="table-wrap admin-inquiry-table-wrap"><table role="table" className="admin-mobile-cards admin-inquiry-table"><thead><tr><th>문의 유형</th><th>제목</th><th>고객 이메일</th><th>주문번호</th><th>접수일</th><th>상태</th><th>관리</th></tr></thead><tbody>{visibleInquiries.map((inquiry) => <tr key={inquiry.id}><td data-label="문의 유형"><span className="td-cat">{inquiry.category}</span></td><td data-label="제목"><div className="td-name">{inquiry.title}</div></td><td data-label="고객 이메일">{inquiry.contact_email}</td><td data-label="주문번호" className="td-mono">{inquiry.orders?.toss_order_id || inquiry.order_id || '—'}</td><td data-label="접수일" className="admin-date">{formatDate(inquiry.created_at)}</td><td data-label="상태"><StatusBadge status={inquiry.status} /></td><td data-label="관리"><button className="admin-product-action edit" onClick={() => setSelectedId(inquiry.id)}>보기</button></td></tr>)}</tbody></table></div>}
    </div>
    {selected && <InquiryDetail inquiry={selected} onClose={() => setSelectedId(null)} onAnswered={answered} />}
  </>
}

export default function AdminInquiries() { return <AdminGate><AdminInquiriesContent /></AdminGate> }
