// User-confirmed fictional catalog. Explicit mock values, not inferred product
// specifications. Match both ID and name so an unrelated future product is untouched.
export const catalogDemoActives = Object.freeze({
  71: {
    name: '데일리 올인원 활력 멀티비타민 & 미네랄 60정',
    ingredients: ['비타민B군 복합체 25mg', '비타민C 100mg', '비타민D3 10μg', '아연 8.5mg', '셀레늄 55μg'],
  },
  79: {
    name: '옥타코사놀 아르기닌 맥스 활력환 30포',
    ingredients: ['L-아르기닌 1,000mg', '옥타코사놀함유유지 20mg', '마카추출분말 500mg', '아연 8.5mg'],
  },
})
export const catalogDemoActivesFor = product => {
  const entry = catalogDemoActives[product?.id ?? product?.product_id]
  return entry?.name === product?.name ? entry.ingredients : null
}
