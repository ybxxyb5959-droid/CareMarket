import { useState } from 'react'
import { useStore } from '../store'
import Icon from '../components/Icon'
import { openPostcode } from '../lib/postcode'

const MENU = [
  { title: '주문 · 배송 조회', desc: '최근 주문과 배송 현황', view: 'orders' },
  { title: '구매 목적 및 선택 조건 재설정', desc: '상품에 강조되는 영양 지표 변경', view: 'goalSetup' },
]

export default function MyPage() {
  const { user, profile, isLoggedIn, goal, subFilters, allergies, navigate, logout, updateProfile } = useStore()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(null)

  if (!isLoggedIn || !user) {
    return (
      <div className="wrap page">
        <div className="page-slim" style={{ margin: '0 auto' }}>
          <div className="panel" style={{ textAlign: 'center' }}>
            <div className="auth-head">
              <h2>로그인이 필요합니다</h2>
              <p>로그인하면 맞춤 목적·선택 조건과 주문 내역을 확인할 수 있습니다.</p>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 8 }}>
              <button className="btn btn-primary" onClick={() => navigate('login')}>로그인</button>
              <button className="btn btn-ghost" onClick={() => navigate('register')}>회원가입</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const startEdit = () => {
    setForm({
      displayName: user.name || '',
      phone: profile?.phone || '',
      postalCode: profile?.postalCode || '',
      address: profile?.address || '',
      addressDetail: profile?.addressDetail || '',
    })
    setEditing(true)
  }
  const setField = (name, value) => setForm((c) => ({ ...c, [name]: value }))
  const findPostcode = () => {
    openPostcode(({ zonecode, address }) => setForm((c) => ({ ...c, postalCode: zonecode, address }))).catch(() => {})
  }
  const save = async () => {
    if (saving) return
    setSaving(true)
    const ok = await updateProfile(form)
    setSaving(false)
    if (ok) setEditing(false)
  }

  return (
    <div className="wrap page">
      <div className="page-narrow" style={{ margin: '0 auto' }}>
        <div className="profile">
          <div className="profile-id">
            <div className="avatar">{user.name.slice(0, 1)}</div>
            <div>
              <h2>{user.name} <span className="tag tag-soft">{user.tier}</span></h2>
              <div className="em">{user.email}</div>
            </div>
          </div>
          <div className="profile-stats">
            <div><div className="k">보유 포인트</div><div className="v">{user.points.toLocaleString('ko-KR')}P</div></div>
            <div><div className="k">쿠폰</div><div className="v g">{user.coupons}장</div></div>
          </div>
        </div>

        {/* 회원정보 확인 · 수정 */}
        <section className="account-section">
          <div className="sc-head">
            <h3><Icon name="user" size={17} style={{ color: 'var(--brand-500)' }} /> 회원정보</h3>
            {!editing && <button className="td-link" onClick={startEdit} style={{ fontSize: 13 }}>수정하기</button>}
          </div>

          {!editing ? (
            <div className="prof-grid">
              <div className="prof-cell"><div className="k">이름</div><div className="v">{user.name}</div></div>
              <div className="prof-cell"><div className="k">이메일</div><div className="v">{user.email}</div></div>
              <div className="prof-cell"><div className="k">휴대전화</div><div className="v">{profile?.phone || '미등록'}</div></div>
              <div className="prof-cell"><div className="k">우편번호</div><div className="v">{profile?.postalCode || '미등록'}</div></div>
              <div className="prof-cell" style={{ gridColumn: '1 / -1' }}>
                <div className="k">주소</div>
                <div className="v">
                  {profile?.address ? `${profile.address}${profile.addressDetail ? ` ${profile.addressDetail}` : ''}` : '미등록'}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="field">
                <label>이름</label>
                <input type="text" value={form.displayName} onChange={(e) => setField('displayName', e.target.value)} />
              </div>
              <div className="field">
                <label>이메일 (변경 불가)</label>
                <input type="email" value={user.email} readOnly aria-readonly="true" />
              </div>
              <div className="field">
                <label>휴대전화번호</label>
                <input type="tel" inputMode="tel" value={form.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="010-0000-0000" />
              </div>
              <div className="field">
                <label>우편번호</label>
                <div className="postcode-row">
                  <input type="text" value={form.postalCode} onChange={(e) => setField('postalCode', e.target.value)} placeholder="우편번호" readOnly />
                  <button type="button" className="btn btn-ghost btn-sm" onClick={findPostcode}>우편번호 찾기</button>
                </div>
              </div>
              <div className="field">
                <label>기본주소</label>
                <input type="text" value={form.address} onChange={(e) => setField('address', e.target.value)} placeholder="주소 찾기로 입력됩니다" />
              </div>
              <div className="field">
                <label>상세주소</label>
                <input type="text" value={form.addressDetail} onChange={(e) => setField('addressDetail', e.target.value)} placeholder="상세주소를 입력해 주세요" />
              </div>
              <div className="auth-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)} disabled={saving}>취소</button>
                <button type="button" className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={save} disabled={saving}>
                  {saving ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="account-section">
          <div className="sc-head">
            <h3><Icon name="sparkles" size={17} style={{ color: 'var(--brand-500)' }} /> 나의 맞춤 쇼핑 기준</h3>
            <button className="td-link" onClick={() => navigate('goalSetup')} style={{ fontSize: 13 }}>재설정하기</button>
          </div>
          <div className="prof-grid">
            <div className="prof-cell"><div className="k">구매 목적</div><div className="v">{goal || '미설정'}</div></div>
            <div className="prof-cell"><div className="k">선택 조건</div><div className="v">{subFilters.join(', ') || '없음'}</div></div>
            <div className="prof-cell"><div className="k">알레르기 제외</div><div className="v r">{allergies.join(', ') || '제외 없음'}</div></div>
          </div>
        </section>

        <div className="menu-list">
          {MENU.map((m, i) => (
            <div key={i} className="menu-row" onClick={() => navigate(m.view)}>
              <div>
                <div className="m-title">{m.title}</div>
                <div className="m-desc">{m.desc}</div>
              </div>
              <Icon name="chevron-right" size={17} style={{ color: 'var(--faint)' }} />
            </div>
          ))}
          <div className="menu-row" onClick={logout}>
            <div>
              <div className="m-title">로그아웃</div>
              <div className="m-desc">현재 계정에서 로그아웃합니다.</div>
            </div>
            <Icon name="chevron-right" size={17} style={{ color: 'var(--faint)' }} />
          </div>
        </div>
      </div>
    </div>
  )
}
