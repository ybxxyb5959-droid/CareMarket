import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  CATEGORIES,
  matchCategory,
  normalizeCategoryName,
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY,
  productGroup,
} from '../src/data/mock.js'

const products = JSON.parse(
  readFileSync(new URL('../data/products.seed.json', import.meta.url), 'utf8'),
)

const menuCategories = CATEGORIES.filter((category) => category.name !== '전체상품')

test('every catalog product is reachable from at least one category menu', () => {
  const uncategorized = products.filter((product) => (
    !menuCategories.some((category) => matchCategory(product, category.name, '전체'))
  ))

  assert.equal(products.length, 100)
  assert.deepEqual(uncategorized, [])
})

test('category menu counts cover the complete catalog without accidental overlap', () => {
  const counts = Object.fromEntries(menuCategories.map((category) => [
    category.name,
    products.filter((product) => matchCategory(product, category.name, '전체')).length,
  ]))

  assert.deepEqual(counts, {
    프로틴: 15,
    간편식: 20,
    건강음료: 12,
    건강간식: 22,
    영양제: 10,
    '소스·조미료': 10,
    건강식품: 11,
  })
  assert.equal(Object.values(counts).reduce((sum, count) => sum + count, 0), products.length)
})

test('category matching tolerates spacing, case and common middle-dot variants', () => {
  const sauce = products.find((product) => product.category === '소스·조미료')
  const normalizedProduct = { ...sauce, category: ' 소스 ㆍ 조미료 ' }

  assert.equal(normalizeCategoryName(' Protein '), 'protein')
  assert.equal(productGroup(normalizedProduct), '소스·조미료')
  assert.equal(matchCategory(normalizedProduct, ' 소스 · 조미료 ', '전체'), true)
  assert.equal(matchCategory(normalizedProduct, '존재하지 않는 카테고리', '전체'), false)
})

test('protein bar snack has one canonical menu path under protein', () => {
  const proteinMenu = CATEGORIES.find((category) => category.name === '프로틴')
  const healthySnackMenu = CATEGORIES.find((category) => category.name === '건강간식')
  const proteinBarMenus = CATEGORIES.flatMap((category) => (
    (category.subs || [])
      .filter((sub) => sub.db?.includes(PRODUCT_CATEGORY.PROTEIN_SNACK))
      .map((sub) => ({ category: category.name, sub: sub.name }))
  ))

  assert.deepEqual(proteinBarMenus, [{ category: '프로틴', sub: '프로틴 바·스낵' }])
  assert.equal(proteinMenu.subs.some((sub) => sub.name === '프로틴 바·스낵'), true)
  assert.equal(healthySnackMenu.subs.some((sub) => sub.db?.includes(PRODUCT_CATEGORY.PROTEIN_SNACK)), false)
})

test('the canonical protein bar snack path includes every product with its stored category', () => {
  const proteinBarProducts = products.filter((product) => (
    product.category === PRODUCT_CATEGORY.PROTEIN_SNACK
  ))
  const canonicalResults = products.filter((product) => (
    matchCategory(product, '프로틴', '프로틴 바·스낵')
  ))

  assert.equal(proteinBarProducts.length, 10)
  assert.deepEqual(canonicalResults, proteinBarProducts)
  assert.equal(proteinBarProducts.every((product) => productGroup(product) === '프로틴'), true)
})

test('healthy snack keeps its other subcategories and admin categories stay unique', () => {
  assert.equal(products.filter((product) => matchCategory(product, '건강간식', '견과·건과류')).length, 10)
  assert.equal(products.filter((product) => matchCategory(product, '건강간식', '시리얼·그래놀라')).length, 10)
  assert.equal(new Set(PRODUCT_CATEGORIES).size, PRODUCT_CATEGORIES.length)
  assert.equal(PRODUCT_CATEGORIES.filter((category) => category === PRODUCT_CATEGORY.PROTEIN_SNACK).length, 1)
})
