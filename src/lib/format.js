export const won = (n) => `${Math.round(n).toLocaleString('ko-KR')}원`

export const discountRate = (original, price) =>
  Math.round(((original - price) / original) * 100)

// 목표별 강조 영양 지표를 계산해 카드/상세에서 재사용
export const dailyPct = (value, base) => Math.round((value / base) * 100)
