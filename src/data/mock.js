import { SUPPLEMENT_CATEGORY } from '../../supabase/functions/_shared/product-type.js'
// ============================================================
// CareMarket — 목업 데이터 (실제 DB/API 없이 프론트 시연용)
// ============================================================

// 구입 목적 (핵심 목표) — 선택 시 상품 카드의 강조 영양지표가 바뀐다
export const GOALS = [
  {
    id: 'muscle',
    name: '근육량 증가',
    en: 'Muscle & Strength',
    icon: 'dumbbell',
    desc: 'WPI 분리유청과 저지방 단백질 중심으로 순수 근합성을 돕는 구성',
    focusMetric: '순수 단백질 함량',
    theme: 'muscle',
  },
  {
    id: 'weight',
    name: '체중 관리',
    en: 'Weight & Balance',
    icon: 'flame',
    desc: '혈당을 완만하게, 알룰로스 기반 저칼로리·저당 식단 설계',
    focusMetric: '열량 · 당류',
    theme: 'weight',
  },
  {
    id: 'diet',
    name: '식단 영양 관리',
    en: 'Clean Eating',
    icon: 'apple',
    desc: '자연 저염식과 식이섬유로 탄단지 균형을 맞춘 깨끗한 한 끼',
    focusMetric: '나트륨 · 식이섬유',
    theme: 'diet',
  },
  {
    id: 'supplement',
    name: '영양제 탐색',
    en: 'Daily Vitality',
    icon: 'pill',
    desc: '고순도 활성 비타민과 식물성 오메가로 채우는 데일리 케어',
    focusMetric: '핵심 기능성분',
    theme: 'supp',
  },
]

// 보조 조건 (다중 선택 필터)
export const SUB_FILTERS = [
  { id: 'low_sugar', tag: '저당', label: '저당', hint: '당류 5g 이하' },
  { id: 'low_sodium', tag: '저염', label: '저염', hint: '나트륨 250mg 이하' },
  { id: 'high_protein', tag: '고단백', label: '고단백', hint: '단백질 15g 이상' },
  { id: 'no_caffeine', tag: '카페인 제외', label: '카페인 제외', hint: '디카페인' },
]

export const ALLERGENS = [
  '대두', '우유', '계란', '견과류', '밀', '갑각류', '복숭아', '쇠고기', '닭고기',
]

// 히어로 슬라이드
export const HERO_SLIDES = [
  {
    id: 1,
    tag: 'Well-being Selection',
    title: '흙과 자연이 건네는\n온전한 하루의 영양',
    desc: '불필요한 인공 첨가물 없이, 공인된 영양성분만 담았습니다. 자연 친화적 원료로 완성하는 깨끗한 한 끼.',
    badge: '등록된 영양성분을 확인하세요',
    btn: '저염 클린식 컬렉션',
    collection: { category: '전체상품', sub: '전체', subFilters: ['저염'] },
    image:
      'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1400&auto=format&fit=crop&q=80',
  },
  {
    id: 2,
    tag: 'Clean Protein Lab',
    title: '속 편한 분리유청,\n당류 0g의 단백질 밸런스',
    desc: '유당 걱정 없는 깨끗한 단백질. 자연 감미료로 건강한 달콤함을 설계했습니다.',
    badge: '프로틴 상품 모아보기',
    btn: '프로틴 컬렉션 보기',
    collection: { category: '프로틴', sub: '전체', subFilters: [] },
    image:
      'https://images.unsplash.com/photo-1607013251379-e6eecfffe234?w=1400&auto=format&fit=crop&q=80',
  },
  {
    id: 3,
    tag: 'Low-sugar Botanical',
    title: '설탕 없이도\n깊고 상쾌한 웰빙 라이프',
    desc: '탄산음료 대신 천연 발효 음료로 장 건강과 수분 리듬을 편안하게 깨워보세요.',
    badge: '無합성감미료 원칙',
    btn: '저당 음료 컬렉션',
    collection: { category: '건강음료', sub: '전체', subFilters: ['저당'] },
    image:
      'https://images.unsplash.com/photo-1556881286-fc6915169721?w=1400&auto=format&fit=crop&q=80',
  },
]

// 상단 제품 카테고리 = "상품 종류". (저당/고단백 등 영양 특성은 별도 필터로 분리)
// Supabase category와 관리자 상품 폼이 같은 값을 사용하도록 여기에서 한 번만 관리한다.
export const PRODUCT_CATEGORY = Object.freeze({
  NUTS: '견과·건과류',
  HEALTH_FOOD: '기타 건강식품',
  HIGH_PROTEIN_FOOD: '닭가슴살·고단백 식품',
  MEAL: '도시락·간편식',
  SAUCE: '소스·조미료',
  CEREAL: '시리얼·그래놀라',
  SUPPLEMENT: SUPPLEMENT_CATEGORY,
  DAIRY_ALTERNATIVE: '유제품·대체유',
  DRINK: '음료·프로틴음료',
  PROTEIN_SNACK: '프로틴바·건강간식',
})

export const PRODUCT_CATEGORIES = Object.freeze(Object.values(PRODUCT_CATEGORY))

// 입력/URL/DB 값의 양끝·중간 공백, 영문 대소문자, Unicode 중점 표기 차이를 흡수한다.
export function normalizeCategoryName(value) {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('ko-KR')
    .replace(/\s+/g, '')
    .replace(/[ㆍᆞ・]/g, '·')
}

const PRODUCT_CATEGORY_BY_KEY = new Map(
  PRODUCT_CATEGORIES.map((category) => [normalizeCategoryName(category), category]),
)

export function canonicalProductCategory(value) {
  const raw = String(value || '').normalize('NFKC').trim()
  return PRODUCT_CATEGORY_BY_KEY.get(normalizeCategoryName(raw)) || raw
}

export const CATEGORIES = [
  { id: 'all', name: '전체상품' },
  { id: 'protein', name: '프로틴', group: '프로틴', subs: [
    { name: '프로틴 음료', db: [PRODUCT_CATEGORY.DRINK, PRODUCT_CATEGORY.DAIRY_ALTERNATIVE] },
    { name: '프로틴 바·스낵', db: [PRODUCT_CATEGORY.PROTEIN_SNACK] },
  ] },
  { id: 'meal', name: '간편식', group: '간편식', subs: [
    { name: '도시락·볶음밥', db: [PRODUCT_CATEGORY.MEAL] },
    { name: '닭가슴살·육류', db: [PRODUCT_CATEGORY.HIGH_PROTEIN_FOOD] },
  ] },
  { id: 'drink', name: '건강음료', group: '건강음료', subs: [
    { name: '대체유', db: [PRODUCT_CATEGORY.DAIRY_ALTERNATIVE] },
    { name: '기능성·스포츠', db: [PRODUCT_CATEGORY.DRINK] },
  ] },
  { id: 'snack', name: '건강간식', group: '건강간식', subs: [
    { name: '견과·건과류', db: [PRODUCT_CATEGORY.NUTS] },
    { name: '시리얼·그래놀라', db: [PRODUCT_CATEGORY.CEREAL] },
  ] },
  { id: 'supplement', name: '영양제', group: '영양제', subs: [
    { name: '비타민', kw: ['비타민'] },
    { name: '오메가3', kw: ['오메가'] },
    { name: '유산균', kw: ['유산균', '바이오틱스'] },
    { name: '기타', other: true },
  ] },
  { id: 'sauce', name: PRODUCT_CATEGORY.SAUCE, group: PRODUCT_CATEGORY.SAUCE },
  { id: 'health-food', name: '건강식품', group: '건강식품' },
]

// 실제 "단백질 제품"만 프로틴으로 인정 (고단백 tag 하나만으로 분류하지 않음)
const PROTEIN_PRODUCT_RE = /(프로틴|단백질|단백\s*100|WPI|WPC)/i

// 상품 → 상품 종류(그룹) 정규화. DB category + 상품명 기반.
export function productGroup(product) {
  const c = canonicalProductCategory(product.category)
  const name = product.name || ''
  if (c === PRODUCT_CATEGORY.SUPPLEMENT) return '영양제'
  if (c === PRODUCT_CATEGORY.SAUCE) return PRODUCT_CATEGORY.SAUCE
  if (c === PRODUCT_CATEGORY.HEALTH_FOOD) return '건강식품'
  if (c === PRODUCT_CATEGORY.MEAL || c === PRODUCT_CATEGORY.HIGH_PROTEIN_FOOD) return '간편식'
  if (c === PRODUCT_CATEGORY.NUTS || c === PRODUCT_CATEGORY.CEREAL) return '건강간식'
  // 프로틴바·건강간식 DB category는 프로틴 메뉴의 단일 하위 경로에서 모두 노출한다.
  if (c === PRODUCT_CATEGORY.PROTEIN_SNACK) return '프로틴'
  // 아래 DB 카테고리는 단백질 제품과 일반 웰니스 제품이 섞여 있어 상품명으로 분리한다.
  if (c === PRODUCT_CATEGORY.DRINK) return PROTEIN_PRODUCT_RE.test(name) ? '프로틴' : '건강음료'
  if (c === PRODUCT_CATEGORY.DAIRY_ALTERNATIVE) {
    if (/(아마씨유|플랙씨드\s*오일|flaxseed\s*oil)/i.test(name)) return '건강식품'
    if (PROTEIN_PRODUCT_RE.test(name)) return '프로틴'
    if (/(요거트|치즈|코티지)/.test(name) && !/(드링크|음료)/.test(name)) return '건강간식'
    return '건강음료'
  }
  return '기타'
}

// 카테고리 + 하위(드롭다운) 매칭 (상품 목록 필터에 사용)
export function matchCategory(product, catName, subName) {
  const categoryKey = normalizeCategoryName(catName)
  if (!categoryKey || categoryKey === normalizeCategoryName('전체상품')) return true
  const cat = CATEGORIES.find((item) => normalizeCategoryName(item.name) === categoryKey)
  if (!cat || !cat.group) return false
  if (productGroup(product) !== cat.group) return false
  const subKey = normalizeCategoryName(subName)
  if (cat.subs && subKey && subKey !== normalizeCategoryName('전체')) {
    const sub = cat.subs.find((item) => normalizeCategoryName(item.name) === subKey)
    if (!sub) return false
    if (sub.other) return !cat.subs.some(item => item.kw?.some(keyword =>
      normalizeCategoryName(product.name).includes(normalizeCategoryName(keyword))))
    if (sub.db) return sub.db.some((category) => (
      normalizeCategoryName(category) === normalizeCategoryName(product.category)
    ))
    if (sub.kw) {
      const productName = normalizeCategoryName(product.name)
      return sub.kw.some((keyword) => productName.includes(normalizeCategoryName(keyword)))
    }
  }
  return true
}

// 시간대별 웰빙 루틴 (중앙부 인터랙션)
export const ROUTINE = [
  {
    time: '08:00 AM',
    icon: 'sun',
    title: '모닝 바이탈 & 수분 보충',
    tag: '생체 리듬 활성화',
    desc: '공복 혈당을 자극하지 않는 천연 발효 콤부차와 활성형 멀티비타민으로 활기찬 하루를 시작하세요.',
    product: '데일리 올인원 멀티비타민 & 미네랄 23종',
  },
  {
    time: '12:30 PM',
    icon: 'leaf',
    title: '클린 탄단지 웰빙 런치',
    tag: '혈당 스파이크 방지',
    desc: '식이섬유가 풍부한 곤약밥과 저염 닭가슴살로 오후 식곤증 없는 깔끔한 포만감을 채웁니다.',
    product: '통닭가슴살 곤약 볶음밥 5종 패키지',
  },
  {
    time: '04:00 PM',
    icon: 'droplets',
    title: '무설탕 고단백 티타임',
    tag: '지속 가능한 에너지',
    desc: '정제 설탕 대신 스테비아와 통귀리로 구운 바삭한 식물성 프로틴 크런치로 리차징하세요.',
    product: '식물성 귀리 고단백 크런치 프로틴바',
  },
  {
    time: '07:30 PM',
    icon: 'clock',
    title: '편안한 회복을 위한 디너',
    tag: '소화 안정 & 회복',
    desc: '자연 숙성 저지방 소고기와 발효 효소로 취침 전 더부룩함 없는 편안한 소화를 도와줍니다.',
    product: '저염 숙성 소고기 큐브 스테이크',
  },
]

// 브랜드 가치 (신뢰 배너)
export const VALUES = [
  { icon: 'leaf', title: '상품 정보 중심', desc: '원재료와 영양성분을 한곳에서 확인하세요' },
  { icon: 'sliders', title: '나에게 맞는 조건', desc: '필요한 영양 조건으로 상품을 찾아보세요' },
  { icon: 'truck', title: '주문 상태 확인', desc: '결제 후 주문내역에서 배송 흐름을 확인하세요' },
]

// 포트폴리오 전용 샘플 후기. 실제 구매/리뷰/상품 DB와 무관한 표시 데이터다.
const SAMPLE_REVIEW_TEXT = {
  [PRODUCT_CATEGORY.HIGH_PROTEIN_FOOD]: [
    '단백질 챙길 때 식사에 곁들이기 편했어요. 간도 제 입에는 무난했습니다.',
    '식감은 생각했던 것과 조금 달랐지만 간편하게 먹기에는 괜찮았어요.',
    '바쁜 날 다른 반찬과 함께 먹기 좋았어요. 다음에도 몇 개 사두려고요.',
  ],
  [PRODUCT_CATEGORY.MEAL]: [
    '바쁜 날 한 끼 준비하는 시간을 줄일 수 있어서 좋았어요.',
    '먹고 나니 제법 든든했어요. 양은 제 기준에 조금 아쉬웠습니다.',
    '점심으로 챙겨 먹기 편하고 간도 부담스럽지 않았어요.',
  ],
  [PRODUCT_CATEGORY.PROTEIN_SNACK]: [
    '오후에 출출할 때 간식 대신 먹기 좋았어요. 맛도 무난해요.',
    '생각한 식감과는 조금 달랐지만 커피와 곁들이니 괜찮았어요.',
    '조금씩 챙겨 먹기 편해서 책상에 두고 먹고 있어요.',
  ],
  [PRODUCT_CATEGORY.CEREAL]: [
    '요거트에 곁들이니 식감이 더해져서 아침으로 잘 먹고 있어요.',
    '그냥 먹으면 제 입에는 조금 심심해요. 과일을 더하니 괜찮네요.',
    '아침에 조금씩 덜어 먹기 편하고 생각보다 든든했어요.',
  ],
  [PRODUCT_CATEGORY.DAIRY_ALTERNATIVE]: [
    '아침 식사에 곁들이기 좋았어요. 맛도 크게 부담스럽지 않아요.',
    '익숙한 제품과 맛이 조금 달라 처음에는 적응이 필요했어요.',
    '성분표를 비교해 보고 골랐어요. 평소 식단에 곁들이고 있습니다.',
  ],
  [PRODUCT_CATEGORY.DRINK]: [
    '외출할 때 챙겨 마시기 편했어요. 맛도 제 입에는 무난했어요.',
    '끝맛은 조금 취향을 탈 것 같아요. 차게 마시니 더 괜찮았습니다.',
    '당류 표시를 확인하고 골랐어요. 평소 마시던 음료 대신 가끔 먹어요.',
  ],
  proteinDrink: [
    '운동 후에 단백질 챙기기 편했어요. 맛도 생각보다 무난하네요.',
    '끝에 남는 단백질 맛은 조금 있어요. 차게 마시면 괜찮았습니다.',
    '따로 준비할 게 없어 운동 가방에 챙겨 다니기 좋았어요.',
  ],
  [PRODUCT_CATEGORY.NUTS]: [
    '오후 간식으로 조금씩 덜어 먹고 있어요. 맛도 무난했어요.',
    '식감은 예상과 조금 달랐어요. 요거트에 곁들이면 괜찮네요.',
    '출출할 때 한 줌씩 먹기 좋아서 자주 손이 가요.',
  ],
  [PRODUCT_CATEGORY.SUPPLEMENT]: [
    '섭취 방법 표시가 잘 보여서 처음 챙겨 먹기 편했어요.',
    '매일 챙기는 건 아직 익숙하지 않아요. 효과는 좀 더 지켜보려고요.',
    '포장이 깔끔하게 왔어요. 정해진 섭취량을 확인하며 먹고 있습니다.',
  ],
  [PRODUCT_CATEGORY.SAUCE]: [
    '평소 먹는 음식에 조금씩 곁들이니 맛에 변화를 주기 좋았어요.',
    '익숙한 제품과 맛이 달라서 처음에는 양을 조절하며 썼어요.',
    '한 번에 많이 쓰지 않아도 돼서 집에서 두고 먹기 괜찮아요.',
  ],
  [PRODUCT_CATEGORY.HEALTH_FOOD]: [
    '먹는 방법을 확인하고 평소 식단에 조금씩 더하고 있어요.',
    '익숙하지 않은 맛이라 처음에는 적은 양부터 먹어 보고 있어요.',
    '포장이 깔끔했고 보관 방법도 알아보기 쉬웠어요.',
  ],
  lowCalorie: [
    '칼로리 표시를 보고 골랐어요. 가볍게 먹고 싶을 때 괜찮네요.',
    '먹고 나니 생각보다 든든했어요. 맛은 평소 먹던 것보다 조금 심심해요.',
    '칼로리 부담을 줄이면서 식단에 변화를 주기 좋았어요.',
  ],
}

export function getSampleReviewSummary(productId) {
  const seed = Array.from(String(productId ?? '')).reduce((hash, char) => (
    (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0
  ), 0)
  return { averageRating: (43 + seed % 7) / 10, reviewCount: 12 + seed % 77 }
}

export function getSampleReviews(product) {
  const category = canonicalProductCategory(product.category)
  const kind = category === PRODUCT_CATEGORY.DRINK && /프로틴|WPI|단백질/i.test(product.name)
    ? 'proteinDrink'
    : /저칼로리/.test(product.name) && category !== PRODUCT_CATEGORY.SAUCE
      ? 'lowCalorie' : category
  const texts = SAMPLE_REVIEW_TEXT[kind] || SAMPLE_REVIEW_TEXT[PRODUCT_CATEGORY.HEALTH_FOOD]
  const { reviewCount } = getSampleReviewSummary(product.id)
  return [...texts, '포장이 흐트러지지 않고 도착했어요. 집에 두고 필요할 때 꺼내 먹고 있습니다.',
    '전체적으로 무난했어요. 가격은 조금 아쉬워서 다음에는 할인할 때 사려고요.'].map((content, index) => ({
    id: `${product.id}-sample-${index}`,
    author: ['김**', '박**', '이**', '최**', '정**'][(index + reviewCount) % 5],
    rating: index === 1 || index === 4 ? 4 : 5,
    content,
    date: `2026-08-${String(28 - index * 5 - reviewCount % 3).padStart(2, '0')}`,
  }))
}
