import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  filterAndSort,
  goalScoreDetails,
  hasComparableNutrition,
} from '../src/lib/catalog.js'

const rawProducts = JSON.parse(
  readFileSync(new URL('../data/products.seed.json', import.meta.url), 'utf8'),
)

const products = rawProducts.map((row, index) => ({
  id: index + 1,
  name: row.name,
  brand: row.brand,
  category: row.category,
  price: row.price,
  originalPrice: row.original_price ?? row.price,
  stock: row.stock,
  isActive: row.is_active,
  allergens: row.allergens,
  caffeine: row.contains_caffeine,
  nutrition: {
    calories: row.calories,
    protein: row.protein,
    sugar: row.sugar,
    sodium: row.sodium,
  },
}))

const SUPPLEMENT = '영양제·비타민'

function recommend(goal, { subFilters = [], allergies = [], source = products } = {}) {
  return filterAndSort(source, {
    search: '',
    subFilters,
    allergies,
    sortBy: 'recommend',
    goal,
    shopCategory: '전체상품',
    shopSub: '전체',
  })
}

function categoryCounts(items) {
  return Object.values(Object.groupBy(items, (product) => product.category))
    .map((group) => group.length)
}

test('weight control prioritizes meal-capable foods without removing supplements', () => {
  const result = recommend('체중 관리')
  const topTen = result.slice(0, 10)

  assert.equal(topTen.some((product) => product.category === SUPPLEMENT), false)
  assert.equal(topTen.every((product) => [
    '도시락·간편식',
    '닭가슴살·고단백 식품',
    '프로틴바·건강간식',
    '시리얼·그래놀라',
  ].includes(product.category)), true)
  assert.equal(result.some((product) => product.category === SUPPLEMENT), true)
})

test('low-sugar weight control does not let zero-sugar supplements occupy the top', () => {
  const result = recommend('체중 관리', { subFilters: ['저당'] })
  const topTen = result.slice(0, 10)

  assert.equal(result.every((product) => product.nutrition.sugar <= 5), true)
  assert.equal(topTen.some((product) => product.category === SUPPLEMENT), false)
})

test('nutrition management prioritizes foods and keeps nutrition filters as hard filters', () => {
  const defaultTopTen = recommend('식단 영양 관리').slice(0, 10)
  const filtered = recommend('식단 영양 관리', { subFilters: ['저염', '고단백'] })

  assert.equal(defaultTopTen.some((product) => product.category === SUPPLEMENT), false)
  assert.equal(filtered.length > 0, true)
  assert.equal(filtered.every((product) => (
    product.nutrition.sodium <= 250 && product.nutrition.protein >= 15
  )), true)

  const impossible = recommend('식단 영양 관리', {
    subFilters: ['고단백'],
    source: products.filter((product) => product.category === SUPPLEMENT),
  })
  assert.deepEqual(impossible, [])
})

test('muscle gain favors real protein foods rather than general supplements', () => {
  const topTen = recommend('근육량 증가', { subFilters: ['고단백'] }).slice(0, 10)

  assert.equal(topTen[0].category, '닭가슴살·고단백 식품')
  assert.equal(topTen.some((product) => product.category === SUPPLEMENT), false)
  assert.equal(topTen.every((product) => product.nutrition.protein >= 15), true)
})

test('supplement search keeps supplements ahead of every food category', () => {
  const topTen = recommend('영양제 탐색').slice(0, 10)

  assert.equal(topTen.length, 10)
  assert.equal(topTen.every((product) => product.category === SUPPLEMENT), true)
})

test('allergy and caffeine exclusions remain hard filters after ranking', () => {
  const result = recommend('체중 관리', {
    subFilters: ['카페인 제외'],
    allergies: ['닭고기'],
  })

  assert.equal(result.every((product) => !product.caffeine), true)
  assert.equal(result.every((product) => !product.allergens.includes('닭고기')), true)
})

test('supplement zeroes are neutral for food goals, not perfect nutrition values', () => {
  const zeroSupplement = products.find((product) => product.id === 74)
  const meal = products.find((product) => product.id === 16)
  const supplementDetails = goalScoreDetails(zeroSupplement, '체중 관리')
  const mealDetails = goalScoreDetails(meal, '체중 관리')

  assert.equal(hasComparableNutrition(zeroSupplement, '체중 관리'), false)
  assert.equal(supplementDetails.nutrition, 0)
  assert.equal(supplementDetails.dataReliability, 0)
  assert.equal(hasComparableNutrition(meal, '체중 관리'), true)
  assert.equal(mealDetails.total > supplementDetails.total, true)
})

test('top recommendations stay relevant while limiting exact-category concentration', () => {
  for (const goal of ['체중 관리', '식단 영양 관리', '근육량 증가']) {
    const counts = categoryCounts(recommend(goal).slice(0, 10))
    assert.equal(Math.max(...counts) <= 3, true, `${goal} category count exceeded 3`)
  }
})

test('unavailable products stay out and equal-score products retain id order', () => {
  const base = products.find((product) => product.id === 16)
  const unavailable = { ...base, id: 999, stock: 0 }
  const inactive = { ...base, id: 998, isActive: false }
  const later = { ...base, id: 202 }
  const earlier = { ...base, id: 201 }
  const result = recommend('체중 관리', { source: [unavailable, later, inactive, earlier] })

  assert.deepEqual(result.map((product) => product.id), [201, 202])
})
