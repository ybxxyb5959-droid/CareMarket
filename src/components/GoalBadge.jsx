import { isSupplement, supplementCardDescription } from '../../supabase/functions/_shared/product-type.js'
import { matchingAllergens } from '../lib/catalog'
import Icon from './Icon'
import { dailyPct } from '../lib/format'

// 사용자의 주목표에 따라 카드에서 강조되는 영양정보가 달라진다
export default function GoalBadge({ goal, product }) {
  const n = product.nutrition || {}
  const amount = (value, unit) => Number.isFinite(value) ? `${value}${unit}` : '정보 없음'
  const percent = (value, base) => Number.isFinite(value) ? `(${dailyPct(value, base)}%)` : ''
  if (isSupplement(product)) return <div className="goal-badge gb-supp supplement-card-actives">
    <span className="gb-label"><Icon name="pill" size={15} /> {goal === '영양제 탐색' ? '주요 성분' : '보조 영양 상품'}</span>
    <span className="gb-value" title={supplementCardDescription(product)}>{supplementCardDescription(product)}</span>
  </div>
  switch (goal) {
    case '근육량 증가':
      return (
        <div className="goal-badge gb-muscle">
          <span className="gb-label"><Icon name="dumbbell" size={15} /> 순수 단백질</span>
          <span className="gb-value">{amount(n.protein, 'g')} <small>{percent(n.protein, 55)}</small></span>
        </div>
      )
    case '체중 관리':
      return (
        <div className="goal-badge gb-weight">
          <span className="gb-label"><Icon name="flame" size={15} /> 열량 · 당류</span>
          <span className="gb-value">{amount(n.calories, 'kcal')} <small>· 당 {amount(n.sugar, 'g')}</small></span>
        </div>
      )
    case '영양제 탐색':
      return (
        <div className="goal-badge gb-supp">
          <span className="gb-label"><Icon name="pill" size={15} /> 핵심 활성</span>
          <span className="gb-value" title={n.special}>{n.special}</span>
        </div>
      )
    case '식단 영양 관리':
    default:
      return (
        <div className="goal-badge gb-diet">
          <span className="gb-label"><Icon name="leaf" size={15} /> 나트륨</span>
          <span className="gb-value">{amount(n.sodium, 'mg')} <small>{percent(n.sodium, 2000)}</small></span>
        </div>
      )
  }
}

export function AllergenBadges({ product, allergies }) {
  return matchingAllergens(product, allergies).map(allergen => (
    <span className="tag allergen-badge" key={allergen}>⚠ {allergen} 포함</span>
  ))
}
