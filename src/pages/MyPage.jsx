import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { supabase } from '../lib/supabase'
import { fetchMyOrders } from '../lib/orders'
import { won } from '../lib/format'
import Icon from '../components/Icon'
import ProductCard from '../components/ProductCard'
import { openPostcode } from '../lib/postcode'

const STATUS_LABELS = { paid: '결제완료', preparing: '상품준비중', shipped: '배송중', delivered: '배송완료' }
const orderDate = (value) => new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(value))

export default function MyPage() {
  const {
    user, profile, isLoggedIn, authUserId, goal, subFilters, allergies,
    wishlist, products, navigate, logout, updateProfile,
  } = useStore()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(null)
  const [orders, setOrders] = useState({ ownerId: null, rows: [] })

  useEffect(() => {
    let active = true
    if (!authUserId) return () => { active = false }
    fetchMyOrders(supabase, authUserId)
      .then((rows) => {
        if (active) setOrders({ ownerId: authUserId, rows: rows.slice(0, 2) })
      })
      .catch(() => {
        if (active) setOrders({ ownerId: authUserId, rows: [] })
      })
    return () => { active = false }
  }, [authUserId])

  if (!isLoggedIn || !user) {
    return (
      <div className="wrap page">
        <div className="page-slim mypage-login"><div className="panel">
          <div className="auth-head"><h2>로그인이 필요합니다</h2><p>로그인하면 주문내역, 찜한 상품과 배송지를 한곳에서 확인할 수 있습니다.</p></div>
          <div className="mypage-login-actions"><button className="btn btn-primary" onClick={() => navigate('login')}>로그인</button><button className="btn btn-ghost" onClick={() => navigate('register')}>회원가입</button></div>
        </div></div>
      </div>
    )
  }

  const recentOrders = orders.ownerId === authUserId ? orders.rows : []
  const wishedProducts = wishlist
    .map((id) => products.find((product) => product.id === id))
    .filter(Boolean)
    .slice(0, 4)
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
      <div className="mypage-head">
        <div className="profile-id"><div className="avatar">{user.name.slice(0, 1)}</div><div><span className="eyebrow">마이 쇼핑</span><h1>{user.name}님, 안녕하세요</h1><div className="em">{user.email}</div></div></div>
        <button className="btn btn-ghost btn-sm" onClick={logout}>로그아웃</button>
      </div>

      <section className="mypage-section" aria-labelledby="mypage-orders-title">
        <div className="mypage-section-head"><div><span className="section-number">1</span><h2 id="mypage-orders-title">최근 주문</h2></div><button className="more-link" onClick={() => navigate('orders')}>전체 주문내역 →</button></div>
        {recentOrders.length ? (
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

      <section className="mypage-section" aria-labelledby="mypage-wishlist-title">
        <div className="mypage-section-head"><div><span className="section-number">2</span><h2 id="mypage-wishlist-title">찜한 상품</h2><small>{wishlist.length}개</small></div><button className="more-link" onClick={() => navigate('products')}>상품 더보기 →</button></div>
        {wishedProducts.length ? <div className="product-grid mypage-wishlist-grid">{wishedProducts.map((product) => <ProductCard key={product.id} product={product} />)}</div> : (
          <div className="mypage-empty-row"><div><Icon name="heart" size={22} /><span><strong>찜한 상품이 없습니다.</strong><small>관심 상품의 하트를 눌러 모아보세요.</small></span></div><button className="btn btn-ghost btn-sm" onClick={() => navigate('products')}>상품 찾기</button></div>
        )}
      </section>

      <section className="mypage-section" aria-labelledby="mypage-profile-title">
        <div className="mypage-section-head"><div><span className="section-number">3</span><h2 id="mypage-profile-title">배송지 · 회원정보</h2></div>{!editing && <button className="more-link" onClick={startEdit}>수정하기</button>}</div>
        {!editing ? (
          <div className="mypage-profile-grid">
            <div><span>기본 배송지</span><strong>{profile?.address ? `${profile.address}${profile.addressDetail ? ` ${profile.addressDetail}` : ''}` : '등록된 배송지가 없습니다.'}</strong><small>{profile?.postalCode ? `(${profile.postalCode})` : '주문 전 배송지를 등록해 주세요.'}</small></div>
            <div><span>연락처</span><strong>{profile?.phone || '미등록'}</strong></div><div><span>이름</span><strong>{user.name}</strong></div><div><span>이메일</span><strong>{user.email}</strong></div>
          </div>
        ) : (
          <div className="mypage-edit-form">
            <div className="field"><label>이름</label><input type="text" value={form.displayName} onChange={(event) => setField('displayName', event.target.value)} /></div>
            <div className="field"><label>이메일 (변경 불가)</label><input type="email" value={user.email} readOnly aria-readonly="true" /></div>
            <div className="field"><label>휴대전화번호</label><input type="tel" inputMode="tel" value={form.phone} onChange={(event) => setField('phone', event.target.value)} placeholder="010-0000-0000" /></div>
            <div className="field"><label>우편번호</label><div className="postcode-row"><input type="text" value={form.postalCode} placeholder="우편번호" readOnly /><button type="button" className="btn btn-ghost btn-sm" onClick={findPostcode}>주소 찾기</button></div></div>
            <div className="field mypage-edit-wide"><label>기본주소</label><input type="text" value={form.address} onChange={(event) => setField('address', event.target.value)} placeholder="배송받을 주소를 입력해 주세요" /></div>
            <div className="field mypage-edit-wide"><label>상세주소</label><input type="text" value={form.addressDetail} onChange={(event) => setField('addressDetail', event.target.value)} placeholder="상세주소를 입력해 주세요" /></div>
            <div className="mypage-edit-actions"><button type="button" className="btn btn-ghost" onClick={() => setEditing(false)} disabled={saving}>취소</button><button type="button" className="btn btn-primary" onClick={save} disabled={saving}>{saving ? '저장 중…' : '저장하기'}</button></div>
          </div>
        )}
      </section>

      <section className="mypage-section" aria-labelledby="mypage-goal-title">
        <div className="mypage-section-head"><div><span className="section-number">4</span><h2 id="mypage-goal-title">나의 맞춤 쇼핑 기준</h2></div><button className="more-link" onClick={() => navigate('goalSetup')}>재설정하기 →</button></div>
        <div className="mypage-goal-row"><div><span>구매 목적</span><strong>{goal || '미설정'}</strong></div><div><span>선택 조건</span><strong>{subFilters.join(' · ') || '없음'}</strong></div><div><span>알레르기 제외</span><strong>{allergies.join(' · ') || '제외 없음'}</strong></div></div>
      </section>
    </div>
  )
}
