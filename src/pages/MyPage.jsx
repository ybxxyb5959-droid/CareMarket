import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { supabase } from '../lib/supabase'
import { fetchMyOrders } from '../lib/orders'
import { won } from '../lib/format'
import Icon from '../components/Icon'
import WishlistQuickPanel from '../components/WishlistQuickPanel'
import MyCoupons from '../components/MyCoupons'
import { openPostcode } from '../lib/postcode'
import { IS_MIDTERM_PRESENTATION } from '../lib/presentation'

const STATUS_LABELS = { paid: '결제완료', preparing: '상품준비중', shipped: '배송중', delivered: '배송완료' }
const orderDate = (value) => new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(value))

export default function MyPage() {
  const {
    user, profile, isLoggedIn, authUserId, goal, subFilters, allergies,
    profileLoading, profileError, reloadProfile,
    navigate, logout, updateProfile,
  } = useStore()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(null)
  const [orders, setOrders] = useState({ ownerId: null, rows: [], loading: false, error: null })
  const [ordersReloadKey, setOrdersReloadKey] = useState(0)
  const [withdrawalOpen, setWithdrawalOpen] = useState(false)
  const [withdrawalAgreed, setWithdrawalAgreed] = useState(false)

  useEffect(() => {
    if (isLoggedIn && window.location.hash === '#my-coupons') {
      document.getElementById('my-coupons')?.scrollIntoView({ block: 'start' })
    }
  }, [isLoggedIn])

  useEffect(() => {
    if (!withdrawalOpen) return undefined
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setWithdrawalOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [withdrawalOpen])

  useEffect(() => {
    let active = true
    if (IS_MIDTERM_PRESENTATION || !authUserId) return () => { active = false }
    fetchMyOrders(supabase, authUserId)
      .then((rows) => {
        if (active) setOrders({ ownerId: authUserId, rows: rows.slice(0, 2), loading: false, error: null })
      })
      .catch((error) => {
        console.error('Supabase recent orders fetch failed:', { code: error?.code || 'RECENT_ORDERS_FETCH_FAILED' })
        if (active) setOrders({ ownerId: authUserId, rows: [], loading: false, error: '최근 주문을 불러오지 못했어요.' })
      })
    return () => { active = false }
  }, [authUserId, ordersReloadKey])

  const retryOrders = () => {
    setOrders({ ownerId: authUserId, rows: [], loading: true, error: null })
    setOrdersReloadKey((key) => key + 1)
  }

  if (!isLoggedIn || !user) {
    return (
      <div className="wrap page">
        <div className="page-slim mypage-login"><div className="panel">
          <div className="auth-head"><h2>로그인이 필요합니다</h2><p>{IS_MIDTERM_PRESENTATION ? '로그인하면 건강목표와 알레르기 제외 설정을 저장할 수 있습니다.' : '로그인하면 주문내역, 찜한 상품과 배송지를 한곳에서 확인할 수 있습니다.'}</p></div>
          <div className="mypage-login-actions"><button className="btn btn-primary" onClick={() => navigate('login')}>로그인</button><button className="btn btn-ghost" onClick={() => navigate('register')}>회원가입</button></div>
        </div></div>
      </div>
    )
  }

  if (IS_MIDTERM_PRESENTATION) {
    return (
      <div className="wrap page mypage">
        <div className="mypage-head">
          <div className="profile-id"><div className="avatar">{user.name.slice(0, 1)}</div><div><span className="eyebrow">중간발표 사용자 설정</span><h1>{user.name}님, 안녕하세요</h1><div className="em">{user.email || '제공되지 않음'}</div></div></div>
          <button className="btn btn-ghost btn-sm" onClick={logout}>로그아웃</button>
        </div>
        <section className="mypage-section" aria-labelledby="mypage-goal-title">
          <div className="mypage-section-head"><div><span className="section-number">1</span><h2 id="mypage-goal-title">나의 건강목표 · 알레르기 설정</h2></div><button className="more-link" onClick={() => navigate('goalSetup')}>설정 변경 →</button></div>
          <div className="mypage-goal-row"><div><span>건강목표</span><strong>{goal || '미설정'}</strong></div><div><span>검색 필터</span><strong>{subFilters.join(' · ') || '없음'}</strong></div><div><span>알레르기 제외</span><strong>{allergies.join(' · ') || '제외 없음'}</strong></div></div>
        </section>
      </div>
    )
  }

  const recentOrdersState = orders.ownerId === authUserId ? orders : { rows: [], loading: true, error: null }
  const recentOrders = recentOrdersState.rows
  const startEdit = () => {
    setForm({ displayName: user.name || '', phone: profile?.phone || '', postalCode: profile?.postalCode || '', address: profile?.address || '', addressDetail: profile?.addressDetail || '' })
    setEditing(true)
  }
  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }))
  const findPostcode = () => openPostcode(({ zonecode, address }) => setForm((current) => ({ ...current, postalCode: zonecode, address }))).catch(() => {})
  const save = async () => {
    if (saving) return
    setSaving(true)
    const ok = await updateProfile(form)
    setSaving(false)
    if (ok) setEditing(false)
  }

  return (
    <div className="wrap page mypage">
      <WishlistQuickPanel />
      <div className="mypage-head">
        <div className="profile-id"><div className="avatar">{user.name.slice(0, 1)}</div><div><span className="eyebrow">마이 쇼핑</span><h1>{user.name}님, 안녕하세요</h1><div className="em">{user.email || '제공되지 않음'}</div></div></div>
        <button className="btn btn-ghost btn-sm" onClick={logout}>로그아웃</button>
      </div>

      <section className="mypage-section" aria-labelledby="mypage-orders-title">
        <div className="mypage-section-head"><div><span className="section-number">1</span><h2 id="mypage-orders-title">최근 주문</h2></div><button className="more-link" onClick={() => navigate('orders')}>전체 주문내역 →</button></div>
        {recentOrdersState.loading ? (
          <div className="mypage-empty-row" role="status"><div><Icon name="package" size={22} /><span><strong>최근 주문을 불러오고 있습니다.</strong></span></div></div>
        ) : recentOrdersState.error ? (
          <div className="mypage-empty-row" role="alert"><div><Icon name="alert-circle" size={22} /><span><strong>최근 주문을 불러오지 못했어요.</strong><small>잠시 후 다시 시도해 주세요.</small></span></div><button type="button" className="btn btn-primary btn-sm" onClick={retryOrders}>다시 시도</button></div>
        ) : recentOrders.length ? (
          <div className="mypage-recent-orders">{recentOrders.map((order) => (
            <button key={order.order_id} type="button" onClick={() => navigate('orders')}>
              <span><small>{orderDate(order.created_at)} · 주문번호</small><strong>{order.toss_order_id || order.order_id}</strong></span>
              <span className="mypage-order-summary"><b>{order.items[0]?.product?.name || '주문 상품'}{order.items.length > 1 ? ` 외 ${order.items.length - 1}건` : ''}</b><small>{won(order.total_price)}</small></span>
              <span className={`status ${order.status === 'delivered' ? 'status-done' : 'status-active'}`}>{STATUS_LABELS[order.status] || order.status}</span><Icon name="chevron-right" size={17} />
            </button>
          ))}</div>
        ) : (
          <div className="mypage-empty-row"><div><Icon name="package" size={22} /><span><strong>아직 완료된 주문이 없습니다.</strong><small>원하는 상품을 찾아 첫 주문을 시작해 보세요.</small></span></div><button className="btn btn-primary btn-sm" onClick={() => navigate('products')}>상품 둘러보기</button></div>
        )}
      </section>

      <section className="mypage-section" aria-labelledby="mypage-profile-title">
        <div className="mypage-section-head"><div><span className="section-number">2</span><h2 id="mypage-profile-title">배송지 · 회원정보</h2></div>{!editing && !profileLoading && !profileError && <button className="more-link" onClick={startEdit}>수정하기</button>}</div>
        {profileLoading ? (
          <div className="mypage-empty-row" role="status"><div><Icon name="package" size={22} /><span><strong>회원정보를 불러오고 있습니다.</strong></span></div></div>
        ) : profileError ? (
          <div className="mypage-empty-row" role="alert"><div><Icon name="alert-circle" size={22} /><span><strong>회원정보를 불러오지 못했어요.</strong><small>잠시 후 다시 시도해 주세요.</small></span></div><button type="button" className="btn btn-primary btn-sm" onClick={reloadProfile}>다시 시도</button></div>
        ) : !editing ? (
          <div className="mypage-profile-grid">
            <div><span>기본 배송지</span><strong>{profile?.address ? `${profile.address}${profile.addressDetail ? ` ${profile.addressDetail}` : ''}` : '등록된 배송지가 없습니다.'}</strong><small>{profile?.postalCode ? `(${profile.postalCode})` : '주문 전 배송지를 등록해 주세요.'}</small></div>
            <div><span>연락처</span><strong>{profile?.phone || '미등록'}</strong></div><div><span>이름</span><strong>{user.name}</strong></div><div><span>이메일</span><strong>{user.email || '제공되지 않음'}</strong></div>
          </div>
        ) : (
          <div className="mypage-edit-form">
            <div className="field"><label>이름</label><input type="text" value={form.displayName} onChange={(event) => setField('displayName', event.target.value)} /></div>
            <div className="field"><label>이메일 (변경 불가)</label><input type="email" value={user.email} placeholder="제공되지 않음" readOnly aria-readonly="true" /></div>
            <div className="field"><label>휴대전화번호</label><input type="tel" inputMode="tel" value={form.phone} onChange={(event) => setField('phone', event.target.value)} placeholder="010-0000-0000" /></div>
            <div className="field"><label>우편번호</label><div className="postcode-row"><input type="text" value={form.postalCode} placeholder="우편번호" readOnly /><button type="button" className="btn btn-ghost btn-sm" onClick={findPostcode}>주소 찾기</button></div></div>
            <div className="field mypage-edit-wide"><label>기본주소</label><input type="text" value={form.address} onChange={(event) => setField('address', event.target.value)} placeholder="배송받을 주소를 입력해 주세요" /></div>
            <div className="field mypage-edit-wide"><label>상세주소</label><input type="text" value={form.addressDetail} onChange={(event) => setField('addressDetail', event.target.value)} placeholder="상세주소를 입력해 주세요" /></div>
            <div className="mypage-edit-actions"><button type="button" className="btn btn-ghost" onClick={() => setEditing(false)} disabled={saving}>취소</button><button type="button" className="btn btn-primary" onClick={save} disabled={saving}>{saving ? '저장 중…' : '저장하기'}</button></div>
          </div>
        )}
      </section>

      <section className="mypage-section" aria-labelledby="mypage-goal-title">
        <div className="mypage-section-head"><div><span className="section-number">3</span><h2 id="mypage-goal-title">나의 맞춤 쇼핑 기준</h2></div><button className="more-link" onClick={() => navigate('goalSetup')}>재설정하기 →</button></div>
        <div className="mypage-goal-row"><div><span>구매 목적</span><strong>{goal || '미설정'}</strong></div><div><span>선택 조건</span><strong>{subFilters.join(' · ') || '없음'}</strong></div><div><span>알레르기 제외</span><strong>{allergies.join(' · ') || '제외 없음'}</strong></div></div>
      </section>

      <section className="mypage-section" aria-labelledby="mypage-inquiries-title">
        <div className="mypage-section-head"><div><span className="section-number">4</span><h2 id="mypage-inquiries-title">고객지원</h2></div></div>
        <div className="mypage-empty-row"><div><Icon name="message-circle" size={22} /><span><strong>1:1 문의 내역</strong><small>접수한 문의와 답변을 확인할 수 있어요.</small></span></div><button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('supportInquiries')}>확인하기</button></div>
      </section>

      <div id="my-coupons"><MyCoupons key={authUserId} userId={authUserId} /></div>
      <div className="mypage-account-actions">
        <button type="button" className="mypage-withdrawal-link" onClick={() => { setWithdrawalAgreed(false); setWithdrawalOpen(true) }}>회원탈퇴</button>
      </div>

      {withdrawalOpen && (
        <div className="withdrawal-overlay" onMouseDown={(event) => event.target === event.currentTarget && setWithdrawalOpen(false)}>
          <section className="withdrawal-modal" role="dialog" aria-modal="true" aria-labelledby="withdrawal-title" aria-describedby="withdrawal-description">
            <div className="withdrawal-modal-head">
              <div><span className="eyebrow">CareMarket account</span><h2 id="withdrawal-title">회원탈퇴 안내</h2></div>
              <button type="button" className="withdrawal-close" onClick={() => setWithdrawalOpen(false)} aria-label="회원탈퇴 안내 닫기">×</button>
            </div>
            <p id="withdrawal-description" className="withdrawal-lead">탈퇴하기 전에 아래 내용을 꼭 확인해 주세요.</p>
            <div className="withdrawal-notices">
              <div><strong>탈퇴 시 이용 정보가 삭제됩니다.</strong><p>회원정보, 찜 목록, 맞춤 쇼핑 기준은 탈퇴 후 복구할 수 없습니다.</p></div>
              <div><strong>주문·문의 기록은 관련 법령에 따라 보관될 수 있습니다.</strong><p>결제와 배송이 완료되지 않은 주문이 있다면 처리가 끝난 후 탈퇴해 주세요.</p></div>
              <div><strong>탈퇴 후 같은 이메일로 바로 재가입할 수 없습니다.</strong><p>보관 기간이 끝난 뒤 재가입할 수 있습니다.</p></div>
            </div>
            <label className="withdrawal-agree">
              <input type="checkbox" checked={withdrawalAgreed} onChange={(event) => setWithdrawalAgreed(event.target.checked)} />
              <span>위 내용을 확인했으며 회원탈퇴를 진행하겠습니다.</span>
            </label>
            <div className="withdrawal-modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setWithdrawalOpen(false)}>취소</button>
              <button type="button" className="btn btn-primary" disabled={!withdrawalAgreed} onClick={() => setWithdrawalOpen(false)}>탈퇴 진행</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
