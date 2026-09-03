import { useState } from 'react'
import { useStore } from '../store'
import { GOALS, SUB_FILTERS, ALLERGENS } from '../data/mock'
import Icon from '../components/Icon'

export default function GoalSetup() {
  const {
    goal, setGoal, subFilters, toggleSub,
    allergies, toggleAllergy, saveWellnessSettings, settingsLoading,
  } = useStore()
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (isSaving || settingsLoading) return
    setIsSaving(true)
    try {
      await saveWellnessSettings()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="wrap page">
      <div className="page-narrow" style={{ margin: '0 auto' }}>
        <div className="panel panel-pad-lg">
          <div className="auth-head">
            <span className="tag tag-soft" style={{ marginBottom: 12 }}>CareMarket Well-being Diagnosis</span>
            <h2 style={{ marginTop: 8 }}>당신의 몸에 맞는 식단 조건을 설정하세요</h2>
            <p>설정한 목적에 따라 쇼핑몰 내 모든 식품의 강조 영양 성분과 진열 순서가 바뀝니다.</p>
          </div>

          {/* 1단계 — 구입 목적 */}
          <div className="step">
            <div className="step-label"><span className="step-num">1</span> 핵심 구입 목적 <span style={{ color: 'var(--faint)', fontWeight: 500, fontSize: 13 }}>(1개 필수)</span></div>
            <div className="goal-pick-grid">
              {GOALS.map((g) => {
                const on = goal === g.name
                return (
                  <div key={g.id} className={`goal-pick${on ? ' on' : ''}`} onClick={() => setGoal(g.name)}>
                    <div className="gp-ico"><Icon name={g.icon} size={22} /></div>
                    <div style={{ flex: 1 }}>
                      <div className="gp-nm">{g.name} {on && <Icon name="check-circle" size={17} style={{ color: 'var(--brand-500)' }} />}</div>
                      <p className="gp-desc">{g.desc}</p>
                      <span className="gp-metric">강조 지표 · {g.focusMetric}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 2단계 — 보조 조건 */}
          <div className="step">
            <div className="step-label"><span className="step-num">2</span> 웰빙 보조 조건 <span style={{ color: 'var(--faint)', fontWeight: 500, fontSize: 13 }}>(다중 선택)</span></div>
            <div className="sub-grid">
              {SUB_FILTERS.map((s) => {
                const on = subFilters.includes(s.tag)
                return (
                  <button key={s.id} className={`sub-pick${on ? ' on' : ''}`} onClick={() => toggleSub(s.tag)}>
                    <span>{s.label} <span style={{ opacity: 0.6, fontWeight: 500, fontSize: 11 }}>· {s.hint}</span></span>
                    <Icon name={on ? 'check' : 'plus'} size={15} strokeWidth={on ? 2.6 : 1.8} />
                  </button>
                )
              })}
            </div>
          </div>

          {/* 3단계 — 알레르기 제외 */}
          <div className="step">
            <div className="step-label"><span className="step-num">3</span> 알레르기 안심 제외 성분</div>
            <div className="allergy-wrap">
              {ALLERGENS.map((a) => {
                const on = allergies.includes(a)
                return (
                  <button key={a} className={`allergy${on ? ' on' : ''}`} onClick={() => toggleAllergy(a)}>
                    {on ? `✕ ${a} 제외됨` : `+ ${a}`}
                  </button>
                )
              })}
            </div>
            <p style={{ fontSize: 12, color: 'var(--faint)', marginTop: 10 }}>
              선택한 성분은 ‘알레르기 제외’ 보조 조건과 함께 상품 목록에서 자동으로 걸러집니다.
            </p>
          </div>

          <div className="step">
            <button
              className="btn btn-primary btn-lg btn-block"
              onClick={handleSave}
              disabled={isSaving || settingsLoading}
            >
              <Icon name="check-circle" size={17} /> 맞춤 웰빙 마켓 입장하기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
