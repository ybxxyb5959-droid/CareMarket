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
  SUPPLEMENT: '영양제·비타민',
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

// 상품 목업
export const PRODUCTS = [
  {
    id: 1,
    name: '린단백 100% 분리유청 WPI 프로틴 (초코맛 1kg)',
    brand: 'CARE LABS',
    price: 43900,
    originalPrice: 52000,
    rating: 4.9,
    reviewCount: 1240,
    isBest: true,
    isNew: false,
    origin: '국내 HACCP 청정 제조',
    cleanScore: 'Clean 98',
    category: '근육량 증가',
    tags: ['고단백', '저당', '클린라벨'],
    image:
      'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=800&auto=format&fit=crop&q=80',
    summary: '순수 WPI 단백질 92% 함유, 속 편한 미세 정제로 완성한 깔끔한 목넘김',
    nutrition: { servingSize: '1스쿱 (35g)', calories: 125, protein: 29, carbs: 1.5, fat: 0.5, sugar: 0.3, sodium: 95, special: 'BCAA 6,400mg · 글루타민 4,800mg 천연 아미노산' },
    allergens: ['대두', '우유'],
    caffeine: false,
    delivery: '내일(토) 아침 7시 전 신선도착',
  },
  {
    id: 2,
    name: '통닭가슴살 곤약 볶음밥 5종 패키지 (10팩)',
    brand: 'FARM POCKET',
    price: 28900,
    originalPrice: 35000,
    rating: 4.85,
    reviewCount: 890,
    isBest: true,
    isNew: false,
    origin: '국내산 무항생제 닭가슴살',
    cleanScore: 'Clean 96',
    category: '체중 관리',
    tags: ['저당', '고단백', '저염'],
    image:
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80',
    summary: '신선 채소와 곤약쌀로 완성한 265kcal의 든든하고 깨끗한 한 끼 식단',
    nutrition: { servingSize: '1팩 (200g)', calories: 265, protein: 24, carbs: 34, fat: 3.2, sugar: 1.2, sodium: 240, special: '보리·귀리 천연 식이섬유 6.2g' },
    allergens: ['닭고기', '대두', '밀'],
    caffeine: false,
    delivery: '친환경 아이스팩 안심 신선배송',
  },
  {
    id: 3,
    name: '데일리 올인원 멀티비타민 & 미네랄 23종 (60정)',
    brand: 'VITAL BOTANICS',
    price: 32000,
    originalPrice: 40000,
    rating: 4.95,
    reviewCount: 2310,
    isBest: true,
    isNew: false,
    origin: '자연 유래 건조효모 미네랄',
    cleanScore: 'Clean 100',
    category: '영양제 탐색',
    tags: ['클린라벨', '카페인 제외', '알레르기 제외'],
    image:
      'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=80',
    summary: '합성 착색료 제로, 활성형 비타민B군 8종과 안전성 공인 배합',
    nutrition: { servingSize: '1정 (1,200mg)', calories: 5, protein: 0, carbs: 1, fat: 0, sugar: 0, sodium: 0, special: '비타민B군 2000% 충족 · 식물성 효모 아연 12mg' },
    allergens: [],
    caffeine: false,
    delivery: '유리병 완충 종이패키지 안심포장',
  },
  {
    id: 4,
    name: '제로 알룰로스 레몬라임 스파클링 콤부차 (350ml x 12)',
    brand: 'PURE SPARK',
    price: 18900,
    originalPrice: 24000,
    rating: 4.75,
    reviewCount: 450,
    isBest: false,
    isNew: true,
    origin: '제주 유기농 녹차엽 발효',
    cleanScore: 'Clean 99',
    category: '체중 관리',
    tags: ['저당', '저염', '카페인 제외'],
    image:
      'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800&auto=format&fit=crop&q=80',
    summary: '설탕 0g 천연 발효 탄산, 9kcal로 가볍고 상쾌한 식물성 스파클링 티',
    nutrition: { servingSize: '1캔 (350ml)', calories: 9, protein: 0.2, carbs: 4.5, fat: 0, sugar: 0, sodium: 15, special: '천연 발효 알룰로스 4.5g · 프리바이오틱스 10억' },
    allergens: [],
    caffeine: false,
    delivery: '무료배송 · 재생지 전용 박스',
  },
  {
    id: 5,
    name: '식물성 귀리 고단백 크런치 프로틴바 (견과초코 12개입)',
    brand: 'GREEN HARVEST',
    price: 24500,
    originalPrice: 29000,
    rating: 4.88,
    reviewCount: 670,
    isBest: false,
    isNew: true,
    origin: '통귀리 & 식물성 완두단백',
    cleanScore: 'Clean 97',
    category: '식단 영양 관리',
    tags: ['고단백', '저당', '클린라벨'],
    image:
      'https://images.unsplash.com/photo-1571748982800-fa51082c2224?w=800&auto=format&fit=crop&q=80',
    summary: '유제품 없이 완두·쌀 단백질 15g, 식이섬유가 씹히는 웰빙 스낵',
    nutrition: { servingSize: '1개 (50g)', calories: 178, protein: 15, carbs: 18, fat: 4.8, sugar: 1.8, sodium: 110, special: '천연 스테비아 감미 · 불포화 오메가-3 풍부' },
    allergens: ['견과류', '대두'],
    caffeine: false,
    delivery: '2박스 구매 시 린넨 에코파우치 증정',
  },
  {
    id: 6,
    name: '저염 숙성 소고기 홍두깨살 큐브 스테이크 (150g x 5팩)',
    brand: 'CLEAN MEAT LAB',
    price: 33900,
    originalPrice: 42000,
    rating: 4.92,
    reviewCount: 1120,
    isBest: true,
    isNew: false,
    origin: '자연 방목 목초육 웻에이징',
    cleanScore: 'Clean 99',
    category: '근육량 증가',
    tags: ['고단백', '저염', '저당'],
    image:
      'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=800&auto=format&fit=crop&q=80',
    summary: '지방을 덜어낸 순수 단백질 34g, 천일염 극미량으로 완성한 육즙',
    nutrition: { servingSize: '1팩 (150g)', calories: 195, protein: 34, carbs: 0.8, fat: 2.1, sugar: 0, sodium: 140, special: '자연 숙성 철분 & L-카르니틴 농축' },
    allergens: ['쇠고기'],
    caffeine: false,
    delivery: '친환경 물 100% 보랭제 포장',
  },
  {
    id: 7,
    name: 'rTG 초임계 고순도 오메가-3 1000mg + 비타민D (60캡슐)',
    brand: 'VITAL BOTANICS',
    price: 36000,
    originalPrice: 45000,
    rating: 4.94,
    reviewCount: 3100,
    isBest: true,
    isNew: false,
    origin: '남태평양 소형어종 초임계 추출',
    cleanScore: 'Clean 100',
    category: '영양제 탐색',
    tags: ['카페인 제외', '알레르기 제외', '클린라벨'],
    image:
      'https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?w=800&auto=format&fit=crop&q=80',
    summary: '잔류용매 0% 초임계 추출, 중금속 걱정 없이 비린내를 잡은 고순도 오메가',
    nutrition: { servingSize: '1캡슐 (1,150mg)', calories: 10, protein: 0, carbs: 0, fat: 1.1, sugar: 0, sodium: 0, special: '생체 흡수율 높은 rTG 오메가 80% 이상 농축' },
    allergens: ['갑각류'],
    caffeine: false,
    delivery: '직사광선 차단 브라운 보틀 패키지',
  },
  {
    id: 8,
    name: '스마트 효소 밸런스 & 17종 생유산균 포켓 (30포)',
    brand: 'CARE LABS',
    price: 21900,
    originalPrice: 28000,
    rating: 4.82,
    reviewCount: 520,
    isBest: false,
    isNew: true,
    origin: '국내산 15곡 발효 효소',
    cleanScore: 'Clean 98',
    category: '식단 영양 관리',
    tags: ['저당', '카페인 제외', '클린라벨'],
    image:
      'https://images.unsplash.com/photo-1559181567-c3190ca9959b?w=800&auto=format&fit=crop&q=80',
    summary: '정제 효소 인위적 첨가 0%, 순수 곡물 발효로 속 편한 식후 루틴',
    nutrition: { servingSize: '1포 (3g)', calories: 12, protein: 0.5, carbs: 2.3, fat: 0.1, sugar: 0.4, sodium: 8, special: 'α-아밀라아제 600,000unit 보장' },
    allergens: ['대두', '밀'],
    caffeine: false,
    delivery: '내일 아침 문 앞 신선배송',
  },
]

export const INITIAL_ORDERS = [
  {
    id: 'ORD-20260902-8821',
    date: '2026. 09. 02  14:22',
    status: '배송중',
    active: true,
    totalAmount: 72800,
    items: [
      { name: '린단백 100% 분리유청 WPI 프로틴 (초코맛 1kg)', count: 1, price: 43900 },
      { name: '통닭가슴살 곤약 볶음밥 5종 패키지', count: 1, price: 28900 },
    ],
    tracker: '우체국 안심택배 6821-9920-1123',
  },
  {
    id: 'ORD-20260824-3401',
    date: '2026. 08. 24  10:15',
    status: '배송완료',
    active: false,
    totalAmount: 32000,
    items: [{ name: '데일리 올인원 멀티비타민 & 미네랄 23종', count: 1, price: 32000 }],
    tracker: 'CJ대한통운 1024-5590-3341',
  },
]

export const INITIAL_USER = {
  name: '김케어',
  email: 'kimcare@caremarket.kr',
  tier: 'WELL-BEING VIP',
  points: 5200,
  coupons: 4,
}

export const REVIEWS = [
  { user: '이*정', goal: '식단 영양 관리', text: '자극적이지 않고 담백해서 식사 후에도 속이 정말 편안합니다. 성분표가 정직해서 믿음이 가요.', date: '2026.09.02' },
  { user: '강*민', goal: '체중 관리', text: '당류 걱정 없이 단맛을 즐길 수 있어서 다이어트 스트레스가 확 줄었습니다!', date: '2026.08.30' },
  { user: '박*현', goal: '근육량 증가', text: '물에 잘 녹고 텁텁하지 않아요. 운동 후 회복 속도가 확실히 다릅니다.', date: '2026.08.27' },
]
