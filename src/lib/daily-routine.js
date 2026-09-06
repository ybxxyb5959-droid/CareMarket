export const ROUTINE_SLOTS = [
  { id: 'morning', time: '08:00', minute: 480, label: '아침', note: '하루를 여는 한 끼', categories: ['시리얼·그래놀라', '유제품·대체유'], ideas: [
    ['요거트와 그래놀라로 여는 아침', '요거트에 바삭한 그래놀라와 제철 과일을 곁들여 보세요. 분주한 아침에도 간단하게 한 끼를 준비할 수 있어요.'],
    ['과일을 곁들인 산뜻한 아침', '오늘은 좋아하는 과일과 시리얼을 함께 담아보세요. 우유나 두유를 곁들이면 더욱 부드럽게 즐길 수 있어요.'],
    ['천천히 즐기는 아침 한 그릇', '시리얼이나 요거트에 견과를 조금 더해보세요. 서로 다른 식감으로 아침 식탁이 한층 풍성해져요.'],
  ] },
  { id: 'lunch', time: '12:30', minute: 750, label: '점심', note: '든든하게 채우는 점심', categories: ['도시락·간편식'], ideas: [
    ['곡물과 채소를 담은 점심', '간편한 도시락에 신선한 채소를 곁들여 보세요. 바쁜 날에도 다채로운 한 상을 즐기는 방법이에요.'],
    ['바쁜 하루에도 든든한 한 끼', '오늘의 간편식으로 점심 준비를 가볍게 해보세요. 좋아하는 채소 반찬을 함께 담으면 더욱 좋아요.'],
    ['잠깐의 여유, 따뜻한 점심', '따뜻하게 데운 한 끼와 함께 잠시 쉬어가세요. 곁들일 채소를 미리 준비하면 점심시간이 여유로워져요.'],
  ] },
  { id: 'afternoon', time: '16:00', minute: 960, label: '오후', note: '잠시 쉬어가는 티타임', categories: ['프로틴바·건강간식', '견과·건과류'], ideas: [
    ['차 한 잔과 가벼운 간식', '따뜻한 차와 함께 작은 간식을 준비해 보세요. 오후의 잠깐을 오롯이 나를 위한 시간으로 채워요.'],
    ['바삭하게 즐기는 오후의 쉼', '좋아하는 간식을 조금 덜어 차와 곁들여 보세요. 천천히 맛보며 분주했던 하루에 쉼표를 더해요.'],
    ['기분 좋은 오후 한 입', '출출한 오후에는 간편하게 챙길 수 있는 간식을 만나보세요. 물 한 잔도 함께 준비해 두면 좋아요.'],
  ] },
  { id: 'evening', time: '19:30', minute: 1170, label: '저녁', note: '하루를 마무리하는 식탁', categories: ['닭가슴살·고단백 식품'], ideas: [
    ['채소와 함께 차리는 저녁', '닭가슴살에 구운 채소와 밥을 곁들여 보세요. 익숙한 재료로 정갈한 저녁 식탁을 완성해요.'],
    ['따뜻하고 담백한 저녁 한 상', '오늘의 단백질 식품에 따뜻한 곡물밥을 곁들여 보세요. 천천히 즐기는 저녁으로 하루를 마무리해요.'],
    ['취향대로 담는 저녁 플레이트', '단백질 식품과 좋아하는 채소를 한 접시에 담아보세요. 소스는 따로 준비해 입맛에 맞게 곁들여요.'],
  ] },
]

export function getRoutineClock(date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).map(({ type, value }) => [type, value]))
  const day = Math.floor(Date.UTC(+parts.year, +parts.month - 1, +parts.day) / 86400000)
  const minute = +parts.hour * 60 + +parts.minute
  const slot = ROUTINE_SLOTS.findLast(item => minute >= item.minute) || ROUTINE_SLOTS[0]
  return { day, dateKey: `${parts.year}-${parts.month}-${parts.day}`, label: `${+parts.month}월 ${+parts.day}일`, slotId: slot.id }
}

export function getDailyRoutine(products, day, allergies = []) {
  return ROUTINE_SLOTS.map((slot, index) => {
    const candidates = products.filter(product => slot.categories.includes(product.category)
      && product.isActive !== false && product.stock > 0
      && !allergies.some(allergy => (product.allergens || []).includes(allergy)))
      .sort((a, b) => String(a.id).localeCompare(String(b.id), 'en', { numeric: true }))
    const [title, description] = slot.ideas[day % slot.ideas.length]
    return { ...slot, title, description, product: candidates.length ? candidates[(day + index) % candidates.length] : null }
  })
}
