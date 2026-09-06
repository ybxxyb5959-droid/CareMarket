import { useEffect, useMemo, useState } from 'react'
import Icon from '../components/Icon'
import { supabase } from '../lib/supabase'
import { fetchCustomerInquiries, inquiryStatusLabel, isAnsweredInquiry } from '../lib/support'
import { useStore } from '../store'

const formatDate = (value, withTime = false) => new Intl.DateTimeFormat('ko-KR', withTime
  ? { dateStyle: 'long', timeStyle: 'short' }
  : { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value))

function InquiryStatusBadge({ status }) {
  return <span className={`support-inquiry-status ${isAnsweredInquiry(status) ? 'answered' : 'waiting'}`}>{inquiryStatusLabel(status)}</span>
}

function LinkedOrder({ inquiry }) {
  const displayId = inquiry.orders?.toss_order_id || inquiry.order_id
  return displayId ? <span className="support-inquiry-order-id">{displayId}</span> : '연결된 주문 없음'
}

function InquiryDetail({ inquiry, onBack, showBack = true }) {
  const answered = isAnsweredInquiry(inquiry)
  return <div className="support-inquiry-detail">
    {showBack && <button className="service-back" type="button" onClick={onBack}>← 1:1 문의 내역</button>}
    <header className="support-inquiry-heading">
      <span className="eyebrow">INQUIRY DETAIL</span>
      <div className="support-inquiry-detail-title"><h1>{inquiry.title}</h1><InquiryStatusBadge status={inquiry.status} /></div>
    </header>

    <section className="support-inquiry-detail-card">
      <dl className="support-inquiry-detail-meta">
        <div><dt>문의 유형</dt><dd>{inquiry.category}</dd></div>
        <div><dt>접수일</dt><dd>{formatDate(inquiry.created_at, true)}</dd></div>
        {inquiry.order_id && <div className="wide"><dt>주문번호</dt><dd><LinkedOrder inquiry={inquiry} /></dd></div>}
        <div><dt>현재 상태</dt><dd><InquiryStatusBadge status={inquiry.status} /></dd></div>
      </dl>
      <div className="support-inquiry-question"><h2>문의 내용</h2><p>{inquiry.content}</p></div>
    </section>

    {answered ? <section className="support-inquiry-answer">
      <span className="eyebrow">CAREMARKET ANSWER</span>
      <h2>CareMarket 답변</h2>
      <p>{inquiry.admin_answer}</p>
      <dl><dt>답변일</dt><dd>{formatDate(inquiry.answered_at, true)}</dd></dl>
    </section> : <section className="support-inquiry-waiting">
      <span className="support-waiting-icon"><Icon name="clock" size={24} /></span>
      <div><h2>답변을 준비하고 있어요.</h2><p>문의 내용을 확인한 후<br />답변이 등록되면 이 화면에서 확인할 수 있습니다.</p></div>
    </section>}
  </div>
}

export function InquiryHistory({ authUserId, navigate, showBack = true, showDetailBack = showBack }) {
  const [inquiries, setInquiries] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(false)
    try {
      setInquiries(await fetchCustomerInquiries(supabase, authUserId))
    } catch (caught) {
      console.error('Customer inquiries fetch failed:', { code: caught?.code || 'CUSTOMER_INQUIRIES_FETCH_FAILED' })
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    fetchCustomerInquiries(supabase, authUserId)
      .then((rows) => { if (active) setInquiries(rows) })
      .catch((caught) => {
        if (!active) return
        console.error('Customer inquiries fetch failed:', { code: caught?.code || 'CUSTOMER_INQUIRIES_FETCH_FAILED' })
        setError(true)
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [authUserId])

  const summary = useMemo(() => inquiries.reduce((counts, inquiry) => {
    counts.total += 1
    counts[isAnsweredInquiry(inquiry) ? 'answered' : 'waiting'] += 1
    return counts
  }, { total: 0, waiting: 0, answered: 0 }), [inquiries])
  const selected = inquiries.find((inquiry) => inquiry.id === selectedId)

  if (selected) return <InquiryDetail inquiry={selected} onBack={() => setSelectedId(null)} showBack={showDetailBack} />

  return <>
    {showBack && <button className="service-back" type="button" onClick={() => navigate('support')}>← 고객지원으로 돌아가기</button>}
    <header className="support-inquiry-heading">
      <span className="eyebrow">MY INQUIRIES</span>
      <h1>1:1 문의 내역</h1>
      <p>접수한 문의의 처리 상태와 CareMarket 답변을 확인하세요.</p>
    </header>

    {loading ? <div className="empty" role="status"><p>문의 내역을 불러오는 중입니다.</p></div> : error ? <div className="empty" role="alert"><h3>문의 내역을 불러오지 못했어요.</h3><button className="btn btn-primary btn-sm" onClick={() => void load()}>다시 시도</button></div> : inquiries.length === 0 ? <div className="empty support-inquiries-empty"><h3>아직 접수한 문의가 없어요.</h3><button className="btn btn-primary" onClick={() => navigate('supportInquiry')}>1:1 문의하기</button></div> : <>
      <dl className="support-inquiry-summary" aria-label="1:1 문의 상태 요약">
        <div><dt>전체</dt><dd>{summary.total}</dd></div>
        <div><dt>답변 대기</dt><dd>{summary.waiting}</dd></div>
        <div><dt>답변 완료</dt><dd>{summary.answered}</dd></div>
      </dl>
      <div className="table-wrap support-inquiry-table-wrap">
        <table className="support-inquiry-table">
          <thead><tr><th>문의 유형</th><th>제목</th><th>접수일</th><th>상태</th></tr></thead>
          <tbody>{inquiries.map((inquiry) => <tr key={inquiry.id} onClick={() => setSelectedId(inquiry.id)}>
            <td><span className="td-cat">{inquiry.category}</span></td>
            <td><button type="button" onClick={() => setSelectedId(inquiry.id)}>{inquiry.title}</button></td>
            <td>{formatDate(inquiry.created_at)}</td>
            <td><InquiryStatusBadge status={inquiry.status} /></td>
          </tr>)}</tbody>
        </table>
      </div>
    </>}
  </>
}

export default function SupportInquiries() {
  const { authUserId, authLoading, isLoggedIn, navigate } = useStore()

  if (authLoading) return <div className="wrap page page-narrow"><div className="empty" role="status"><Icon name="shield-check" size={42} /><h3>로그인 정보를 확인하고 있습니다.</h3></div></div>

  if (!isLoggedIn || !authUserId) return <div className="wrap page support-login-required">
    <button className="service-back" type="button" onClick={() => navigate('support')}>← 고객지원으로 돌아가기</button>
    <div className="empty"><span className="support-login-mark"><Icon name="user" size={28} /></span><h1>내 문의 내역은 로그인 후 확인할 수 있어요.</h1><button type="button" className="btn btn-primary" onClick={() => navigate('login')}>로그인</button></div>
  </div>

  return <div className="wrap page support-inquiry-page"><InquiryHistory key={authUserId} authUserId={authUserId} navigate={navigate} /></div>
}
