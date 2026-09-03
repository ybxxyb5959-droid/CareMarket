import Icon from './Icon'
import { dailyPct } from '../lib/format'

// 사용자의 주목표에 따라 카드에서 강조되는 영양정보가 달라진다
export default function GoalBadge({ goal, product }) {
  const n = product.nutrition
  switch (goal) {
    case '근육량 증가':
      return (
        <div className="goal-badge gb-muscle">
          <span className="gb-label"><Icon name="dumbbell" size={15} /> 순수 단백질</span>
          <span className="gb-value">{n.protein}g <small>({dailyPct(n.protein, 55)}%)</small></span>
        </div>
      )
    case '체중 관리':
      return (
        <div className="goal-badge gb-weight">
          <span className="gb-label"><Icon name="flame" size={15} /> 열량 · 당류</span>
          <span className="gb-value">{n.calories}kcal <small>· 당 {n.sugar}g</small></span>
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
          <span className="gb-label"><Icon name="leaf" size={15} /> 저염 나트륨</span>
          <span className="gb-value">{n.sodium}mg <small>({dailyPct(n.sodium, 2000)}%)</small></span>
        </div>
      )
  }
}
