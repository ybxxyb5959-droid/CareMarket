import { useMemo } from 'react'
import { useStore } from '../store'
import { filterAndSort, hasComparableNutrition } from '../lib/catalog'
import Icon from '../components/Icon'
import ProductCard from '../components/ProductCard'

// 목표별 추천 기준 안내 (실제 정렬 로직 goalScore와 일치하는 설명만 사용)
const GOAL_INTRO = {
  '근육량 증가': '단백질 식품을 우선하고 단백질·당류 정보를 함께 반영해요.',
  '체중 관리': '식사·단백질 식품을 우선하고 열량·당류 정보를 함께 반영해요.',
  '식단 영양 관리': '식단을 구성할 수 있는 식품을 우선하고 나트륨·당류 정보를 함께 반영해요.',
  '영양제 탐색': '영양제·비타민 상품을 먼저 보여드려요.',
}

// 추천 상품 묶음(행). 항목이 없으면 렌더하지 않는다.
function ProductRow({ title, hint, items }) {
  if (!items.length) return null
  return (
    <section className="foryou-row">
      <div className="foryou-row-head">
        <h2>{title}</h2>
        {hint && <span className="foryou-row-hint">{hint}</span>}
      </div>
      <div className="foryou-grid">
        {items.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  )
}

export default function CustomShop() {
  const {
    goal, subFilters, allergies,
    products, productsLoading, settingsLoading,
    isLoggedIn, navigate,
  } = useStore()

  // 로그인 회원인데 주 구매 목적이 없으면(goal === null) '조건 미설정' 상태다.
  const needsSetup = isLoggedIn && !goal
  const loading = productsLoading || (isLoggedIn && settingsLoading)

  // 알레르기 성분은 안전을 위해 어떤 행에서도 항상 제외한다.
  const safe = useMemo(
    () => (allergies.length ? products.filter((p) => !p.allergens.some((a) => allergies.includes(a))) : products),
    [products, allergies],
  )

  // 1) 오늘의 맞춤 상품 — 현재 목표/조건 기반 추천 정렬 (Home과 동일한 filterAndSort 재사용)
  const forYou = useMemo(
    () => (goal
      ? filterAndSort(products, { search: '', subFilters, allergies, sortBy: 'recommend', goal, shopCategory: '전체상품', shopSub: '전체' }).slice(0, 8)
      : []),
    [products, subFilters, allergies, goal],
  )

  // 2) 단백질 채우기 — 실제 단백질 함량(15g 이상) 기준
  const proteinRow = useMemo(
    () => [...safe].filter((p) => p.nutrition.protein >= 15).sort((a, b) => b.nutrition.protein - a.nutrition.protein).slice(0, 8),
    [safe],
  )

  // 3) 가볍게 즐기기 좋은 상품 — 실제 열량(200kcal 이하) 기준
  const lightRow = useMemo(
    () => [...safe]
      .filter((p) => hasComparableNutrition(p, '체중 관리') && p.nutrition.calories <= 200)
      .sort((a, b) => a.nutrition.calories - b.nutrition.calories || a.id - b.id)
      .slice(0, 8),
    [safe],
  )

  const intro = isLoggedIn
    ? (goal ? GOAL_INTRO[goal] : '')
    : '지금은 기본 추천을 보고 있어요. 로그인하면 나에게 맞는 추천을 받을 수 있어요.'

  // 현재 적용 중인 조건 칩 (실제 설정값만 표시)
  const excludeChips = allergies.map((a) => `${a} 제외`)

  return (
    <div className="wrap page">
      <div className="page-mid foryou-page" style={{ margin: '0 auto' }}>
        <header className="foryou-head">
          <div className="foryou-head-copy">
            <span className="eyebrow">FOR YOU</span>
            <h1 className="page-title" style={{ marginTop: 6 }}>나를 위한 웰니스 추천</h1>
            {!needsSetup && (
              <p className="foryou-sub">
                {goal && <><b>{goal}</b>에 맞춘 추천이에요. </>}
                {intro}
              </p>
            )}
            {!needsSetup && (subFilters.length > 0 || excludeChips.length > 0) && (
              <div className="foryou-chips">
                {subFilters.map((tag) => <span key={tag} className="foryou-chip">{tag}</span>)}
                {excludeChips.map((label) => <span key={label} className="foryou-chip foryou-chip-mute">{label}</span>)}
              </div>
            )}
          </div>
          <div className="foryou-head-actions">
            {isLoggedIn ? (
              <button type="button" className="btn btn-soft btn-sm" onClick={() => navigate('goalSetup')}>
                <Icon name="sliders" size={15} /> 추천 조건 변경
              </button>
            ) : (
              <button type="button" className="btn btn-soft btn-sm" onClick={() => navigate('login')}>
                <Icon name="user" size={15} /> 로그인하고 맞춤 추천 받기
              </button>
            )}
          </div>
        </header>

        {loading ? (
          <div className="empty" aria-live="polite">
            <Icon name="package" size={44} />
            <h3>맞춤 상품을 불러오고 있습니다.</h3>
            <p>현재 설정된 추천 기준을 확인하는 중입니다.</p>
          </div>
        ) : needsSetup ? (
          <div className="empty">
            <Icon name="sliders" size={44} />
            <h3>아직 맞춤 추천 기준이 설정되지 않았어요.</h3>
            <p>구매 목적과 선택 조건을 설정하면 나에게 맞는 상품을 모아서 보여드려요.</p>
            <button className="btn btn-primary" onClick={() => navigate('goalSetup')}>
              <Icon name="sliders" size={16} /> 추천 조건 설정하기
            </button>
          </div>
        ) : forYou.length === 0 && proteinRow.length === 0 && lightRow.length === 0 ? (
          <div className="empty">
            <Icon name="alert-circle" size={44} />
            <h3>조건에 맞는 상품이 없습니다.</h3>
            <p>선택 조건이나 제외 성분을 조정하면 더 많은 상품을 볼 수 있어요.</p>
            <button className="btn btn-primary" onClick={() => navigate('goalSetup')}>추천 조건 변경</button>
          </div>
        ) : (
          <>
            <ProductRow title="오늘의 맞춤 상품" hint={goal ? `${goal} 기준` : undefined} items={forYou} />
            <ProductRow title="단백질 채우기" hint="단백질 15g 이상" items={proteinRow} />
            <ProductRow title="가볍게 즐기기 좋은 상품" hint="200kcal 이하" items={lightRow} />

            <div className="foryou-foot">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('products')}>
                전체 상품 보기 <Icon name="chevron-right" size={15} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
