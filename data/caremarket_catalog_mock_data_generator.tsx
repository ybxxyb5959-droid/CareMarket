import React, { useState, useMemo } from 'react';
import { 
  Search, SlidersHorizontal, Heart, ShoppingBag, X, Copy, Check, 
  Sparkles, Flame, ShieldAlert, Coffee, ArrowUpDown, 
  Info, ExternalLink, RefreshCw
} from 'lucide-react';

// ============================================================================
// 1. 100개 가상 시연용 상품 Mock 데이터 (Supabase seed 호환 데이터셋)
// ============================================================================
const PRODUCTS_DATA = [
  // 1. 닭가슴살·고단백 식품 (1~10)
  {
    id: 1,
    name: "리얼 스팀 수비드 닭가슴살 오리지널 100g",
    brand: "FIT MEAL",
    category: "닭가슴살·고단백 식품",
    price: 1900,
    original_price: 2500,
    stock: 120,
    summary: "촉촉한 수비드 공법으로 육즙을 가둔 저염 저지방 닭가슴살",
    serving_size: "1팩 (100g)",
    calories: 115,
    protein: 26,
    carbs: 0.5,
    fat: 1.2,
    sugar: 0,
    sodium: 45,
    allergens: ["닭고기"],
    contains_caffeine: false,
    main_ingredients: ["국내산 닭가슴살 99%", "천일염"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Minimalist food photography of tender sliced sous-vide chicken breast on a light ceramic plate, soft daylight, fresh rosemary sprig",
    rating: 4.9,
    review_count: 852,
    badges: ["BEST", "고단백", "저염"]
  },
  {
    id: 2,
    name: "그릴드 훈제 닭가슴살 슬라이스 칠리페퍼 120g",
    brand: "FIT MEAL",
    category: "닭가슴살·고단백 식품",
    price: 2300,
    original_price: 2900,
    stock: 85,
    summary: "은은한 참나무 훈연향에 매콤한 칠리 시즈닝을 더한 슬라이스",
    serving_size: "1팩 (120g)",
    calories: 140,
    protein: 28,
    carbs: 2.1,
    fat: 2.0,
    sugar: 1.2,
    sodium: 220,
    allergens: ["닭고기", "대두"],
    contains_caffeine: false,
    main_ingredients: ["국내산 닭가슴살 94%", "칠리시즈닝", "참나무훈액"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Smoked grilled chicken breast sliced on rustic cutting board, paprika flakes, bright clean commercial food photography",
    rating: 4.7,
    review_count: 420,
    badges: ["고단백"]
  },
  {
    id: 3,
    name: "한입 닭가슴살 볼 치즈 쏙쏙 100g",
    brand: "CARE LABS",
    category: "닭가슴살·고단백 식품",
    price: 2200,
    original_price: 2800,
    stock: 60,
    summary: "쫄깃한 닭가슴살 볼 안에 저지방 모짜렐라 치즈가 가득",
    serving_size: "1팩 (100g)",
    calories: 155,
    protein: 22,
    carbs: 4.0,
    fat: 5.5,
    sugar: 1.0,
    sodium: 260,
    allergens: ["닭고기", "우유", "대두"],
    contains_caffeine: false,
    main_ingredients: ["닭가슴살 78%", "자연치즈 15%", "양파"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1529042410759-befb1204b468?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Clean photo of healthy steamed chicken meatballs with melting cheese inside, neutral cream background",
    rating: 4.8,
    review_count: 530,
    badges: ["인기"]
  },
  {
    id: 4,
    name: "촉촉 닭가슴살 소시지 바질페스토 70g",
    brand: "FARM POCKET",
    category: "닭가슴살·고단백 식품",
    price: 1800,
    original_price: 2200,
    stock: 140,
    summary: "돈육 소시지 식감을 그대로 살린 생바질 풍미의 웰빙 소시지",
    serving_size: "1개 (70g)",
    calories: 105,
    protein: 15,
    carbs: 2.0,
    fat: 3.8,
    sugar: 0.8,
    sodium: 180,
    allergens: ["닭고기"],
    contains_caffeine: false,
    main_ingredients: ["닭가슴살 85%", "콜라겐케이싱", "생바질페스토"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1585325701165-351af916e581?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Gourmet chicken sausage on a warm ceramic plate with herb garnish, bright minimalist commercial lighting",
    rating: 4.6,
    review_count: 290,
    badges: ["저당"]
  },
  {
    id: 5,
    name: "순수 단백 100% 동결건조 닭가슴살 칩 30g",
    brand: "WELL BITE",
    category: "닭가슴살·고단백 식품",
    price: 3200,
    original_price: 3900,
    stock: 45,
    summary: "기름 없이 오직 열풍과 진공으로 바삭하게 구워낸 스낵형 고단백 칩",
    serving_size: "1봉 (30g)",
    calories: 110,
    protein: 24,
    carbs: 0.2,
    fat: 1.5,
    sugar: 0,
    sodium: 90,
    allergens: ["닭고기"],
    contains_caffeine: false,
    main_ingredients: ["국내산 닭가슴살 99.5%"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Crispy dehydrated chicken protein crisps in a modern glass bowl, light airy aesthetic",
    rating: 4.5,
    review_count: 140,
    badges: ["무설탕", "고단백"]
  },
  {
    id: 6,
    name: "블랙페퍼 안심 스테이크 130g",
    brand: "PURE FARM",
    category: "닭가슴살·고단백 식품",
    price: 2700,
    original_price: 3400,
    stock: 90,
    summary: "통후추의 알싸함이 살아있는 닭안심 부위 초신선 스테이크",
    serving_size: "1팩 (130g)",
    calories: 145,
    protein: 30,
    carbs: 1.0,
    fat: 1.8,
    sugar: 0.2,
    sodium: 195,
    allergens: ["닭고기"],
    contains_caffeine: false,
    main_ingredients: ["닭안심 96%", "통후추분말", "천일염"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Seared chicken tenderloin steak with cracked black peppercorns, premium food package staging",
    rating: 4.9,
    review_count: 610,
    badges: ["고단백", "BEST"]
  },
  {
    id: 7,
    name: "비건 대두단백 패티 가든 오리지널 110g",
    brand: "GREEN TABLE",
    category: "닭가슴살·고단백 식품",
    price: 3500,
    original_price: 4200,
    stock: 55,
    summary: "식물성 대두단백으로 빚어낸 육즙 가득한 친환경 웰빙 패티",
    serving_size: "1팩 (110g)",
    calories: 180,
    protein: 21,
    carbs: 8.0,
    fat: 6.5,
    sugar: 1.5,
    sodium: 310,
    allergens: ["대두", "밀"],
    contains_caffeine: false,
    main_ingredients: ["분리대두단백 45%", "비트즙", "코코넛오일"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1520072959219-c595dc870360?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Plant-based soy meat patty on white plate, herbs, fresh vegan lifestyle product shot",
    rating: 4.4,
    review_count: 180,
    badges: ["비건", "고단백"]
  },
  {
    id: 8,
    name: "저염 닭가슴살 만두 메밀피 168g",
    brand: "BALANCE ON",
    category: "닭가슴살·고단백 식품",
    price: 3900,
    original_price: 4800,
    stock: 70,
    summary: "밀가루 대신 메밀로 빚은 피에 닭가슴살과 부추를 꽉 채운 만두",
    serving_size: "1팩 (168g)",
    calories: 235,
    protein: 20,
    carbs: 26,
    fat: 4.5,
    sugar: 2.1,
    sodium: 290,
    allergens: ["닭고기", "대두", "밀"],
    contains_caffeine: false,
    main_ingredients: ["닭가슴살 42%", "메밀가루 18%", "부추", "두부"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Delicate steamed buckwheat dumplings on bamboo steamer, bright warm natural light",
    rating: 4.7,
    review_count: 340,
    badges: ["균형식단"]
  },
  {
    id: 9,
    name: "프로틴 흰살생선 대구살 큐브 120g",
    brand: "DAILY ROOT",
    category: "닭가슴살·고단백 식품",
    price: 4200,
    original_price: 5000,
    stock: 40,
    summary: "닭가슴살이 물릴 때 즐기는 순수 자연산 흰살생선의 맑은 고단백",
    serving_size: "1팩 (120g)",
    calories: 105,
    protein: 23,
    carbs: 0.1,
    fat: 0.8,
    sugar: 0,
    sodium: 110,
    allergens: [],
    contains_caffeine: false,
    main_ingredients: ["러시아산 대구살 99%", "정제소금"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Fresh white fish fillets lightly grilled on ceramic tableware, lemon wedge, healthy eating",
    rating: 4.8,
    review_count: 215,
    badges: ["저지방"]
  },
  {
    id: 10,
    name: "부드러운 소고기 우둔살 슬라이스 100g",
    brand: "CARE LABS",
    category: "닭가슴살·고단백 식품",
    price: 4900,
    original_price: 5900,
    stock: 50,
    summary: "지방을 꼼꼼히 걷어낸 신선한 우둔살을 부드럽게 숙성한 고단백 팩",
    serving_size: "1팩 (100g)",
    calories: 135,
    protein: 27,
    carbs: 0,
    fat: 2.8,
    sugar: 0,
    sodium: 85,
    allergens: ["쇠고기"],
    contains_caffeine: false,
    main_ingredients: ["소고기 우둔살 99%"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Lean tender beef slices neatly prepared on ivory plate, soft natural studio lighting",
    rating: 4.9,
    review_count: 490,
    badges: ["고단백", "저염"]
  },

  // 2. 도시락·간편식 (11~20)
  {
    id: 11,
    name: "저당 곤약 현미 닭가슴살 볶음밥 도시락 250g",
    brand: "FIT MEAL",
    category: "도시락·간편식",
    price: 4900,
    original_price: 5800,
    stock: 95,
    summary: "알곤약 40% 함유로 칼로리는 확 낮추고 포만감은 오래 지속되는 한 끼",
    serving_size: "1팩 (250g)",
    calories: 310,
    protein: 24,
    carbs: 42,
    fat: 4.5,
    sugar: 1.8,
    sodium: 320,
    allergens: ["닭고기", "대두", "계란"],
    contains_caffeine: false,
    main_ingredients: ["현미 35%", "알곤약 35%", "닭가슴살 20%", "계란후라이"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Healthy colorful meal prep lunch box with brown rice, grilled chicken breast and broccoli, top view",
    rating: 4.8,
    review_count: 980,
    badges: ["BEST", "저당"]
  },
  {
    id: 12,
    name: "퀴노아 렌틸콩 샐러드 보울 & 발사믹 210g",
    brand: "GREEN TABLE",
    category: "도시락·간편식",
    price: 5800,
    original_price: 6800,
    stock: 45,
    summary: "슈퍼곡물 퀴노아와 렌틸콩, 신선한 베이비 채소가 어우러진 비건 샐러드",
    serving_size: "1팩 (210g)",
    calories: 220,
    protein: 9,
    carbs: 34,
    fat: 5.0,
    sugar: 3.5,
    sodium: 140,
    allergens: [],
    contains_caffeine: false,
    main_ingredients: ["퀴노아 30%", "렌틸콩 25%", "케일", "발사믹드레싱"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Fresh superfood quinoa and lentil salad bowl with colorful greens, sunlit tabletop",
    rating: 4.7,
    review_count: 310,
    badges: ["저염", "비건"]
  },
  {
    id: 13,
    name: "소고기 우둔살 & 구운 야채 클린 도시락 280g",
    brand: "BALANCE ON",
    category: "도시락·간편식",
    price: 6500,
    original_price: 7900,
    stock: 60,
    summary: "저지방 소고기 우둔살과 단호박, 아스파라거스를 오븐에 담백하게 구운 식단",
    serving_size: "1팩 (280g)",
    calories: 360,
    protein: 32,
    carbs: 38,
    fat: 7.2,
    sugar: 2.9,
    sodium: 280,
    allergens: ["쇠고기", "대두"],
    contains_caffeine: false,
    main_ingredients: ["소우둔살 30%", "단호박 25%", "귀리밥 30%", "아스파라거스"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1547496502-affa22d38842?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Balanced meal prep container with tender lean beef cuts, roasted pumpkin and green asparagus",
    rating: 4.9,
    review_count: 740,
    badges: ["고단백"]
  },
  {
    id: 14,
    name: "컬리플라워 라이스 두부 버섯 덮밥 230g",
    brand: "GREEN TABLE",
    category: "도시락·간편식",
    price: 4700,
    original_price: 5500,
    stock: 75,
    summary: "쌀 대신 컬리플라워를 잘게 다져 탄수화물을 1/5로 줄인 라이트 덮밥",
    serving_size: "1팩 (230g)",
    calories: 195,
    protein: 14,
    carbs: 16,
    fat: 8.0,
    sugar: 1.2,
    sodium: 260,
    allergens: ["대두", "밀"],
    contains_caffeine: false,
    main_ingredients: ["컬리플라워 50%", "국산콩두부 25%", "표고버섯 15%"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Keto friendly cauliflower rice bowl with grilled tofu cubes and mushrooms, soft daylight",
    rating: 4.6,
    review_count: 230,
    badges: ["저탄수", "저당"]
  },
  {
    id: 15,
    name: "단호박 닭가슴살 영양솥밥 브리또 140g",
    brand: "FARM POCKET",
    category: "도시락·간편식",
    price: 3800,
    original_price: 4500,
    stock: 110,
    summary: "간편하게 한 손에 들고 먹는 통밀 또띠아 속 달콤한 단호박과 닭가슴살",
    serving_size: "1개 (140g)",
    calories: 245,
    protein: 18,
    carbs: 32,
    fat: 4.8,
    sugar: 3.1,
    sodium: 310,
    allergens: ["밀", "닭고기", "우유"],
    contains_caffeine: false,
    main_ingredients: ["통밀또띠아 30%", "닭가슴살 35%", "단호박무스 20%"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Halved healthy whole wheat wrap burrito filled with grilled chicken and roasted pumpkin, clean background",
    rating: 4.8,
    review_count: 510,
    badges: ["간편식"]
  },
  {
    id: 16,
    name: "저염 맑은 닭곰탕 곤약국수 320g",
    brand: "DAILY ROOT",
    category: "도시락·간편식",
    price: 4600,
    original_price: 5400,
    stock: 50,
    summary: "진하게 우려낸 닭안심 육수에 냄새 없는 해초 곤약면을 말아낸 힐링 식단",
    serving_size: "1팩 (320g)",
    calories: 140,
    protein: 17,
    carbs: 8.5,
    fat: 2.2,
    sugar: 0.5,
    sodium: 180,
    allergens: ["닭고기"],
    contains_caffeine: false,
    main_ingredients: ["닭안심육수 60%", "해초곤약면 30%", "대파"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Clear Asian broth soup with shirataki konjac noodles and sliced chicken garnish in a clean white porcelain bowl",
    rating: 4.5,
    review_count: 195,
    badges: ["저염", "저칼로리"]
  },
  {
    id: 17,
    name: "수비드 연어 스테이크 & 보리 리조또 260g",
    brand: "WELL BITE",
    category: "도시락·간편식",
    price: 7900,
    original_price: 9200,
    stock: 35,
    summary: "오메가3가 풍부한 프리미엄 연어 필렛과 톡톡 터지는 보리의 고소한 식감",
    serving_size: "1팩 (260g)",
    calories: 395,
    protein: 29,
    carbs: 35,
    fat: 14.5,
    sugar: 1.8,
    sodium: 340,
    allergens: ["우유"],
    contains_caffeine: false,
    main_ingredients: ["노르웨이산 연어 35%", "찰보리 30%", "탈지우유"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Gourmet grilled salmon steak over barley risotto on minimalist stone plate",
    rating: 4.9,
    review_count: 420,
    badges: ["오메가3", "고단백"]
  },
  {
    id: 18,
    name: "단백질 듬뿍 오트밀 닭가슴살 영양죽 280g",
    brand: "CARE LABS",
    category: "도시락·간편식",
    price: 4300,
    original_price: 5100,
    stock: 80,
    summary: "속 편한 롤드오트 귀리와 잘게 찢은 닭가슴살을 부드럽게 끓여낸 아침 보양죽",
    serving_size: "1팩 (280g)",
    calories: 210,
    protein: 20,
    carbs: 25,
    fat: 3.1,
    sugar: 0.9,
    sodium: 160,
    allergens: ["닭고기"],
    contains_caffeine: false,
    main_ingredients: ["오트밀귀리 40%", "닭가슴살 35%", "참기름"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Warm savory oatmeal porridge with shredded chicken in a modern minimalist ceramic bowl",
    rating: 4.8,
    review_count: 360,
    badges: ["속편한", "저염"]
  },
  {
    id: 19,
    name: "지중해식 구운 병아리콩 & 가지 그라탕 220g",
    brand: "GREEN TABLE",
    category: "도시락·간편식",
    price: 5200,
    original_price: 6100,
    stock: 40,
    summary: "단백질과 식이섬유가 풍부한 병아리콩과 올리브유에 구운 가지의 조화",
    serving_size: "1팩 (220g)",
    calories: 240,
    protein: 11,
    carbs: 30,
    fat: 7.5,
    sugar: 3.2,
    sodium: 250,
    allergens: [],
    contains_caffeine: false,
    main_ingredients: ["병아리콩 40%", "구운가지 30%", "토마토퓨레"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Mediterranean chickpea and roasted eggplant bake in single-serve dish, rosemary sprig",
    rating: 4.6,
    review_count: 155,
    badges: ["비건"]
  },
  {
    id: 20,
    name: "고구마 닭가슴살 소시지 플래터 도시락 270g",
    brand: "FIT MEAL",
    category: "도시락·간편식",
    price: 5300,
    original_price: 6200,
    stock: 105,
    summary: "호박고구마 큐브와 탱글한 닭가슴살 소시지, 브로콜리가 담긴 클래식 린매스 식단",
    serving_size: "1팩 (270g)",
    calories: 330,
    protein: 26,
    carbs: 45,
    fat: 4.0,
    sugar: 4.5,
    sodium: 270,
    allergens: ["닭고기"],
    contains_caffeine: false,
    main_ingredients: ["호박고구마 45%", "닭가슴살소시지 35%", "브로콜리"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Prepped healthy lunch tray with sweet potato cubes, steamed chicken sausage and vegetables",
    rating: 4.8,
    review_count: 670,
    badges: ["인기", "고단백"]
  },

  // 3. 프로틴바·건강간식 (21~30)
  {
    id: 21,
    name: "제로슈가 크런치 카카오 프로틴바 50g",
    brand: "CARE LABS",
    category: "프로틴바·건강간식",
    price: 2400,
    original_price: 3000,
    stock: 200,
    summary: "당류 0g, 알룰로스로 빚어낸 진한 다크초콜릿 크런치 프로틴 스낵",
    serving_size: "1개 (50g)",
    calories: 165,
    protein: 18,
    carbs: 16,
    fat: 5.5,
    sugar: 0,
    sodium: 95,
    allergens: ["우유", "대두"],
    contains_caffeine: false,
    main_ingredients: ["분리유청단백 WPI", "알룰로스", "카카오매스", "대두단백너겟"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1622484216850-25255476a6cf?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Dark chocolate crispy protein bar broken in half showing chewy protein core, bright neutral studio",
    rating: 4.9,
    review_count: 1420,
    badges: ["BEST", "저당", "고단백"]
  },
  {
    id: 22,
    name: "고소한 피넛버터 오트 프로틴 쿠키 60g",
    brand: "WELL BITE",
    category: "프로틴바·건강간식",
    price: 2600,
    original_price: 3200,
    stock: 130,
    summary: "밀가루 없이 볶은 땅콩 100% 버터와 귀리로 구워낸 단백질 쿠키",
    serving_size: "1개 (60g)",
    calories: 220,
    protein: 15,
    carbs: 18,
    fat: 9.8,
    sugar: 2.1,
    sodium: 120,
    allergens: ["견과류", "우유", "계란"],
    contains_caffeine: false,
    main_ingredients: ["땅콩버터 35%", "귀리가루", "유청단백질", "에리스리톨"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Thick soft baked peanut butter protein cookie with nut bits on parchment paper, warm lighting",
    rating: 4.7,
    review_count: 610,
    badges: ["저당"]
  },
  {
    id: 23,
    name: "구운 병아리콩 스낵 바베큐맛 40g",
    brand: "GREEN TABLE",
    category: "프로틴바·건강간식",
    price: 1900,
    original_price: 2400,
    stock: 150,
    summary: "기름에 튀기지 않고 오븐에 바삭하게 구운 천연 식물성 고식이섬유 스낵",
    serving_size: "1봉 (40g)",
    calories: 145,
    protein: 8,
    carbs: 22,
    fat: 2.8,
    sugar: 1.5,
    sodium: 170,
    allergens: ["대두"],
    contains_caffeine: false,
    main_ingredients: ["병아리콩 88%", "바베큐맛시즈닝", "해바라기유"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Crunchy roasted chickpeas dusted with smoked spice in a ceramic snack dish",
    rating: 4.5,
    review_count: 280,
    badges: ["비건", "식이섬유"]
  },
  {
    id: 24,
    name: "제주 말차 화이트 청크 프로틴바 50g",
    brand: "BALANCE ON",
    category: "프로틴바·건강간식",
    price: 2500,
    original_price: 3100,
    stock: 90,
    summary: "쌉싸름한 유기농 제주 말차와 무설탕 화이트초코칩의 환상적인 조합",
    serving_size: "1개 (50g)",
    calories: 170,
    protein: 16,
    carbs: 17,
    fat: 5.2,
    sugar: 1.1,
    sodium: 85,
    allergens: ["우유", "대두"],
    contains_caffeine: true,
    main_ingredients: ["유청단백질", "유기농제주말차 6%", "무설탕화이트초콜릿칩"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Green matcha energy protein bar styled with green tea powder in small glass bowl, crisp lighting",
    rating: 4.8,
    review_count: 530,
    badges: ["말차함유", "저당"]
  },
  {
    id: 25,
    name: "프로틴 현미 곤약 팝칩 치즈맛 35g",
    brand: "DAILY ROOT",
    category: "프로틴바·건강간식",
    price: 2100,
    original_price: 2600,
    stock: 120,
    summary: "밀가루 0%! 바삭하게 팝핑한 현미와 곤약에 체다치즈 분말을 입힌 칩",
    serving_size: "1봉 (35g)",
    calories: 130,
    protein: 10,
    carbs: 19,
    fat: 2.1,
    sugar: 0.8,
    sodium: 190,
    allergens: ["우유", "대두"],
    contains_caffeine: false,
    main_ingredients: ["유기농현미 50%", "곤약분말 20%", "분리대두단백 20%", "체다치즈분말"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Light puffed grain chips in a stylish bowl, modern healthy snack photography",
    rating: 4.6,
    review_count: 340,
    badges: ["글루텐FREE"]
  },
  {
    id: 26,
    name: "리얼 에스프레소 에너지 카페인 프로틴바 45g",
    brand: "CARE LABS",
    category: "프로틴바·건강간식",
    price: 2600,
    original_price: 3200,
    stock: 75,
    summary: "천연 과라나 추출 카페인 75mg 함유로 운동 전 활력을 채우는 단백질바",
    serving_size: "1개 (45g)",
    calories: 155,
    protein: 17,
    carbs: 14,
    fat: 4.8,
    sugar: 1.0,
    sodium: 105,
    allergens: ["우유", "대두"],
    contains_caffeine: true,
    main_ingredients: ["분리유청단백", "에스프레소농축액", "과라나추출분말"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1576618148400-f54bed99fcfd?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Coffee mocha fitness energy bar next to dark roasted coffee beans on light wood texture",
    rating: 4.8,
    review_count: 410,
    badges: ["카페인포함", "고단백"]
  },
  {
    id: 27,
    name: "비건 글루텐프리 블랙빈 브라우니 60g",
    brand: "GREEN TABLE",
    category: "프로틴바·건강간식",
    price: 3200,
    original_price: 3900,
    stock: 65,
    summary: "국산 서리태 검은콩과 다크 카카오로 만든 꾸덕하고 진한 비건 브라우니",
    serving_size: "1개 (60g)",
    calories: 190,
    protein: 12,
    carbs: 22,
    fat: 6.8,
    sugar: 2.8,
    sodium: 80,
    allergens: ["대두"],
    contains_caffeine: false,
    main_ingredients: ["국산검은콩가루 40%", "카카오분말 25%", "대추야자시럽"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1589218436045-ee320057f443?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Fudge vegan chocolate brownie square dusted with raw cocoa, clean culinary photography",
    rating: 4.7,
    review_count: 320,
    badges: ["비건", "글루텐FREE"]
  },
  {
    id: 28,
    name: "프로틴 베이크드 베이글 칩 허니버터맛 45g",
    brand: "WELL BITE",
    category: "프로틴바·건강간식",
    price: 2400,
    original_price: 2900,
    stock: 140,
    summary: "단백질 통밀 베이글을 얇게 썰어 오븐에 두 번 구워낸 파삭한 베이글칩",
    serving_size: "1봉 (45g)",
    calories: 175,
    protein: 11,
    carbs: 24,
    fat: 3.5,
    sugar: 3.0,
    sodium: 160,
    allergens: ["밀", "우유", "대두"],
    contains_caffeine: false,
    main_ingredients: ["통밀베이글 75%", "유청단백너겟", "허니버터시즈닝"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Golden crisp baked bagel chips in an organic stoneware bowl",
    rating: 4.6,
    review_count: 480,
    badges: ["인기간식"]
  },
  {
    id: 29,
    name: "제로 알룰로스 단백질 젤리 청포도맛 50g",
    brand: "FARM POCKET",
    category: "프로틴바·건강간식",
    price: 2200,
    original_price: 2800,
    stock: 90,
    summary: "당류 0g의 상큼 쫄깃함! 저분자 피쉬콜라겐과 단백질이 담긴 과즙 젤리",
    serving_size: "1봉 (50g)",
    calories: 75,
    protein: 10,
    carbs: 12,
    fat: 0,
    sugar: 0,
    sodium: 25,
    allergens: [],
    contains_caffeine: false,
    main_ingredients: ["청포도농축액", "피쉬콜라겐펩타이드", "알룰로스", "젤라틴"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Glistening green grape gummy jellies on transparent saucer, bright minimalist photography",
    rating: 4.8,
    review_count: 730,
    badges: ["무설탕", "콜라겐"]
  },
  {
    id: 30,
    name: "산양유 프로틴 웨이퍼 초코 38g",
    brand: "DAILY ROOT",
    category: "프로틴바·건강간식",
    price: 2300,
    original_price: 2800,
    stock: 80,
    summary: "네덜란드산 산양유 단백질로 채운 부드러운 웨하스 스낵",
    serving_size: "1개 (38g)",
    calories: 160,
    protein: 12,
    carbs: 15,
    fat: 6.2,
    sugar: 1.8,
    sodium: 90,
    allergens: ["우유", "밀", "대두"],
    contains_caffeine: false,
    main_ingredients: ["산양유단백분말 25%", "밀가루", "식물성유지", "코코아분말"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Layered chocolate protein wafer snacks stacked neatly, studio lighting",
    rating: 4.7,
    review_count: 390,
    badges: ["속편한단백질"]
  },

  // 4. 시리얼·그래놀라 (31~40)
  {
    id: 31,
    name: "무가당 고단백 수제 그래놀라 오리지널 400g",
    brand: "GREEN TABLE",
    category: "시리얼·그래놀라",
    price: 13900,
    original_price: 16900,
    stock: 80,
    summary: "설탕 없이 오직 귀리, 아몬드, 호박씨를 자작나무 시럽에 뭉쳐 구운 프리미엄 그래놀라",
    serving_size: "1회 (40g)",
    calories: 175,
    protein: 8,
    carbs: 21,
    fat: 6.5,
    sugar: 1.2,
    sodium: 40,
    allergens: ["견과류"],
    contains_caffeine: false,
    main_ingredients: ["유기농귀리 50%", "아몬드 20%", "호박씨 15%", "자일리톨"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1517093708149-14a00445d4c2?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Handcrafted oat granola clusters with whole roasted almonds in artisan ceramic bowl, morning sunshine",
    rating: 4.9,
    review_count: 1120,
    badges: ["BEST", "저당", "비건"]
  },
  {
    id: 32,
    name: "카카오 닙스 고단백 롤드오트 그래놀라 350g",
    brand: "CARE LABS",
    category: "시리얼·그래놀라",
    price: 12500,
    original_price: 15500,
    stock: 65,
    summary: "식물성 완두단백 크런치와 쌉싸름한 페루산 카카오닙스가 듬뿍",
    serving_size: "1회 (40g)",
    calories: 180,
    protein: 11,
    carbs: 22,
    fat: 5.8,
    sugar: 2.0,
    sodium: 65,
    allergens: ["견과류", "대두"],
    contains_caffeine: false,
    main_ingredients: ["압착귀리 45%", "완두단백크리스피 25%", "카카오닙스 15%"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Chocolate cocoa oat granola mixed with raw cacao nibs spilling onto bright linen fabric",
    rating: 4.8,
    review_count: 540,
    badges: ["고단백"]
  },
  {
    id: 33,
    name: "저당 베리베리 프로틴 시리얼 300g",
    brand: "WELL BITE",
    category: "시리얼·그래놀라",
    price: 9900,
    original_price: 12000,
    stock: 90,
    summary: "동결건조 딸기와 블루베리가 톡톡! 단백질 함량을 2배로 올린 시리얼",
    serving_size: "1회 (40g)",
    calories: 155,
    protein: 14,
    carbs: 20,
    fat: 2.5,
    sugar: 2.5,
    sodium: 110,
    allergens: ["우유", "대두"],
    contains_caffeine: false,
    main_ingredients: ["분리유청단백퍼프 45%", "통곡물시리얼 35%", "동결건조딸기 10%"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1521483451569-e33803c0330c?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Crisp breakfast cereal flakes mixed with bright freeze dried berries in a minimalist white bowl",
    rating: 4.7,
    review_count: 480,
    badges: ["저당", "고단백"]
  },
  {
    id: 34,
    name: "유기농 통귀리 오토그래놀라 시나몬 400g",
    brand: "DAILY ROOT",
    category: "시리얼·그래놀라",
    price: 13500,
    original_price: 16000,
    stock: 55,
    summary: "은은한 실론 시나몬 파우더와 메이플 풍미가 어우러진 정통 오트 그래놀라",
    serving_size: "1회 (40g)",
    calories: 170,
    protein: 6,
    carbs: 25,
    fat: 5.0,
    sugar: 4.2,
    sodium: 30,
    allergens: ["견과류"],
    contains_caffeine: false,
    main_ingredients: ["유기농통귀리 60%", "피칸 15%", "메이플시럽", "시나몬파우더"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Golden cinnamon toasted oats and pecans piled gently in a modern wooden bowl, organic vibe",
    rating: 4.8,
    review_count: 360,
    badges: ["유기농"]
  },
  {
    id: 35,
    name: "하이프로틴 흑임자 서리태 그래놀라 350g",
    brand: "BALANCE ON",
    category: "시리얼·그래놀라",
    price: 14200,
    original_price: 17500,
    stock: 70,
    summary: "꼬소함의 극치! 볶은 서리태와 검은깨를 듬뿍 넣은 K-슈퍼푸드 그래놀라",
    serving_size: "1회 (40g)",
    calories: 185,
    protein: 12,
    carbs: 18,
    fat: 7.2,
    sugar: 1.5,
    sodium: 50,
    allergens: ["대두", "견과류"],
    contains_caffeine: false,
    main_ingredients: ["압착귀리 40%", "볶은서리태 25%", "흑임자페이스트 15%"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Black sesame toasted granola clusters with roasted black soybeans, rustic tabletop styling",
    rating: 4.9,
    review_count: 670,
    badges: ["고소한맛", "고단백"]
  },
  {
    id: 36,
    name: "글루텐프리 퀴노아 라이스 크런치 280g",
    brand: "GREEN TABLE",
    category: "시리얼·그래놀라",
    price: 8900,
    original_price: 10800,
    stock: 90,
    summary: "밀가루 대신 유기농 발아현미와 퀴노아로 만든 팝핑 시리얼",
    serving_size: "1회 (30g)",
    calories: 120,
    protein: 4,
    carbs: 24,
    fat: 1.0,
    sugar: 0.5,
    sodium: 45,
    allergens: [],
    contains_caffeine: false,
    main_ingredients: ["발아현미 70%", "퀴노아퍼프 25%", "천일염"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Gluten free puffed quinoa and crispy brown rice grain flakes in plain white dish",
    rating: 4.5,
    review_count: 180,
    badges: ["글루텐FREE", "저염"]
  },
  {
    id: 37,
    name: "식단관리 저칼로리 곤약 그래놀라 300g",
    brand: "FARM POCKET",
    category: "시리얼·그래놀라",
    price: 11900,
    original_price: 14500,
    stock: 60,
    summary: "동결건조 곤약 후레이크를 더해 가벼운 열량으로 바삭한 식감을 완성한 식단템",
    serving_size: "1회 (40g)",
    calories: 135,
    protein: 7,
    carbs: 23,
    fat: 2.1,
    sugar: 0.9,
    sodium: 55,
    allergens: [],
    contains_caffeine: false,
    main_ingredients: ["귀리 45%", "건조곤약플레이크 30%", "치커리뿌리추출식이섬유"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Low calorie healthy crisp granola in clear glass container with measuring scoop",
    rating: 4.6,
    review_count: 290,
    badges: ["저칼로리", "저당"]
  },
  {
    id: 38,
    name: "프로틴 맥스 소이볼 그래놀라 400g",
    brand: "CARE LABS",
    category: "시리얼·그래놀라",
    price: 13900,
    original_price: 16900,
    stock: 85,
    summary: "1회 섭취시 단백질 16g 보장! 바삭한 소이 프로틴 볼이 가득 들어있는 하드트레이닝용",
    serving_size: "1회 (45g)",
    calories: 195,
    protein: 16,
    carbs: 20,
    fat: 4.8,
    sugar: 1.8,
    sodium: 90,
    allergens: ["대두"],
    contains_caffeine: false,
    main_ingredients: ["분리대두단백볼 40%", "통귀리 35%", "해바라기씨 15%"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1517093708149-14a00445d4c2?w=600&auto=format&fit=crop&q=80",
    image_prompt: "High protein cereal clusters packed with crisp soy protein balls on bright marble surface",
    rating: 4.9,
    review_count: 820,
    badges: ["고단백", "BEST"]
  },
  {
    id: 39,
    name: "고구마 말랭이 듬뿍 옐로우 그래놀라 350g",
    brand: "PURE FARM",
    category: "시리얼·그래놀라",
    price: 12900,
    original_price: 15900,
    stock: 50,
    summary: "해남 고구마 말랭이 큐브와 단호박씨가 어우러져 자연스러운 단맛을 내는 그래놀라",
    serving_size: "1회 (40g)",
    calories: 170,
    protein: 6,
    carbs: 28,
    fat: 4.0,
    sugar: 4.8,
    sodium: 35,
    allergens: [],
    contains_caffeine: false,
    main_ingredients: ["귀리 45%", "건조호박고구마큐브 25%", "호박씨 15%"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Warm golden granola with chewy dried sweet potato cubes in ceramic tableware",
    rating: 4.7,
    review_count: 310,
    badges: ["천연단맛"]
  },
  {
    id: 40,
    name: "그린 애플 & 치아씨드 로우 그래놀라 320g",
    brand: "DAILY ROOT",
    category: "시리얼·그래놀라",
    price: 13200,
    original_price: 16000,
    stock: 45,
    summary: "상큼한 풋사과 칩과 오메가3의 보고 치아씨드를 저온 로스팅한 로우푸드 그래놀라",
    serving_size: "1회 (40g)",
    calories: 165,
    protein: 7,
    carbs: 23,
    fat: 5.5,
    sugar: 3.2,
    sodium: 25,
    allergens: [],
    contains_caffeine: false,
    main_ingredients: ["귀리 50%", "동결건조사과 20%", "블랙치아씨드 15%"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1521483451569-e33803c0330c?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Clean raw granola with dried green apple bits and chia seeds, soft airy light",
    rating: 4.6,
    review_count: 240,
    badges: ["식이섬유"]
  },

  // 5. 유제품·대체유 (41~50)
  {
    id: 41,
    name: "꾸덕한 무가당 플레인 그릭요거트 450g",
    brand: "PURE FARM",
    category: "유제품·대체유",
    price: 7800,
    original_price: 9500,
    stock: 95,
    summary: "유청을 99% 분리하여 크림치즈처럼 꾸덕하고 단백질이 3배 높은 전통 그리스 요거트",
    serving_size: "1회 (100g)",
    calories: 130,
    protein: 13,
    carbs: 3.5,
    fat: 7.0,
    sugar: 1.5,
    sodium: 40,
    allergens: ["우유"],
    contains_caffeine: false,
    main_ingredients: ["원유 99.9%", "복합유산균"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Ultra thick authentic plain Greek yogurt scooped on a ceramic spoon, clean studio white setup",
    rating: 4.9,
    review_count: 1850,
    badges: ["BEST", "저당", "고단백"]
  },
  {
    id: 42,
    name: "무첨가 순수 아몬드 밀크 언스위트 190ml x 10팩",
    brand: "GREEN TABLE",
    category: "유제품·대체유",
    price: 11900,
    original_price: 14900,
    stock: 120,
    summary: "100% 캘리포니아산 아몬드를 착즙한 유제품 대체 음료 (한 팩 35kcal)",
    serving_size: "1팩 (190ml)",
    calories: 35,
    protein: 1.2,
    carbs: 1.0,
    fat: 2.8,
    sugar: 0.1,
    sodium: 60,
    allergens: ["견과류"],
    contains_caffeine: false,
    main_ingredients: ["아몬드페이스트 95%", "정제수", "천일염"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Glass bottle of fresh almond milk pouring into a glass beside raw almonds, minimalist setting",
    rating: 4.8,
    review_count: 920,
    badges: ["비건", "저칼로리", "락토스FREE"]
  },
  {
    id: 43,
    name: "식물성 고단백 귀리 오트 음료 바리스타 1L",
    brand: "GREEN TABLE",
    category: "유제품·대체유",
    price: 4900,
    original_price: 5900,
    stock: 85,
    summary: "커피와 가장 잘 어울리는 스웨덴산 귀리로 만든 크리미한 비건 오트 라떼 베이스",
    serving_size: "1컵 (200ml)",
    calories: 110,
    protein: 3.5,
    carbs: 16,
    fat: 3.8,
    sugar: 3.0,
    sodium: 75,
    allergens: [],
    contains_caffeine: false,
    main_ingredients: ["귀리추출액 85%", "유채유", "제이인산칼륨"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1568651316499-19ec6eb91ef1?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Oat milk poured into modern ceramic coffee cup forming smooth microfoam, natural morning sun",
    rating: 4.7,
    review_count: 630,
    badges: ["비건"]
  },
  {
    id: 44,
    name: "락토프리 저지방 프로틴 우유 250ml",
    brand: "CARE LABS",
    category: "유제품·대체유",
    price: 2100,
    original_price: 2600,
    stock: 140,
    summary: "유당을 분해하고 한 팩에 단백질 20g을 채운 기능성 우유",
    serving_size: "1팩 (250ml)",
    calories: 145,
    protein: 20,
    carbs: 9.0,
    fat: 2.0,
    sugar: 4.0,
    sodium: 130,
    allergens: ["우유"],
    contains_caffeine: false,
    main_ingredients: ["탈지우유 80%", "분리유청단백 WPI", "락타아제효소"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Clean glass bottle of fresh protein fortified milk against soft warm background",
    rating: 4.9,
    review_count: 1040,
    badges: ["고단백", "락토스FREE"]
  },
  {
    id: 45,
    name: "산양유 100% 무첨가 요거트 드링크 150ml",
    brand: "DAILY ROOT",
    category: "유제품·대체유",
    price: 3400,
    original_price: 4200,
    stock: 60,
    summary: "청정 목장에서 얻은 생 산양유를 담백하게 발효한 무첨가 발효유",
    serving_size: "1병 (150ml)",
    calories: 115,
    protein: 6.5,
    carbs: 7.2,
    fat: 6.0,
    sugar: 3.5,
    sodium: 50,
    allergens: ["우유"],
    contains_caffeine: false,
    main_ingredients: ["국산산양원유 99.9%", "복합생유산균"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1571212515416-fef01fc43637?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Pure probiotic goat milk yogurt in delicate small glass bottle, rustic wellness aesthetic",
    rating: 4.8,
    review_count: 310,
    badges: ["프리미엄", "소화편한"]
  },
  {
    id: 46,
    name: "국산 서리태 검은콩 두유 무가당 190ml x 16팩",
    brand: "FARM POCKET",
    category: "유제품·대체유",
    price: 18900,
    original_price: 23000,
    stock: 75,
    summary: "껍질째 통째로 갈아 영양을 보존한 콩 본연의 진하고 담백한 전통 서리태 두유",
    serving_size: "1팩 (190ml)",
    calories: 75,
    protein: 7.0,
    carbs: 4.5,
    fat: 3.2,
    sugar: 0.8,
    sodium: 85,
    allergens: ["대두"],
    contains_caffeine: false,
    main_ingredients: ["국산서리태콩추출액 99.5%", "천일염"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Rich black soybean milk in a rustic cup surrounded by scattered whole black beans",
    rating: 4.7,
    review_count: 570,
    badges: ["무설탕", "비건"]
  },
  {
    id: 47,
    name: "코코넛 워터 베이스 무가당 코코넛 밀크 330ml",
    brand: "BALANCE ON",
    category: "유제품·대체유",
    price: 3100,
    original_price: 3800,
    stock: 90,
    summary: "청량한 코코넛 워터에 부드러운 코코넛 크림을 배합해 전해질을 채워주는 음료",
    serving_size: "1팩 (330ml)",
    calories: 65,
    protein: 1.0,
    carbs: 3.5,
    fat: 4.5,
    sugar: 2.1,
    sodium: 90,
    allergens: [],
    contains_caffeine: false,
    main_ingredients: ["천연코코넛워터 70%", "코코넛밀크 30%"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Fresh coconut water beverage staging with cracked green coconut, clear refreshing lighting",
    rating: 4.5,
    review_count: 220,
    badges: ["전해질"]
  },
  {
    id: 48,
    name: "저칼로리 코티지 치즈 200g",
    brand: "FIT MEAL",
    category: "유제품·대체유",
    price: 5900,
    original_price: 7200,
    stock: 50,
    summary: "신선한 탈지유로 응고시켜 지방 함량은 낮추고 카제인 단백질을 꽉 잡은 신선 치즈",
    serving_size: "1회 (100g)",
    calories: 90,
    protein: 14,
    carbs: 3.0,
    fat: 2.0,
    sugar: 2.0,
    sodium: 180,
    allergens: ["우유"],
    contains_caffeine: false,
    main_ingredients: ["국산원유 98%", "구연산", "정제염"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1559561853-08451507cbe7?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Fresh low fat lumpy cottage cheese in ceramic bowl with fresh herbs, bright culinary studio",
    rating: 4.8,
    review_count: 410,
    badges: ["저지방", "고단백"]
  },
  {
    id: 49,
    name: "유기농 골든 플랙씨드 아마씨유 250ml",
    brand: "VITAL BOTANICS",
    category: "유제품·대체유",
    price: 14500,
    original_price: 18000,
    stock: 40,
    summary: "식물성 오메가-3의 여왕, 100% 저온 압착으로 영양을 그대로 추출한 프리미엄 오일",
    serving_size: "1스푼 (10ml)",
    calories: 85,
    protein: 0,
    carbs: 0,
    fat: 9.5,
    sugar: 0,
    sodium: 0,
    allergens: [],
    contains_caffeine: false,
    main_ingredients: ["유기농골든아마씨유 100%"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Dark amber glass bottle of pure golden cold-pressed flaxseed oil, premium wellness tone",
    rating: 4.7,
    review_count: 190,
    badges: ["식물성오메가3", "저염"]
  },
  {
    id: 50,
    name: "프로바이오틱스 케피어 발효유 플레인 500ml",
    brand: "PURE FARM",
    category: "유제품·대체유",
    price: 6200,
    original_price: 7500,
    stock: 65,
    summary: "장 건강을 위한 티벳 버섯 종균 케피어 유산균이 살아있는 전통 농후발효유",
    serving_size: "1컵 (150ml)",
    calories: 95,
    protein: 5.5,
    carbs: 6.5,
    fat: 4.0,
    sugar: 3.0,
    sodium: 65,
    allergens: ["우유"],
    contains_caffeine: false,
    main_ingredients: ["원유 99%", "케피어종균유산균"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Probiotic kefir drink pouring smoothly into tumbler, fresh healthy lifestyle setup",
    rating: 4.8,
    review_count: 380,
    badges: ["유산균가득"]
  },

  // 6. 음료·프로틴음료 (51~60)
  {
    id: 51,
    name: "프로틴 맥스 25g WPI 더블초코 250ml",
    brand: "CARE LABS",
    category: "음료·프로틴음료",
    price: 2800,
    original_price: 3500,
    stock: 180,
    summary: "분리유청단백 WPI 25g 함유, 당류 0g의 깊고 진한 네덜란드 다크초코 프로틴 RTD",
    serving_size: "1팩 (250ml)",
    calories: 140,
    protein: 25,
    carbs: 3.0,
    fat: 1.2,
    sugar: 0,
    sodium: 125,
    allergens: ["우유"],
    contains_caffeine: false,
    main_ingredients: ["분리유청단백 WPI", "알룰로스", "네덜란드코코아분말"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Modern sleek ready-to-drink protein shake carton, double chocolate flavor, clean athletic styling",
    rating: 4.9,
    review_count: 2450,
    badges: ["BEST", "고단백", "저당"]
  },
  {
    id: 52,
    name: "콜드브루 프로틴 라떼 에너지 부스트 275ml",
    brand: "CARE LABS",
    category: "음료·프로틴음료",
    price: 3200,
    original_price: 4000,
    stock: 110,
    summary: "예가체프 콜드브루 원액(카페인 110mg)에 단백질 20g을 녹여낸 프리미엄 부스터 라떼",
    serving_size: "1병 (275ml)",
    calories: 125,
    protein: 20,
    carbs: 4.5,
    fat: 1.0,
    sugar: 0.5,
    sodium: 110,
    allergens: ["우유"],
    contains_caffeine: true,
    main_ingredients: ["콜드브루커피추출액 40%", "분리유청단백질", "우유단백농축"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Glass bottle of cold brew iced coffee protein shake with fresh condensation, premium cafe lighting",
    rating: 4.8,
    review_count: 890,
    badges: ["카페인포함", "고단백"]
  },
  {
    id: 53,
    name: "스파클링 BCAA 아미노 에이드 자몽맛 355ml",
    brand: "FIT MEAL",
    category: "음료·프로틴음료",
    price: 2200,
    original_price: 2800,
    stock: 130,
    summary: "근육 합성 필수 아미노산 BCAA 5,000mg 함유! 당류 0g 톡 쏘는 천연 자몽 탄산음료",
    serving_size: "1캔 (355ml)",
    calories: 15,
    protein: 5,
    carbs: 1.0,
    fat: 0,
    sugar: 0,
    sodium: 40,
    allergens: [],
    contains_caffeine: false,
    main_ingredients: ["BCAA복합물", "자몽과즙농축액", "탄산수", "수크랄로스"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Chilled can of sparkling grapefruit fitness drink with water droplets, vibrant citrus glow",
    rating: 4.7,
    review_count: 670,
    badges: ["무설탕", "저칼로리"]
  },
  {
    id: 54,
    name: "식물성 완두 프로틴 스무디 바나나베리 250ml",
    brand: "GREEN TABLE",
    category: "음료·프로틴음료",
    price: 2900,
    original_price: 3600,
    stock: 70,
    summary: "유청 대신 캐나다산 완두단백 18g과 리얼 바나나 과육을 블렌딩한 비건 스무디",
    serving_size: "1팩 (250ml)",
    calories: 150,
    protein: 18,
    carbs: 12,
    fat: 2.0,
    sugar: 3.5,
    sodium: 140,
    allergens: [],
    contains_caffeine: false,
    main_ingredients: ["분리완두단백", "바나나퓨레 15%", "블루베리농축액"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Smooth vegan berry protein smoothie in glass tumbler with eco paper straw",
    rating: 4.6,
    review_count: 340,
    badges: ["비건"]
  },
  {
    id: 55,
    name: "유기농 콤부차 레몬진저 310ml",
    brand: "DAILY ROOT",
    category: "음료·프로틴음료",
    price: 3000,
    original_price: 3800,
    stock: 95,
    summary: "504시간 자연 발효로 유익균과 유기산이 가득한 탄산 톡톡 자연발효 콤부차",
    serving_size: "1병 (310ml)",
    calories: 45,
    protein: 0.5,
    carbs: 10,
    fat: 0,
    sugar: 2.2,
    sodium: 15,
    allergens: [],
    contains_caffeine: true,
    main_ingredients: ["유기농홍차발효액 90%", "레몬과즙 5%", "생강추출액"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Sparkling golden kombucha in glass bottle with fresh lemon slices around it, sunlit modern kitchen",
    rating: 4.8,
    review_count: 510,
    badges: ["발효유익균", "유기농"]
  },
  {
    id: 56,
    name: "L-카르니틴 버닝 워터 그린애플 500ml",
    brand: "BALANCE ON",
    category: "음료·프로틴음료",
    price: 2500,
    original_price: 3200,
    stock: 140,
    summary: "체중 관리와 운동 루틴을 위한 L-카르니틴 2,000mg 함유 제로 칼로리 워터",
    serving_size: "1병 (500ml)",
    calories: 5,
    protein: 0,
    carbs: 1.0,
    fat: 0,
    sugar: 0,
    sodium: 30,
    allergens: [],
    contains_caffeine: false,
    main_ingredients: ["L-카르니틴타르트레이트", "사과농축액 0.5%", "에리스리톨"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Chilled clear sports water bottle with droplet condensation, crisp green apple in background",
    rating: 4.7,
    review_count: 420,
    badges: ["무설탕", "버닝워터"]
  },
  {
    id: 57,
    name: "단호박 팥 데일리 호박즙 100ml x 14포",
    brand: "PURE FARM",
    category: "음료·프로틴음료",
    price: 16900,
    original_price: 21000,
    stock: 80,
    summary: "국내산 늙은호박과 붉은 팥을 껍질째 저온 추출하여 칼륨을 풍부하게 채운 건강즙",
    serving_size: "1포 (100ml)",
    calories: 28,
    protein: 0.8,
    carbs: 6.0,
    fat: 0.1,
    sugar: 3.1,
    sodium: 10,
    allergens: [],
    contains_caffeine: false,
    main_ingredients: ["국내산늙은호박추출액 85%", "국내산팥추출액 15%"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1506459225024-1428097a7e18?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Golden pumpkin juice pouch and a minimalist glass showing deep amber healthy herbal drink",
    rating: 4.8,
    review_count: 620,
    badges: ["붓기관리", "저염"]
  },
  {
    id: 58,
    name: "타트체리 멜라토닌 나이트 드링크 100ml",
    brand: "VITAL BOTANICS",
    category: "음료·프로틴음료",
    price: 2800,
    original_price: 3500,
    stock: 65,
    summary: "자연 유래 식물성 멜라토닌이 풍부한 몽모랑시 타트체리 원액으로 편안한 밤 준비",
    serving_size: "1병 (100ml)",
    calories: 45,
    protein: 0.5,
    carbs: 11,
    fat: 0,
    sugar: 4.2,
    sodium: 8,
    allergens: [],
    contains_caffeine: false,
    main_ingredients: ["미국산타트체리농축액 99.5%", "테아닌"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Deep ruby red tart cherry extract drink in clear glass bottle on dark calming wooden table",
    rating: 4.6,
    review_count: 280,
    badges: ["수면케어", "무카페인"]
  },
  {
    id: 59,
    name: "프로틴 맥스 25g WPI 딸기 바닐라 250ml",
    brand: "CARE LABS",
    category: "음료·프로틴음료",
    price: 2800,
    original_price: 3500,
    stock: 140,
    summary: "분리유청 WPI 25g, 산뜻하고 달콤한 천연 딸기 파우더로 비린내를 완벽히 잡은 단백질 음료",
    serving_size: "1팩 (250ml)",
    calories: 140,
    protein: 25,
    carbs: 3.2,
    fat: 1.1,
    sugar: 0,
    sodium: 120,
    allergens: ["우유"],
    contains_caffeine: false,
    main_ingredients: ["분리유청단백 WPI", "딸기농축분말", "천연바닐라향"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Pink strawberry protein shake bottle staged with fresh strawberries and splash, bright commercial shot",
    rating: 4.9,
    review_count: 1150,
    badges: ["고단백", "저당"]
  },
  {
    id: 60,
    name: "에너지 부스터 과라나 샷 60ml",
    brand: "FIT MEAL",
    category: "음료·프로틴음료",
    price: 2400,
    original_price: 3000,
    stock: 90,
    summary: "고함량 천연 카페인 150mg과 타우린 1,500mg을 컴팩트한 한 병에 압축한 프리워크아웃 샷",
    serving_size: "1병 (60ml)",
    calories: 20,
    protein: 1.0,
    carbs: 3.8,
    fat: 0,
    sugar: 0,
    sodium: 15,
    allergens: [],
    contains_caffeine: true,
    main_ingredients: ["과라나추출액", "타우린", "비타민B군 복합체"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Small energetic shot glass bottle with glowing amber liquid, sleek minimal black background",
    rating: 4.7,
    review_count: 530,
    badges: ["고카페인", "부스터"]
  },

  // 7. 견과·건과류 (61~70)
  {
    id: 61,
    name: "프리미엄 원데이 순수 견과 데일리팩 25g x 14포",
    brand: "NUTRI HOUSE",
    category: "견과·건과류",
    price: 18900,
    original_price: 23000,
    stock: 110,
    summary: "당 절임 건과일 0%! 구운 아몬드, 호두, 피칸, 마카다미아로만 꽉 채운 프리미엄 저당 데일리팩",
    serving_size: "1포 (25g)",
    calories: 160,
    protein: 5.0,
    carbs: 4.5,
    fat: 14.5,
    sugar: 0.9,
    sodium: 5,
    allergens: ["견과류"],
    contains_caffeine: false,
    main_ingredients: ["구운아몬드 35%", "호두 25%", "구운피칸 20%", "마카다미아 20%"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1536591375315-1b836890327b?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Handful of assorted raw nuts (walnuts, almonds, pecans) spilling over natural linen pouch",
    rating: 4.9,
    review_count: 1670,
    badges: ["BEST", "저당", "저염"]
  },
  {
    id: 62,
    name: "저온 로스팅 무염 캐슈넛 300g",
    brand: "NUTRI HOUSE",
    category: "견과·건과류",
    price: 12900,
    original_price: 15900,
    stock: 75,
    summary: "소금 없이 은은한 온도로 천천히 구워 본연의 부드럽고 달콤한 풍미를 살린 프리미엄 캐슈넛",
    serving_size: "1회 (30g)",
    calories: 170,
    protein: 5.5,
    carbs: 9.0,
    fat: 13.0,
    sugar: 1.8,
    sodium: 4,
    allergens: ["견과류"],
    contains_caffeine: false,
    main_ingredients: ["인도산 캐슈넛 100%"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1509358271058-acd22cc93898?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Whole roasted unsalted cashew nuts heaped in an earthy ceramic bowl, warm natural lighting",
    rating: 4.8,
    review_count: 420,
    badges: ["무염", "저염"]
  },
  {
    id: 63,
    name: "껍질째 먹는 캘리포니아 구운 아몬드 450g",
    brand: "PURE FARM",
    category: "견과·건과류",
    price: 11500,
    original_price: 14000,
    stock: 95,
    summary: "오븐에 막 구워내어 바삭함이 남다른 논스모크 무첨가 100% 프리미엄 통아몬드",
    serving_size: "1회 (30g)",
    calories: 175,
    protein: 6.5,
    carbs: 6.0,
    fat: 15.0,
    sugar: 1.2,
    sodium: 2,
    allergens: ["견과류"],
    contains_caffeine: false,
    main_ingredients: ["미국산 아몬드 100%"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Crisp dry roasted whole almonds filling a minimalist matte bowl, sharp macro detail",
    rating: 4.8,
    review_count: 850,
    badges: ["무염", "식이섬유"]
  },
  {
    id: 64,
    name: "무설탕 유기농 동결건조 딸기 & 블루베리 50g",
    brand: "FARM POCKET",
    category: "견과·건과류",
    price: 7900,
    original_price: 9800,
    stock: 60,
    summary: "영하 40도에서 급속 동결 건조하여 비타민과 과일 본연의 향미를 보존한 무첨가 건과일",
    serving_size: "1봉 (50g)",
    calories: 160,
    protein: 2.8,
    carbs: 35,
    fat: 1.2,
    sugar: 26,
    sodium: 5,
    allergens: [],
    contains_caffeine: false,
    main_ingredients: ["동결건조딸기 50%", "동결건조블루베리 50%"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Vibrant freeze dried whole strawberries and blueberries on matte white plate",
    rating: 4.7,
    review_count: 310,
    badges: ["유기농"]
  },
  {
    id: 65,
    name: "생생 햄프씨드 껍질 벗긴 대마씨 250g",
    brand: "DAILY ROOT",
    category: "견과·건과류",
    price: 9500,
    original_price: 11800,
    stock: 70,
    summary: "단백질과 아르기닌, 필수 지방산이 풍부하여 밥이나 샐러드에 톡톡 뿌려먹는 슈퍼씨드",
    serving_size: "1스푼 (15g)",
    calories: 85,
    protein: 5.0,
    carbs: 1.2,
    fat: 7.0,
    sugar: 0.2,
    sodium: 1,
    allergens: [],
    contains_caffeine: false,
    main_ingredients: ["캐나다산 햄프씨드 100%"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Shelled organic hemp hearts seeds scooped in clean wooden spoon, soft bright lighting",
    rating: 4.8,
    review_count: 290,
    badges: ["고단백", "슈퍼푸드"]
  },
  {
    id: 66,
    name: "지중해 사막의 선물 무첨가 대추야자 데이츠 200g",
    brand: "WELL BITE",
    category: "견과·건과류",
    price: 6800,
    original_price: 8500,
    stock: 80,
    summary: "운동 전후 천연 당분 보충제! 쫀득한 캐러멜 식감의 씨 뺀 무설탕 자연 건조 대추야자",
    serving_size: "3알 (30g)",
    calories: 85,
    protein: 0.8,
    carbs: 22,
    fat: 0.1,
    sugar: 19,
    sodium: 2,
    allergens: [],
    contains_caffeine: false,
    main_ingredients: ["건조대추야자 100%"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Plump glossy pitted Medjool dates arranged on natural stone tray",
    rating: 4.6,
    review_count: 240,
    badges: ["천연에너지"]
  },
  {
    id: 67,
    name: "바질페스토 시즈닝 구운 마카다미아 150g",
    brand: "NUTRI HOUSE",
    category: "견과·건과류",
    price: 14800,
    original_price: 17900,
    stock: 50,
    summary: "견과류의 황제 마카다미아에 천연 바질 파우더와 올리브 오일을 입힌 이색 웰빙 스낵",
    serving_size: "1회 (30g)",
    calories: 215,
    protein: 3.0,
    carbs: 4.0,
    fat: 22.0,
    sugar: 1.4,
    sodium: 115,
    allergens: ["견과류"],
    contains_caffeine: false,
    main_ingredients: ["호주산 마카다미아 94%", "바질페스토분말", "엑스트라버진올리브유"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1536591375315-1b836890327b?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Whole roasted macadamia nuts delicately seasoned with green basil flecks in glass bowl",
    rating: 4.7,
    review_count: 185,
    badges: ["미식간식"]
  },
  {
    id: 68,
    name: "볶은 검은콩 서리태 스낵 200g",
    brand: "FARM POCKET",
    category: "견과·건과류",
    price: 5200,
    original_price: 6500,
    stock: 120,
    summary: "물 없이 열풍으로만 볶아 겉은 바삭하고 속은 고소한 100% 국산 서리태 안심 영양 간식",
    serving_size: "1회 (30g)",
    calories: 125,
    protein: 11,
    carbs: 11,
    fat: 4.5,
    sugar: 1.8,
    sodium: 5,
    allergens: ["대두"],
    contains_caffeine: false,
    main_ingredients: ["국내산서리태 100%"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Crunchy roasted black beans in small porcelain dish, healthy traditional snack",
    rating: 4.8,
    review_count: 460,
    badges: ["고단백", "저당"]
  },
  {
    id: 69,
    name: "유기농 무염 볶은 호박씨 250g",
    brand: "DAILY ROOT",
    category: "견과·건과류",
    price: 6900,
    original_price: 8500,
    stock: 90,
    summary: "아연과 마그네슘이 가득해 활력 충전에 좋은 껍질 벗긴 초록빛 무염 호박씨",
    serving_size: "1회 (30g)",
    calories: 165,
    protein: 9.0,
    carbs: 4.0,
    fat: 13.5,
    sugar: 0.5,
    sodium: 3,
    allergens: [],
    contains_caffeine: false,
    main_ingredients: ["유기농호박씨 100%"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1509358271058-acd22cc93898?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Bright green shelled pumpkin seeds spread on white marble, clean crisp lighting",
    rating: 4.7,
    review_count: 220,
    badges: ["마그네슘", "저염"]
  },
  {
    id: 70,
    name: "브라질너트 셀레늄 데일리 보울 180g",
    brand: "NUTRI HOUSE",
    category: "견과·건과류",
    price: 13800,
    original_price: 16900,
    stock: 65,
    summary: "하루 딱 2알로 성인 일일 셀레늄 섭취량을 100% 충족하는 아마존 야생 브라질너트",
    serving_size: "2알 (10g)",
    calories: 68,
    protein: 1.5,
    carbs: 1.2,
    fat: 6.7,
    sugar: 0.2,
    sodium: 1,
    allergens: ["견과류"],
    contains_caffeine: false,
    main_ingredients: ["페루산 브라질너트 100%"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1536591375315-1b836890327b?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Large organic brazil nuts in glass jar on natural wood surface",
    rating: 4.9,
    review_count: 510,
    badges: ["셀레늄부자"]
  },

  // 8. 영양제·비타민 (71~80)
  {
    id: 71,
    name: "데일리 올인원 활력 멀티비타민 & 미네랄 60정",
    brand: "VITAL BOTANICS",
    category: "영양제·비타민",
    price: 24900,
    original_price: 32000,
    stock: 150,
    summary: "현대인에게 꼭 필요한 13종 비타민과 8종 미네랄을 한 알에 꽉 채운 2개월분 영양제",
    serving_size: "1일 1정 (1,000mg)",
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    sugar: 0,
    sodium: 5,
    allergens: [],
    contains_caffeine: false,
    main_ingredients: ["비타민B군 복합체", "비타민C", "비타민D3", "아연", "셀레늄"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Clean minimalist amber supplement bottle with white multi-vitamin tablets resting in foreground",
    rating: 4.9,
    review_count: 2150,
    badges: ["BEST", "필수영양"]
  },
  {
    id: 72,
    name: "퓨어 rTG 알티지 오메가3 1000mg 60캡슐",
    brand: "CARE LABS",
    category: "영양제·비타민",
    price: 28900,
    original_price: 36000,
    stock: 120,
    summary: "흡수율 높은 생체형 rTG 구조, 중금속 걱정 없는 남태평양 소형 어종 추출 오메가3",
    serving_size: "1일 1캡슐",
    calories: 10,
    protein: 0,
    carbs: 0,
    fat: 1.0,
    sugar: 0,
    sodium: 0,
    allergens: [],
    contains_caffeine: false,
    main_ingredients: ["정제어유 (EPA 및 DHA 함유유지 1,000mg)", "비타민E"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Golden translucent softgel capsules glowing under soft daylight next to frosted bottle",
    rating: 4.9,
    review_count: 1890,
    badges: ["rTG오메가3", "인기"]
  },
  {
    id: 73,
    name: "100억 생유산균 신바이오틱스 포스트바이오틱스 30포",
    brand: "DAILY ROOT",
    category: "영양제·비타민",
    price: 21900,
    original_price: 28000,
    stock: 140,
    summary: "장까지 살아서 가는 특허 4중 코팅! 프리바이오틱스와 유산균 배양 건조물까지 3-in-1",
    serving_size: "1일 1포 (2g)",
    calories: 8,
    protein: 0.1,
    carbs: 1.8,
    fat: 0,
    sugar: 0.5,
    sodium: 2,
    allergens: ["대두", "우유"],
    contains_caffeine: false,
    main_ingredients: ["17종 혼합유산균 (보장균수 100억)", "프락토올리고당"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1577401239170-897942555fb3?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Minimalist probiotic powder packets arranged beside clean water cup, wellness theme",
    rating: 4.8,
    review_count: 1340,
    badges: ["장건강", "100억보장"]
  },
  {
    id: 74,
    name: "간 편한 밀크씨슬 실리마린 & 비타민B 60정",
    brand: "VITAL BOTANICS",
    category: "영양제·비타민",
    price: 19500,
    original_price: 25000,
    stock: 100,
    summary: "프랑스산 프리미엄 밀크씨슬 추출물 실리마린 130mg 함유로 피로한 간 활력 케어",
    serving_size: "1일 1정",
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    sugar: 0,
    sodium: 0,
    allergens: [],
    contains_caffeine: false,
    main_ingredients: ["밀크씨슬추출물 (실리마린 130mg)", "비타민B1", "비타민B2", "나이아신"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Herbal supplement glass bottle with botanical milk thistle illustration, clean medical aesthetic",
    rating: 4.7,
    review_count: 980,
    badges: ["간피로케어"]
  },
  {
    id: 75,
    name: "고함량 마그네슘 비타민B6 릴렉스 60정",
    brand: "BALANCE ON",
    category: "영양제·비타민",
    price: 17900,
    original_price: 22000,
    stock: 85,
    summary: "일상적인 에너지 이용과 컨디션 관리를 위한 쌀 발효 유래 마그네슘",
    serving_size: "1일 1정",
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    sugar: 0,
    sodium: 0,
    allergens: [],
    contains_caffeine: false,
    main_ingredients: ["쌀발효마그네슘 315mg", "비타민B6염산염"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Calm evening setting with white mineral tablet on minimalist ceramic saucer",
    rating: 4.8,
    review_count: 650,
    badges: ["릴렉스", "무카페인"]
  },
  {
    id: 76,
    name: "햇살 비타민D3 4000IU + 비타민K2 60캡슐",
    brand: "CARE LABS",
    category: "영양제·비타민",
    price: 16500,
    original_price: 21000,
    stock: 130,
    summary: "실내 생활이 많은 현대인을 위한 고함량 활성형 비타민D3와 뼈 건강을 돕는 K2 포뮬러",
    serving_size: "1일 1캡슐",
    calories: 2,
    protein: 0,
    carbs: 0,
    fat: 0.2,
    sugar: 0,
    sodium: 0,
    allergens: [],
    contains_caffeine: false,
    main_ingredients: ["스위스산 비타민D3오일 4000IU", "메나퀴논-7 (비타민K2)", "MCT오일"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Tiny golden liquid capsules on warm wood spoon illuminated by sunlight",
    rating: 4.9,
    review_count: 870,
    badges: ["고함량", "필수비타민"]
  },
  {
    id: 77,
    name: "루테인 지아잔틴 아스타잔틴 아이케어 30캡슐",
    brand: "VITAL BOTANICS",
    category: "영양제·비타민",
    price: 22500,
    original_price: 29000,
    stock: 75,
    summary: "모니터와 스마트폰을 자주 보는 일상의 눈 건강을 챙기기 위한 트리플 복합 포뮬러",
    serving_size: "1일 1캡슐",
    calories: 3,
    protein: 0,
    carbs: 0,
    fat: 0.3,
    sugar: 0,
    sodium: 0,
    allergens: ["대두"],
    contains_caffeine: false,
    main_ingredients: ["루테인지아잔틴복합추출물 20mg", "헤마토코쿠스추출물 (아스타잔틴 4mg)"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Dark red oval softgels next to premium wellness packaging, eye health theme",
    rating: 4.7,
    review_count: 590,
    badges: ["눈건강"]
  },
  {
    id: 78,
    name: "저분자 피쉬 콜라겐 펩타이드 3270mg 30포",
    brand: "WELL BITE",
    category: "영양제·비타민",
    price: 26000,
    original_price: 34000,
    stock: 90,
    summary: "흡수율 극대화 512Da 어린 콜라겐! 히알루론산과 엘라스틴까지 함유된 상큼한 복숭아맛 파우더",
    serving_size: "1일 1포 (3g)",
    calories: 12,
    protein: 2.8,
    carbs: 0.5,
    fat: 0,
    sugar: 0,
    sodium: 8,
    allergens: ["복숭아"],
    contains_caffeine: false,
    main_ingredients: ["어린콜라겐펩타이드 3,270mg", "히알루론산", "엘라스틴", "복숭아과즙분말"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1577401239170-897942555fb3?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Pink aesthetic collagen supplement powder stick and glass of infused water with peach accent",
    rating: 4.8,
    review_count: 1120,
    badges: ["피부탄력", "저분자"]
  },
  {
    id: 79,
    name: "옥타코사놀 아르기닌 맥스 활력환 30포",
    brand: "CARE LABS",
    category: "영양제·비타민",
    price: 29900,
    original_price: 39000,
    stock: 60,
    summary: "철새의 지구력 원천 옥타코사놀 40mg과 L-아르기닌 3,000mg을 담은 남성 에너자이저 포뮬러",
    serving_size: "1일 1포 (4g)",
    calories: 15,
    protein: 3.2,
    carbs: 0.8,
    fat: 0.1,
    sugar: 0,
    sodium: 5,
    allergens: [],
    contains_caffeine: false,
    main_ingredients: ["L-아르기닌", "옥타코사놀함유유지", "마카추출분말", "아연"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Black modern box with vitality herbal pills neatly displayed on dark slate",
    rating: 4.8,
    review_count: 480,
    badges: ["지구력", "남성활력"]
  },
  {
    id: 80,
    name: "이뮨 아연 비타민C 츄어블 90정",
    brand: "VITAL BOTANICS",
    category: "영양제·비타민",
    price: 15900,
    original_price: 20000,
    stock: 110,
    summary: "물 없이 맛있게 씹어먹는 상큼한 오렌지맛 활력 관리용 글루콘산 아연 & 비타민C",
    serving_size: "1일 1정",
    calories: 5,
    protein: 0,
    carbs: 1.2,
    fat: 0,
    sugar: 0.8,
    sodium: 0,
    allergens: [],
    contains_caffeine: false,
    main_ingredients: ["글루콘산아연 12mg", "영국산 비타민C 500mg"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Chewable orange vitamin tablets scattered next to eco friendly glass container",
    rating: 4.7,
    review_count: 730,
    badges: ["면역기능", "온가족"]
  },

  // 9. 소스·조미료 (81~90)
  {
    id: 81,
    name: "제로슈가 저칼로리 스위트 칠리소스 310g",
    brand: "FIT MEAL",
    category: "소스·조미료",
    price: 4500,
    original_price: 5500,
    stock: 160,
    summary: "당류 0g! 설탕 대신 알룰로스로 닭가슴살의 퍽퍽함을 달콤매콤하게 해결해주는 소스",
    serving_size: "1회 (30g)",
    calories: 8,
    protein: 0.2,
    carbs: 2.1,
    fat: 0,
    sugar: 0,
    sodium: 190,
    allergens: ["대두"],
    contains_caffeine: false,
    main_ingredients: ["알룰로스", "홍고추퓨레 20%", "양조식초", "천일염"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1472476443507-c7a5948772fc?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Red chili sauce poured in small porcelain dipping dish with fresh red chili on side",
    rating: 4.9,
    review_count: 2890,
    badges: ["BEST", "저당", "저칼로리"]
  },
  {
    id: 82,
    name: "저염 무설탕 알룰로스 진양조간장 500ml",
    brand: "GREEN TABLE",
    category: "소스·조미료",
    price: 6800,
    original_price: 8500,
    stock: 85,
    summary: "일반 간장 대비 나트륨을 40% 덜어내고 국산 콩으로 빚어낸 순하고 깊은 맛의 건강 간장",
    serving_size: "1스푼 (15ml)",
    calories: 10,
    protein: 1.2,
    carbs: 1.5,
    fat: 0,
    sugar: 0.2,
    sodium: 480,
    allergens: ["대두", "밀"],
    contains_caffeine: false,
    main_ingredients: ["국산대두 50%", "국산소맥 30%", "알룰로스", "천일염"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Artisan glass bottle of dark rich low-sodium soy sauce with ceramic pouring cup",
    rating: 4.8,
    review_count: 540,
    badges: ["저염", "저당"]
  },
  {
    id: 83,
    name: "제로 알룰로스 불닭 스파이시 소스 280g",
    brand: "FIT MEAL",
    category: "소스·조미료",
    price: 4900,
    original_price: 6000,
    stock: 140,
    summary: "눈물나게 화끈한 매운맛을 칼로리와 당류 걱정 없이 즐기는 하드 다이어터의 필수템",
    serving_size: "1회 (20g)",
    calories: 12,
    protein: 0.5,
    carbs: 2.8,
    fat: 0.1,
    sugar: 0,
    sodium: 230,
    allergens: ["대두", "닭고기"],
    contains_caffeine: false,
    main_ingredients: ["하바네로고추분말", "알룰로스", "치킨추출농축액", "파프리카추출색소"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1526318897912-328339143386?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Vibrant spicy red hot sauce dripping on grilled chicken meat, appetizing commercial lighting",
    rating: 4.7,
    review_count: 1420,
    badges: ["무설탕", "매운맛"]
  },
  {
    id: 84,
    name: "올리브유로 만든 제로 저당 마요네즈 240g",
    brand: "BALANCE ON",
    category: "소스·조미료",
    price: 5900,
    original_price: 7200,
    stock: 75,
    summary: "대두유 대신 엑스트라 버진 올리브유 100%와 신선한 난황으로 빚어낸 건강한 마요",
    serving_size: "1회 (15g)",
    calories: 75,
    protein: 0.3,
    carbs: 0.5,
    fat: 8.0,
    sugar: 0,
    sodium: 95,
    allergens: ["계란"],
    contains_caffeine: false,
    main_ingredients: ["엑스트라버진올리브유 70%", "국산난황 15%", "식초", "레몬즙"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Creamy silky mayonnaise dollop in clear glass dish with olive sprig decoration",
    rating: 4.8,
    review_count: 670,
    badges: ["키토", "저당"]
  },
  {
    id: 85,
    name: "무설탕 저칼로리 토마토 케첩 320g",
    brand: "CARE LABS",
    category: "소스·조미료",
    price: 4300,
    original_price: 5200,
    stock: 110,
    summary: "완숙 토마토의 진한 풍미 그대로, 설탕을 전혀 넣지 않고 자연 단맛을 살린 정통 케첩",
    serving_size: "1회 (30g)",
    calories: 15,
    protein: 0.6,
    carbs: 3.2,
    fat: 0,
    sugar: 1.1,
    sodium: 180,
    allergens: [],
    contains_caffeine: false,
    main_ingredients: ["토마토페이스트 75%", "발효식초", "알룰로스", "천일염"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1526318897912-328339143386?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Thick fresh tomato ketchup swirling in modern white bowl next to fresh ripe tomatoes",
    rating: 4.8,
    review_count: 890,
    badges: ["무설탕"]
  },
  {
    id: 86,
    name: "핑크 히말라야 락솔트 그라인더 200g",
    brand: "DAILY ROOT",
    category: "소스·조미료",
    price: 7500,
    original_price: 9500,
    stock: 90,
    summary: "2억 5천만 년 태고의 순수함을 간직한 미세플라스틱 0% 자연 미네랄 핑크 소금",
    serving_size: "1회 (1g)",
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    sugar: 0,
    sodium: 380,
    allergens: [],
    contains_caffeine: false,
    main_ingredients: ["히말라야암염 100%"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Coarse pink Himalayan rock salt crystals in a modern glass grinder with scattered pink grains",
    rating: 4.9,
    review_count: 620,
    badges: ["자연암염"]
  },
  {
    id: 87,
    name: "천연 효모 추출 비건 감칠맛 채수 파우더 120g",
    brand: "GREEN TABLE",
    category: "소스·조미료",
    price: 8900,
    original_price: 11000,
    stock: 60,
    summary: "쇠고기나 멸치 없이 표고버섯, 무, 대파, 양파만을 농축 건조해 국물 요리에 깊은 감칠맛 부여",
    serving_size: "1스푼 (5g)",
    calories: 12,
    protein: 1.0,
    carbs: 2.0,
    fat: 0,
    sugar: 0.5,
    sodium: 140,
    allergens: [],
    contains_caffeine: false,
    main_ingredients: ["표고버섯분말 35%", "무추출분말 25%", "효모추출물 25%"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Fine golden vegetable bouillon seasoning powder in small pottery jar with wooden measuring spoon",
    rating: 4.7,
    review_count: 240,
    badges: ["비건", "저염"]
  },
  {
    id: 88,
    name: "무가당 100% 볶은 땅콩 피넛버터 크런치 340g",
    brand: "WELL BITE",
    category: "소스·조미료",
    price: 9900,
    original_price: 12500,
    stock: 95,
    summary: "설탕, 팜유, 보존료 0%! 오직 엄선된 고소한 볶은 땅콩만을 껍질째 빻아 만든 100% 순수 땅콩버터",
    serving_size: "1스푼 (20g)",
    calories: 120,
    protein: 5.5,
    carbs: 3.5,
    fat: 9.8,
    sugar: 0.8,
    sodium: 5,
    allergens: ["견과류"],
    contains_caffeine: false,
    main_ingredients: ["볶은땅콩 100%"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1568651316499-19ec6eb91ef1?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Rich natural crunchy peanut butter swirled in glass jar with butter knife covered in peanut paste",
    rating: 4.9,
    review_count: 1560,
    badges: ["BEST", "무설탕", "단일원료"]
  },
  {
    id: 89,
    name: "제로 알룰로스 머스타드 딥 소스 260g",
    brand: "FARM POCKET",
    category: "소스·조미료",
    price: 4400,
    original_price: 5400,
    stock: 80,
    summary: "알싸한 홀그레인 머스타드 씨드가 톡톡 터지는 담백한 샌드위치 & 샐러드 드레싱 소스",
    serving_size: "1회 (25g)",
    calories: 14,
    protein: 0.4,
    carbs: 2.2,
    fat: 0.4,
    sugar: 0,
    sodium: 170,
    allergens: [],
    contains_caffeine: false,
    main_ingredients: ["홀그레인겨자씨 20%", "양조식초", "알룰로스", "강황"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1472476443507-c7a5948772fc?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Zesty yellow whole grain mustard in clear glass dipping bowl on textured cloth",
    rating: 4.6,
    review_count: 380,
    badges: ["저당"]
  },
  {
    id: 90,
    name: "천연 아카시아 생 알룰로스 시럽 480g",
    brand: "CARE LABS",
    category: "소스·조미료",
    price: 8500,
    original_price: 10500,
    stock: 130,
    summary: "물엿, 설탕 대신 요리에 윤기와 은은한 단맛을 더해주는 칼로리 1/10 액상 감미료",
    serving_size: "1스푼 (15g)",
    calories: 1.5,
    protein: 0,
    carbs: 11,
    fat: 0,
    sugar: 0,
    sodium: 0,
    allergens: [],
    contains_caffeine: false,
    main_ingredients: ["액상알룰로스 99.8%", "천연아카시아향"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Crystal clear sweet allulose syrup dripping gracefully from a wooden honey dipper",
    rating: 4.9,
    review_count: 1740,
    badges: ["무설탕", "요리필수"]
  },

  // 10. 기타 건강식품 (91~100)
  {
    id: 91,
    name: "유기농 엑스트라버진 냉압착 아보카도 오일 250ml",
    brand: "DAILY ROOT",
    category: "기타 건강식품",
    price: 16900,
    original_price: 21000,
    stock: 65,
    summary: "멕시코산 HASS 아보카도 20개를 저온 압착해 발연점이 높아 고온 볶음 요리에도 안전한 오일",
    serving_size: "1스푼 (10ml)",
    calories: 82,
    protein: 0,
    carbs: 0,
    fat: 9.2,
    sugar: 0,
    sodium: 0,
    allergens: [],
    contains_caffeine: false,
    main_ingredients: ["엑스트라버진 아보카도오일 100%"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Rich emerald green pure avocado oil pouring into a porcelain bowl beside fresh sliced avocado",
    rating: 4.8,
    review_count: 610,
    badges: ["단일불포화지방", "저염"]
  },
  {
    id: 92,
    name: "자연 건조 차전자피 식이섬유 100% 200g",
    brand: "BALANCE ON",
    category: "기타 건강식품",
    price: 11900,
    original_price: 14500,
    stock: 90,
    summary: "물과 만나면 부피가 늘어나는 순수 질경이 씨앗 껍질 식이섬유",
    serving_size: "1회 (5g)",
    calories: 10,
    protein: 0.1,
    carbs: 4.5,
    fat: 0,
    sugar: 0,
    sodium: 5,
    allergens: [],
    contains_caffeine: false,
    main_ingredients: ["인도산 차전자피 100%"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Natural psyllium husk fiber powder in glass tumbler with wooden spoon, morning digestion concept",
    rating: 4.7,
    review_count: 940,
    badges: ["쾌변", "식이섬유"]
  },
  {
    id: 93,
    name: "유기농 무가당 카카오 파우더 200g",
    brand: "GREEN TABLE",
    category: "기타 건강식품",
    price: 8900,
    original_price: 11000,
    stock: 75,
    summary: "폴리페놀 항산화 성분이 풍부한 네덜란드 가공 저온 착유 무설탕 100% 카카오 가루",
    serving_size: "1회 (10g)",
    calories: 35,
    protein: 2.2,
    carbs: 4.0,
    fat: 1.1,
    sugar: 0.1,
    sodium: 3,
    allergens: [],
    contains_caffeine: false,
    main_ingredients: ["유기농카카오원두 100%"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Velvety dark raw cacao powder in a black ceramic bowl with vintage metal spoon dusting powder",
    rating: 4.8,
    review_count: 420,
    badges: ["항산화", "무설탕"]
  },
  {
    id: 94,
    name: "천연 순수 아카시아 튜브 벌꿀 300g",
    brand: "PURE FARM",
    category: "기타 건강식품",
    price: 13500,
    original_price: 16500,
    stock: 55,
    summary: "인공 사양 꿀이 아닌 강원도 청정 숲에서 채밀한 맑고 투명한 100% 천연 꽃꿀",
    serving_size: "1스푼 (15g)",
    calories: 45,
    protein: 0.1,
    carbs: 12,
    fat: 0,
    sugar: 11.5,
    sodium: 1,
    allergens: [],
    contains_caffeine: false,
    main_ingredients: ["국산천연아카시아벌꿀 100%"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Golden clear raw acacia honey dripping into small jar, warm amber sunlight",
    rating: 4.9,
    review_count: 530,
    badges: ["천연벌꿀", "순수자연"]
  },
  {
    id: 95,
    name: "국산 발효 흑마늘 진액 70ml x 15포",
    brand: "DAILY ROOT",
    category: "기타 건강식품",
    price: 26900,
    original_price: 33000,
    stock: 45,
    summary: "남해 마늘을 45일간 정성껏 발효 숙성하여 매운맛은 빼고 S-알릴시스테인을 극대화한 보양 진액",
    serving_size: "1포 (70ml)",
    calories: 40,
    protein: 1.5,
    carbs: 9.0,
    fat: 0.1,
    sugar: 4.5,
    sodium: 15,
    allergens: [],
    contains_caffeine: false,
    main_ingredients: ["발효흑마늘추출액 95%", "대추농축액"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Aged fermented black garlic cloves resting next to a premium dark tonic pouch",
    rating: 4.8,
    review_count: 360,
    badges: ["원기회복", "발효"]
  },
  {
    id: 96,
    name: "콜드프레스 유기농 로우 MCT 오일 C8 99% 500ml",
    brand: "CARE LABS",
    category: "기타 건강식품",
    price: 21900,
    original_price: 27000,
    stock: 80,
    summary: "가장 빠른 케톤 에너지 생성을 돕는 카프릴산 C8 순도 99% 무색무취 프리미엄 방탄오일",
    serving_size: "1회 (10ml)",
    calories: 86,
    protein: 0,
    carbs: 0,
    fat: 10.0,
    sugar: 0,
    sodium: 0,
    allergens: [],
    contains_caffeine: false,
    main_ingredients: ["코코넛유래 중쇄지방산 C8 99%"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Clear sleek glass bottle of pure MCT oil with clean dropper cap, minimalist kitchen countertop",
    rating: 4.9,
    review_count: 1210,
    badges: ["키토필수", "C8_99%"]
  },
  {
    id: 97,
    name: "제주 유기농 녹차 카테킨 분말 100g",
    brand: "VITAL BOTANICS",
    category: "기타 건강식품",
    price: 11000,
    original_price: 13500,
    stock: 70,
    summary: "화산암반수를 머금고 자란 제주 어린 찻잎만을 갈아 만든 항산화 EGCG 카테킨 파우더",
    serving_size: "1스푼 (2g)",
    calories: 6,
    protein: 0.5,
    carbs: 1.0,
    fat: 0,
    sugar: 0,
    sodium: 1,
    allergens: [],
    contains_caffeine: true,
    main_ingredients: ["제주산유기농녹차가루 100%"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Vivid bright green matcha tea powder whisked with bamboo chasen, organic Japanese aesthetic",
    rating: 4.7,
    review_count: 430,
    badges: ["카테킨", "카페인포함"]
  },
  {
    id: 98,
    name: "스위트 바질씨드 워터 믹스 150g",
    brand: "FARM POCKET",
    category: "기타 건강식품",
    price: 7500,
    original_price: 9000,
    stock: 90,
    summary: "음료에 타서 마시면 수분을 흡수해 포만감을 채워주는 천연 식물성 다이어트 씨앗",
    serving_size: "1스푼 (10g)",
    calories: 25,
    protein: 1.2,
    carbs: 4.0,
    fat: 0.8,
    sugar: 0.1,
    sodium: 2,
    allergens: [],
    contains_caffeine: false,
    main_ingredients: ["바질씨앗 100%"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Swollen translucent basil seeds hydrated in a tall glass of cool citrus water",
    rating: 4.5,
    review_count: 210,
    badges: ["포만감", "식이섬유"]
  },
  {
    id: 99,
    name: "동결건조 맥주효모 분말 250g",
    brand: "NUTRI HOUSE",
    category: "기타 건강식품",
    price: 12500,
    original_price: 15000,
    stock: 60,
    summary: "맥주 양조의 발효 부산물에서 영양을 추출해 비오틴과 아미노산이 풍부한 모발 영양 분말",
    serving_size: "1스푼 (5g)",
    calories: 18,
    protein: 2.5,
    carbs: 1.8,
    fat: 0.2,
    sugar: 0.2,
    sodium: 10,
    allergens: [],
    contains_caffeine: false,
    main_ingredients: ["리투아니아산 건조맥주효모 100%"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Fine golden brewer yeast flakes in ceramic pot with scattered wheat stalks",
    rating: 4.6,
    review_count: 380,
    badges: ["비오틴", "고단백"]
  },
  {
    id: 100,
    name: "유기농 야생 빌베리 루테인 파우더 100g",
    brand: "VITAL BOTANICS",
    category: "기타 건강식품",
    price: 18900,
    original_price: 24000,
    stock: 50,
    summary: "북유럽 핀란드 야생 빌베리를 통째로 갈아 안토시아닌이 블루베리의 4배에 달하는 파우더",
    serving_size: "1스푼 (3g)",
    calories: 10,
    protein: 0.2,
    carbs: 2.2,
    fat: 0.1,
    sugar: 1.2,
    sodium: 1,
    allergens: [],
    contains_caffeine: false,
    main_ingredients: ["핀란드산 야생동결건조빌베리 100%"],
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=600&auto=format&fit=crop&q=80",
    image_prompt: "Deep purple wild bilberry powder spilled gently on fine stone plate with dry berries",
    rating: 4.8,
    review_count: 490,
    badges: ["안토시아닌", "항산화"]
  }
];

// ============================================================================
// 2. 카테고리 및 필터 상수
// ============================================================================
const CATEGORIES = [
  "전체",
  "닭가슴살·고단백 식품",
  "도시락·간편식",
  "프로틴바·건강간식",
  "시리얼·그래놀라",
  "유제품·대체유",
  "음료·프로틴음료",
  "견과·건과류",
  "영양제·비타민",
  "소스·조미료",
  "기타 건강식품"
];

const ALLERGEN_OPTIONS = ["우유", "대두", "계란", "견과류", "밀", "닭고기", "쇠고기", "복숭아"];

// ============================================================================
// 3. 메인 컴포넌트: CareMarket App
// ============================================================================
export default function App() {
  // 상태 관리
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [selectedGoal, setSelectedGoal] = useState("all"); // 'all', 'muscle', 'diet', 'low_sodium'
  const [sortBy, setSortBy] = useState("recommended");
  
  // 보조 필터 상태
  const [filterLowSugar, setFilterLowSugar] = useState(false);
  const [filterLowSodium, setFilterLowSodium] = useState(false);
  const [filterHighProtein, setFilterHighProtein] = useState(false);
  const [filterNoCaffeine, setFilterNoCaffeine] = useState(false);
  const [excludedAllergens, setExcludedAllergens] = useState([]);
  
  // UI 모달 상태
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [wishlist, setWishlist] = useState({});
  const [cartCount, setCartCount] = useState(3);
  const [toastMessage, setToastMessage] = useState("");

  // 토스트 메시지 헬퍼
  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 2200);
  };

  // 위시리스트 토글
  const toggleWishlist = (id, e) => {
    e.stopPropagation();
    setWishlist(prev => {
      const next = { ...prev, [id]: !prev[id] };
      triggerToast(next[id] ? "관심 상품에 담았습니다." : "관심 상품에서 삭제했습니다.");
      return next;
    });
  };

  // 장바구니 담기
  const handleAddToCart = (e, name) => {
    e.stopPropagation();
    setCartCount(prev => prev + 1);
    triggerToast(`[${name}] 장바구니에 담았습니다.`);
  };

  // 알레르기 배제 토글
  const toggleAllergen = (allergen) => {
    setExcludedAllergens(prev => 
      prev.includes(allergen) ? prev.filter(a => a !== allergen) : [...prev, allergen]
    );
  };

  // 클립보드 복사 (Single file iFrame 안전 규정 준수)
  const handleCopyJson = () => {
    const jsonStr = JSON.stringify(PRODUCTS_DATA, null, 2);
    const textarea = document.createElement("textarea");
    textarea.value = jsonStr;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      triggerToast("100개 상품 JSON이 클립보드에 복사되었습니다!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      triggerToast("복사에 실패했습니다. 수동으로 복사해주세요.");
    }
    document.body.removeChild(textarea);
  };

  // 100개 데이터 다차원 필터링 & 정렬 연산
  const filteredProducts = useMemo(() => {
    return PRODUCTS_DATA.filter(product => {
      // 1. 카테고리 필터
      if (selectedCategory !== "전체" && product.category !== selectedCategory) {
        return false;
      }

      // 2. 검색어 (상품명, 브랜드, 주요 성분)
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const matchName = product.name.toLowerCase().includes(q);
        const matchBrand = product.brand.toLowerCase().includes(q);
        const matchIng = product.main_ingredients.some(ing => ing.toLowerCase().includes(q));
        if (!matchName && !matchBrand && !matchIng) return false;
      }

      // 3. 건강 목표 필터
      if (selectedGoal === "muscle" && product.protein < 15) return false;
      if (selectedGoal === "diet" && (product.sugar > 2 || product.calories > 320)) return false;
      if (selectedGoal === "low_sodium" && product.sodium > 150) return false;

      // 4. 보조 영양조건 필터
      if (filterLowSugar && product.sugar > 3) return false;
      if (filterLowSodium && product.sodium > 150) return false;
      if (filterHighProtein && product.protein < 15) return false;
      if (filterNoCaffeine && product.contains_caffeine) return false;

      // 5. 알레르기 배제 필터
      if (excludedAllergens.length > 0) {
        const hasExcluded = product.allergens.some(al => excludedAllergens.includes(al));
        if (hasExcluded) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "price_asc") return a.price - b.price;
      if (sortBy === "price_desc") return b.price - a.price;
      if (sortBy === "protein_desc") return b.protein - a.protein;
      if (sortBy === "sugar_asc") return a.sugar - b.sugar;
      if (sortBy === "sodium_asc") return a.sodium - b.sodium;
      // recommended
      return b.rating * 1000 + b.review_count - (a.rating * 1000 + a.review_count);
    });
  }, [
    selectedCategory, searchQuery, selectedGoal, sortBy, 
    filterLowSugar, filterLowSodium, filterHighProtein, 
    filterNoCaffeine, excludedAllergens
  ]);

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-stone-800 font-sans antialiased pb-20">
      {/* 1. 글로벌 네비게이션 헤더 */}
      <header className="sticky top-0 z-30 bg-[#FBF9F5]/90 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1A3826] text-[#FBF9F5] flex items-center justify-center font-bold text-xl tracking-tight shadow-sm">
              C
            </div>
            <div>
              <span className="font-bold text-xl tracking-tight text-[#1A3826]">CareMarket</span>
              <span className="hidden sm:inline-block ml-2 text-xs px-2 py-0.5 rounded-full bg-[#E5EFE7] text-[#224229] font-medium">
                Catalog Demo (100 Items)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              onClick={() => setShowJsonModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#224229]/20 bg-white text-[#224229] hover:bg-[#E5EFE7] text-xs sm:text-sm font-semibold transition shadow-sm"
              title="Supabase seed 데이터로 사용 가능한 100개 JSON 추출"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Export JSON</span>
            </button>

            <div className="relative p-2 text-stone-700 hover:text-[#1A3826] cursor-pointer">
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#1A3826] text-white text-[10px] flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 2. 상단 맞춤 영양 목표 셀렉터 (Hero Bar) */}
      <div className="bg-[#EFECE6] border-b border-stone-200 py-3 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2 text-stone-600">
            <Sparkles className="w-4 h-4 text-[#5B8266]" />
            <span className="font-semibold text-stone-900">맞춤 큐레이션 목표:</span>
            <span>선택한 건강 관리 목표에 맞추어 카탈로그 칩이 강조됩니다.</span>
          </div>

          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-stone-200 shadow-xs">
            <button
              onClick={() => setSelectedGoal("all")}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                selectedGoal === "all" ? "bg-[#1A3826] text-white" : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              전체 보기
            </button>
            <button
              onClick={() => setSelectedGoal("muscle")}
              className={`px-3 py-1 rounded-lg font-medium transition flex items-center gap-1 ${
                selectedGoal === "muscle" ? "bg-[#1A3826] text-white" : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              근육량 증량 (고단백)
            </button>
            <button
              onClick={() => setSelectedGoal("diet")}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                selectedGoal === "diet" ? "bg-[#1A3826] text-white" : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              체중 감량 (저당/저열량)
            </button>
            <button
              onClick={() => setSelectedGoal("low_sodium")}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                selectedGoal === "low_sodium" ? "bg-[#1A3826] text-white" : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              식단 영양 관리 (저염)
            </button>
          </div>
        </div>
      </div>

      {/* 3. 검색 및 필터 컨트롤 바 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-xs mb-6 space-y-4">
          {/* 검색창 & 정렬 */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input 
                type="text"
                placeholder="상품명, 브랜드(CARE LABS 등), 성분 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 bg-[#FBF9F5] text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3826]/30 transition"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <ArrowUpDown className="w-4 h-4 text-stone-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-[#FBF9F5] border border-stone-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1A3826]/30 text-stone-700 cursor-pointer"
              >
                <option value="recommended">추천순 (평점/리뷰)</option>
                <option value="protein_desc">단백질 높은순</option>
                <option value="sugar_asc">당류 낮은순</option>
                <option value="sodium_asc">나트륨 낮은순</option>
                <option value="price_asc">낮은 가격순</option>
                <option value="price_desc">높은 가격순</option>
              </select>
            </div>
          </div>

          {/* 카테고리 가로 스크롤 탭 (10개 + 전체) */}
          <div className="overflow-x-auto pb-1 no-scrollbar border-t border-stone-100 pt-3">
            <div className="flex gap-1.5 w-max">
              {CATEGORIES.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                    selectedCategory === category
                      ? "bg-[#1A3826] text-white shadow-xs"
                      : "bg-[#F5F2EB] text-stone-600 hover:bg-stone-200/70"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* 스마트 영양 태그 토글 & 알레르기 배제 필터 */}
          <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
            {/* 보조 영양 스위치 */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-stone-500 mr-1 flex items-center gap-1">
                <SlidersHorizontal className="w-3.5 h-3.5" /> 빠른 필터:
              </span>
              <button
                onClick={() => setFilterLowSugar(!filterLowSugar)}
                className={`px-2.5 py-1 rounded-lg border transition ${
                  filterLowSugar 
                    ? "bg-[#5B8266] text-white border-[#5B8266]" 
                    : "bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100"
                }`}
              >
                저당 (≤3g)
              </button>
              <button
                onClick={() => setFilterLowSodium(!filterLowSodium)}
                className={`px-2.5 py-1 rounded-lg border transition ${
                  filterLowSodium 
                    ? "bg-[#5B8266] text-white border-[#5B8266]" 
                    : "bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100"
                }`}
              >
                저염 (≤150mg)
              </button>
              <button
                onClick={() => setFilterHighProtein(!filterHighProtein)}
                className={`px-2.5 py-1 rounded-lg border transition ${
                  filterHighProtein 
                    ? "bg-[#5B8266] text-white border-[#5B8266]" 
                    : "bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100"
                }`}
              >
                고단백 (≥15g)
              </button>
              <button
                onClick={() => setFilterNoCaffeine(!filterNoCaffeine)}
                className={`px-2.5 py-1 rounded-lg border transition flex items-center gap-1 ${
                  filterNoCaffeine 
                    ? "bg-[#5B8266] text-white border-[#5B8266]" 
                    : "bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100"
                }`}
              >
                <Coffee className="w-3 h-3" /> 카페인 제외
              </button>
            </div>

            {/* 알레르기 배제 선택 */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-stone-500 font-medium flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-500" /> 알레르기 안심 제외:
              </span>
              {ALLERGEN_OPTIONS.map(allergen => {
                const isExcluded = excludedAllergens.includes(allergen);
                return (
                  <button
                    key={allergen}
                    onClick={() => toggleAllergen(allergen)}
                    className={`px-2 py-0.5 rounded-md border text-[11px] font-medium transition ${
                      isExcluded 
                        ? "bg-rose-50 text-rose-700 border-rose-300 line-through" 
                        : "bg-white text-stone-500 border-stone-200 hover:border-stone-400"
                    }`}
                  >
                    {allergen}
                  </button>
                );
              })}
              {excludedAllergens.length > 0 && (
                <button 
                  onClick={() => setExcludedAllergens([])}
                  className="text-[11px] text-stone-400 underline hover:text-stone-600 ml-1"
                >
                  초기화
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 4. 카탈로그 통계 및 리스트 영역 */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs sm:text-sm text-stone-500">
            총 <span className="font-bold text-[#1A3826]">{filteredProducts.length}</span>개의 시연용 상품이 검색되었습니다.
            {selectedCategory !== "전체" && <span className="ml-1">({selectedCategory})</span>}
          </p>

          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("전체");
              setSelectedGoal("all");
              setFilterLowSugar(false);
              setFilterLowSodium(false);
              setFilterHighProtein(false);
              setFilterNoCaffeine(false);
              setExcludedAllergens([]);
            }}
            className="text-xs text-stone-500 hover:text-stone-800 flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> 필터 전체 초기화
          </button>
        </div>

        {/* 5. 상품 카드 그리드 */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center my-8">
            <Info className="w-12 h-12 mx-auto text-stone-300 mb-3" />
            <h3 className="text-base font-bold text-stone-700">해당 조건에 맞는 상품이 없습니다.</h3>
            <p className="text-sm text-stone-500 mt-1">
              선택한 영양 조건(저당, 저염 등)이나 알레르기 배제 필터를 조금 완화해보세요.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {filteredProducts.map(product => {
              const discountRate = Math.round(
                ((product.original_price - product.price) / product.original_price) * 100
              );
              const isWished = wishlist[product.id];

              // 목표별 하이라이트 영양 성분 추출
              let highlightLabel = "단백질";
              let highlightVal = `${product.protein}g`;
              let highlightBg = "bg-[#E5EFE7] text-[#224229]";

              if (selectedGoal === "diet" || (product.sugar <= 1 && product.sugar > 0)) {
                highlightLabel = "당류";
                highlightVal = `${product.sugar}g`;
                highlightBg = "bg-amber-50 text-amber-900 border border-amber-200/50";
              } else if (selectedGoal === "low_sodium" || product.sodium <= 100) {
                highlightLabel = "나트륨";
                highlightVal = `${product.sodium}mg`;
                highlightBg = "bg-blue-50 text-blue-900 border border-blue-200/50";
              } else if (product.category === "영양제·비타민") {
                highlightLabel = "열량";
                highlightVal = `${product.calories}kcal`;
                highlightBg = "bg-purple-50 text-purple-900";
              }

              return (
                <div 
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className="group bg-white rounded-2xl border border-stone-200/80 hover:border-[#1A3826]/40 overflow-hidden flex flex-col justify-between transition-all duration-200 hover:shadow-md cursor-pointer"
                >
                  {/* 상단 이미지 및 뱃지 */}
                  <div className="relative aspect-4/3 w-full bg-stone-100 overflow-hidden">
                    <img 
                      src={product.image_url} 
                      alt={product.name}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition duration-300"
                      loading="lazy"
                      onError={(e) => {
                        // 깨진 URL 방지 안전 폴백
                        e.target.onerror = null;
                        e.target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80";
                      }}
                    />

                    {/* 배지 태그 */}
                    <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
                      {product.badges.map(b => (
                        <span 
                          key={b}
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#1A3826]/90 text-white tracking-wider backdrop-blur-xs"
                        >
                          {b}
                        </span>
                      ))}
                      {product.contains_caffeine && (
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-600/90 text-white flex items-center gap-0.5">
                          <Coffee className="w-2.5 h-2.5" /> 카페인
                        </span>
                      )}
                    </div>

                    {/* 하트 버튼 */}
                    <button 
                      onClick={(e) => toggleWishlist(product.id, e)}
                      className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-stone-400 hover:text-rose-500 transition shadow-xs"
                      aria-label="관심상품"
                    >
                      <Heart className={`w-4 h-4 ${isWished ? "fill-rose-500 text-rose-500" : ""}`} />
                    </button>
                  </div>

                  {/* 본문 상품 정보 */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-semibold text-[#5B8266] uppercase tracking-wider mb-1">
                        <span>{product.brand}</span>
                        <span className="text-stone-400 font-normal">재고 {product.stock}개</span>
                      </div>

                      <h4 className="font-bold text-stone-900 text-sm line-clamp-2 leading-snug group-hover:text-[#1A3826] transition">
                        {product.name}
                      </h4>

                      <p className="text-xs text-stone-500 mt-1 line-clamp-1">
                        {product.summary}
                      </p>
                    </div>

                    {/* 핵심 맞춤 영양 성분 하이라이트 칩 */}
                    <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] px-2 py-0.5 rounded-md font-semibold ${highlightBg}`}>
                          {highlightLabel} {highlightVal}
                        </span>
                        <span className="text-[10px] text-stone-400">
                          {product.calories}kcal
                        </span>
                      </div>
                      
                      <div className="text-[11px] text-stone-500 font-medium">
                        ★ {product.rating} ({product.review_count})
                      </div>
                    </div>
                  </div>

                  {/* 하단 가격 & 장바구니 버튼 */}
                  <div className="px-4 pb-4 pt-1 flex items-center justify-between border-t border-stone-50">
                    <div>
                      {discountRate > 0 && (
                        <div className="text-[11px] text-stone-400 line-through">
                          {product.original_price.toLocaleString()}원
                        </div>
                      )}
                      <div className="flex items-baseline gap-1">
                        {discountRate > 0 && (
                          <span className="text-sm font-black text-rose-600">
                            {discountRate}%
                          </span>
                        )}
                        <span className="text-base font-extrabold text-stone-900">
                          {product.price.toLocaleString()}원
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleAddToCart(e, product.name)}
                      className="p-2 rounded-xl bg-[#F5F2EB] text-[#1A3826] hover:bg-[#1A3826] hover:text-white transition shadow-2xs"
                      title="장바구니 담기"
                    >
                      <ShoppingBag className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 6. 상품 상세 모달 UI */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-stone-200 shadow-2xl p-6 sm:p-8 relative">
            <button 
              onClick={() => setSelectedProduct(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* 이미지 및 프롬프트 정보 */}
              <div>
                <div className="aspect-square rounded-2xl overflow-hidden bg-stone-100 border border-stone-100">
                  <img 
                    src={selectedProduct.image_url} 
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="mt-3 p-3 bg-stone-50 rounded-xl border border-stone-200 text-[11px] text-stone-600">
                  <span className="font-bold text-stone-800 block mb-0.5">Image Prompt (Imagen / Mock):</span>
                  <p className="italic">{selectedProduct.image_prompt}</p>
                </div>
              </div>

              {/* 기본 정보 및 가격 */}
              <div className="flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold text-[#5B8266] uppercase tracking-wider">
                    {selectedProduct.brand} · {selectedProduct.category}
                  </div>
                  <h3 className="text-xl font-extrabold text-stone-900 mt-1 leading-snug">
                    {selectedProduct.name}
                  </h3>
                  <p className="text-sm text-stone-600 mt-2">
                    {selectedProduct.summary}
                  </p>

                  <div className="mt-4 p-3 rounded-xl bg-[#FBF9F5] border border-stone-200">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-stone-900">
                        {selectedProduct.price.toLocaleString()}원
                      </span>
                      {selectedProduct.original_price > selectedProduct.price && (
                        <span className="text-sm text-stone-400 line-through">
                          {selectedProduct.original_price.toLocaleString()}원
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-stone-500 mt-1 flex gap-3">
                      <span>1회 제공량: <b>{selectedProduct.serving_size}</b></span>
                      <span>남은 재고: <b>{selectedProduct.stock}개</b></span>
                    </div>
                  </div>
                </div>

                {/* 알레르기 및 카페인 배지 */}
                <div className="my-4 space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-stone-700 min-w-16">알레르기 정보:</span>
                    {selectedProduct.allergens.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {selectedProduct.allergens.map(al => (
                          <span key={al} className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-medium">
                            {al}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-emerald-700 font-medium">알레르기 유발물질 없음 (안심)</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-stone-700 min-w-16">카페인 여부:</span>
                    <span className={selectedProduct.contains_caffeine ? "text-amber-700 font-bold" : "text-stone-500"}>
                      {selectedProduct.contains_caffeine ? "카페인 함유 제품" : "무카페인 (카페인 프리)"}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={(e) => {
                      handleAddToCart(e, selectedProduct.name);
                      setSelectedProduct(null);
                    }}
                    className="flex-1 py-3 rounded-xl bg-[#1A3826] text-white font-bold hover:bg-[#224229] transition shadow-md"
                  >
                    장바구니 담기
                  </button>
                </div>
              </div>
            </div>

            {/* 영양성분 상세 매트릭스 */}
            <div className="mt-6 pt-6 border-t border-stone-200">
              <h4 className="text-sm font-bold text-stone-900 mb-3 flex items-center justify-between">
                <span>영양 정보 (Serving Nutrition Matrix)</span>
                <span className="text-xs font-normal text-stone-500">1회 제공량 기준</span>
              </h4>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                  <div className="text-[11px] text-stone-500">열량</div>
                  <div className="text-base font-extrabold text-stone-800 mt-0.5">{selectedProduct.calories}</div>
                  <div className="text-[10px] text-stone-400">kcal</div>
                </div>
                <div className="p-3 bg-[#E5EFE7] rounded-xl border border-[#D0E2D3]">
                  <div className="text-[11px] text-[#224229] font-bold">단백질</div>
                  <div className="text-base font-extrabold text-[#1A3826] mt-0.5">{selectedProduct.protein}</div>
                  <div className="text-[10px] text-[#224229]">g</div>
                </div>
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                  <div className="text-[11px] text-stone-500">탄수화물</div>
                  <div className="text-base font-extrabold text-stone-800 mt-0.5">{selectedProduct.carbs}</div>
                  <div className="text-[10px] text-stone-400">g</div>
                </div>
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                  <div className="text-[11px] text-stone-500">지방</div>
                  <div className="text-base font-extrabold text-stone-800 mt-0.5">{selectedProduct.fat}</div>
                  <div className="text-[10px] text-stone-400">g</div>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <div className="text-[11px] text-amber-800 font-bold">당류</div>
                  <div className="text-base font-extrabold text-amber-900 mt-0.5">{selectedProduct.sugar}</div>
                  <div className="text-[10px] text-amber-700">g</div>
                </div>
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                  <div className="text-[11px] text-stone-500">나트륨</div>
                  <div className="text-base font-extrabold text-stone-800 mt-0.5">{selectedProduct.sodium}</div>
                  <div className="text-[10px] text-stone-400">mg</div>
                </div>
              </div>

              {/* 주요 원재료 리스트 */}
              <div className="mt-4 p-3.5 bg-[#FBF9F5] rounded-xl border border-stone-200">
                <span className="text-xs font-bold text-stone-700 block mb-1.5">주요 원재료:</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedProduct.main_ingredients.map((ing, idx) => (
                    <span key={idx} className="text-xs px-2.5 py-1 rounded-md bg-white border border-stone-200 text-stone-700">
                      {ing}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Export JSON 모달 (Codex 및 Supabase seed 용도) */}
      {showJsonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col border border-stone-200 shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <div>
                <h3 className="text-lg font-bold text-stone-900">100개 상품 Mock JSON 데이터</h3>
                <p className="text-xs text-stone-500">
                  CareMarket 프로젝트의 Codex 또는 Supabase seed.ts에 그대로 주입할 수 있습니다.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyJson}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1A3826] text-white hover:bg-[#224229] text-xs font-semibold transition"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? "복사 완료!" : "전체 JSON 복사"}</span>
                </button>
                <button
                  onClick={() => setShowJsonModal(false)}
                  className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto my-4 bg-stone-900 rounded-xl p-4 font-mono text-xs text-emerald-400 selection:bg-emerald-800">
              <pre>{JSON.stringify(PRODUCTS_DATA, null, 2)}</pre>
            </div>

            <div className="pt-2 text-xs text-stone-500 flex items-center justify-between">
              <span>총 100개 상품 · 10개 카테고리 (카테고리당 10개 완비)</span>
              <button
                onClick={() => setShowJsonModal(false)}
                className="px-4 py-2 rounded-lg border border-stone-200 font-medium hover:bg-stone-50 text-stone-700"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. 간이 알림 토스트 (No alert() 규칙 준수) */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1A3826] text-white px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
