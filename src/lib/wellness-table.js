// 오늘의 웰빙 테이블의 비주얼·슬롯·요일별 고정 큐레이션 설정.
// hero는 특정 CareMarket 상품 패키지가 아닌, 상품군을 표현하는 라이프스타일 이미지다.
export const WELLNESS_TABLE_THEMES = [
  {
    id: 'protein',
    label: '고단백 밸런스',
    eyebrow: 'Protein-forward selection',
    description: '눈에 보이는 네 가지 고단백 식재료를 오늘의 상품으로 골라보세요.',
    visual: {
      image: 'https://bio-synergy.uk/cdn/shop/articles/no-logo-or-text_d6a57650-d566-4464-b97a-94b31792f1eb.png?v=1778686647&width=1500',
      objectPosition: '50% 50%',
      alt: '닭가슴살, 요거트, 견과류와 단백질 음료가 놓인 고단백 식단 이미지',
      slots: [
        { id: 'chicken', label: '닭가슴살', categories: ['닭가슴살·고단백 식품'], keywords: ['닭가슴살', '닭고기'], coordinates: { desktop: { x: 36, y: 76 }, mobile: { x: 33, y: 74 } } },
        { id: 'yogurt', label: '고단백 요거트', categories: ['유제품·대체유'], keywords: ['요거트', '코티지', '케피어'], minProtein: 8, coordinates: { desktop: { x: 60, y: 77 }, mobile: { x: 54, y: 67 } } },
        { id: 'proteinDrink', label: '프로틴 음료', categories: ['음료·프로틴음료'], keywords: ['프로틴', '단백질', 'WPI', 'WPC', '완두'], coordinates: { desktop: { x: 78, y: 76 }, mobile: { x: 76, y: 56 } } },
        { id: 'nuts', label: '견과 토핑', categories: ['견과·건과류'], keywords: ['견과', '아몬드', '호두', '캐슈', '마카다미아', '브라질너트'], minProtein: 4, coordinates: { desktop: { x: 61, y: 59 }, mobile: { x: 57, y: 57 } } },
      ],
    },
  },
  {
    id: 'lowSugar',
    label: '가벼운 저당',
    eyebrow: 'Light, low-sugar choice',
    description: '견과, 저당 음료, 가벼운 스낵과 그래놀라를 한 상에 담았습니다.',
    visual: {
      image: 'https://static.wixstatic.com/media/11062b_8d2c030f517240428b392a2567fd16c0~mv2.jpg/v1/fill/w_1000%2Ch_667%2Cal_c%2Cq_85%2Cusm_0.66_1.00_0.01/11062b_8d2c030f517240428b392a2567fd16c0~mv2.jpg',
      objectPosition: '50% 50%',
      alt: '그래놀라, 견과 스낵, 음료가 놓인 가벼운 아침 식사 이미지',
      slots: [
        { id: 'lowSugarDrink', label: '저당 음료', categories: ['음료·프로틴음료', '유제품·대체유'], keywords: ['무가당', '제로', '콤부차', '워터', '아미노', '프로틴', '우유', '밀크'], maxSugar: 5, coordinates: { desktop: { x: 75, y: 37 }, mobile: { x: 75, y: 50 } } },
        { id: 'granola', label: '시리얼 · 그래놀라', categories: ['시리얼·그래놀라'], keywords: ['시리얼', '그래놀라', '크런치'], maxSugar: 6, coordinates: { desktop: { x: 55, y: 59 }, mobile: { x: 58, y: 60 } } },
        { id: 'nuts', label: '견과류', categories: ['견과·건과류'], keywords: ['견과', '아몬드', '호두', '캐슈', '마카다미아', '브라질너트', '씨드'], maxSugar: 5, coordinates: { desktop: { x: 60, y: 54 }, mobile: { x: 34, y: 75 } } },
        { id: 'lightSnack', label: '저당 스낵', categories: ['프로틴바·건강간식'], keywords: ['곤약', '팝칩', '브라우니', '쿠키', '베이글'], maxSugar: 6, coordinates: { desktop: { x: 25, y: 22 }, mobile: { x: 24, y: 42 } } },
      ],
    },
  },
  {
    id: 'easy',
    label: '간편 웰니스',
    eyebrow: 'Easy wellness pantry',
    description: '도시락부터 건강 간식까지, 바로 챙겨 나가기 좋은 네 가지입니다.',
    visual: {
      image: 'https://irp.cdn-website.com/98adc116/dms3rep/multi/healthy-food-lunch-boxes-view_23-2149060415.jpeg',
      objectPosition: '50% 50%',
      alt: '도시락, 간편식, 음료와 견과 간식이 담긴 웰니스 런치박스 이미지',
      slots: [
        { id: 'lunchbox', label: '도시락', categories: ['도시락·간편식'], keywords: ['도시락', '볶음밥', '리조또', '덮밥', '솥밥', '플래터'], coordinates: { desktop: { x: 22, y: 13 }, mobile: { x: 23, y: 30 } } },
        { id: 'quickMeal', label: '랩 · 간편식', categories: ['도시락·간편식'], keywords: ['브리또', '또띠아'], coordinates: { desktop: { x: 14, y: 10 }, mobile: { x: 43, y: 78 } } },
        { id: 'drink', label: '웰니스 음료', categories: ['음료·프로틴음료', '유제품·대체유'], keywords: ['음료', '드링크', '워터', '콤부차', '프로틴', '라떼', '스무디', '주스'], coordinates: { desktop: { x: 87, y: 38 }, mobile: { x: 82, y: 37 } } },
        { id: 'snack', label: '건강 간식', categories: ['견과·건과류'], keywords: ['견과', '아몬드', '호두', '캐슈', '마카다미아', '브라질너트'], coordinates: { desktop: { x: 83, y: 70 }, mobile: { x: 85, y: 72 } } },
      ],
    },
  },
]

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일']

// 7일 × 3테마 = 21개. rotation은 각 visual slot 후보군의 고정 시작점이다.
export const WELLNESS_TABLE_CONFIGS = WEEKDAYS.flatMap((weekday, dayIndex) => (
  WELLNESS_TABLE_THEMES.map((theme, themeIndex) => ({
    id: `${weekday}-${theme.id}`,
    weekday,
    themeId: theme.id,
    rotation: dayIndex * WELLNESS_TABLE_THEMES.length + themeIndex,
  }))
))

export function getTodayWellnessConfig(date = new Date()) {
  const weekdayIndex = (date.getDay() + 6) % 7
  return WELLNESS_TABLE_CONFIGS.filter((config) => config.weekday === WEEKDAYS[weekdayIndex])
}
