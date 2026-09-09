import { combineReviewSummary, fetchProductReviewSummary } from '../src/lib/reviews.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { filterAndSort } from '../src/lib/catalog.js'
import { filterAiProducts } from '../src/lib/ai-search.js'
import { finalizeConditions } from '../supabase/functions/_shared/ai-search-contract.js'
import { nutrientNumber, LOW_SUGAR_MAX, LOW_SODIUM_MAX, HIGH_PROTEIN_MIN } from '../supabase/functions/_shared/nutrition-policy.js'
import { cartNutritionTotals, fmtNutrient } from '../src/lib/nutrition.js'
import { parseAppLocation } from '../src/lib/navigation.js'
import { safeReturnPath, rememberAuthReturn, consumeAuthReturn } from '../src/lib/auth-return.js'
import { canonicalProductCategory, PRODUCT_CATEGORY, getSampleReviews, getSampleReviewSummary } from '../src/data/mock.js'
import { usesCatalogDemoActives } from '../supabase/functions/_shared/product-type.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const source = read('src/lib/products.js').replace(/^import .*\r?\n/gm, '').replaceAll('export ', '')
const adaptProductRow = new Function('nutrientNumber', 'LOW_SUGAR_MAX', 'LOW_SODIUM_MAX', 'HIGH_PROTEIN_MIN', 'canonicalProductCategory', 'PRODUCT_CATEGORY', 'usesCatalogDemoActives', 'resolveProductImage', source + '\nreturn adaptProductRow')(nutrientNumber, LOW_SUGAR_MAX, LOW_SODIUM_MAX, HIGH_PROTEIN_MIN, canonicalProductCategory, PRODUCT_CATEGORY, usesCatalogDemoActives, () => '')
const rows = JSON.parse(read('data/products.seed.json'))
const products = rows.map((row, i) => adaptProductRow({ ...row, product_id: i + 1 }))
const options = { search: '', subFilters: [], allergies: [], sortBy: 'recommend', goal: '식단 영양 관리', shopCategory: '전체상품', shopSub: '전체' }
const ids = items => items.map(p => p.id).sort((a, b) => a - b)

test('ordinary search preserves single/empty/no-result and matches all tokens across existing fields', () => {
  const single = filterAndSort(products, { ...options, search: '단백질' })
  const multiple = filterAndSort(products, { ...options, search: '  단백질   간편식  ' })
  assert.ok(single.length)
  assert.ok(multiple.length)
  assert.ok(multiple.every(p => single.some(one => one.id === p.id)))
  assert.ok(multiple.every(p => [p.name, p.brand, p.category, ...p.tags].join(' ').includes('간편식')))
  assert.deepEqual(ids(filterAndSort(products, { ...options, search: '   ' })), ids(filterAndSort(products, options)))
  assert.equal(filterAndSort(products, { ...options, search: '존재하지않는상품xyz' }).length, 0)
})

test('qualitative AI and ordinary nutrition filters share the existing thresholds; explicit numbers win', () => {
  for (const [tag, flag, key, value] of [['저당', 'low_sugar', 'sugar_max', 5], ['저염', 'low_sodium', 'sodium_max', 250], ['고단백', 'high_protein', 'protein_min', 15]]) {
    const condition = finalizeConditions({ qualitative_filters: [flag] }, tag + ' 식품 찾아줘')
    assert.equal(condition[key], value)
    const sellable = products.filter(p => p.stock > 0)
    assert.deepEqual(ids(filterAndSort(sellable, { ...options, subFilters: [tag] })), ids(filterAiProducts(sellable, condition)))
  }
  assert.equal(finalizeConditions({ qualitative_filters: ['low_sugar'], sugar_max: 5 }, '저당 당류 2g 이하').sugar_max, 2)
})

test('missing nutrition stays null through adaptation, tags, filtering, sorting and cart totals', () => {
  for (const value of [null, undefined, '', 'invalid']) {
    const p = adaptProductRow({ ...rows[0], product_id: 999, protein: value, sugar: value, sodium: value, calories: value })
    for (const key of ['protein', 'sugar', 'sodium', 'calories']) assert.equal(p.nutrition[key], null)
    assert.ok(!p.tags.some(tag => ['고단백', '저당', '저염'].includes(tag)))
    for (const tag of ['고단백', '저당', '저염']) assert.equal(filterAndSort([p], { ...options, subFilters: [tag] }).length, 0)
    assert.equal(filterAiProducts([p], { sugar_max: 5 }).length, 0)
    const zero = { ...p, id: 1000, nutrition: { protein: 0, sugar: 0, sodium: 0, calories: 0 } }
    for (const sort_by of ['protein_desc', 'sugar_asc', 'sodium_asc']) assert.deepEqual(filterAiProducts([p, zero], { sort_by }).map(p => p.id), [1000, 999])
    assert.equal(cartNutritionTotals([{ product: zero, quantity: 1 }, { product: p, quantity: 2 }]).sugar, null)
  }
  assert.equal(nutrientNumber(0), 0)
  assert.equal(fmtNutrient('sugar', null), '정보 없음')
  assert.equal(fmtNutrient('sugar', 0), '0g')
})

test('displayed count and rating combine actual sample rows with DB review statistics', () => {
  const code = read('src/components/ProductReviews.jsx')
  const stats = code.match(/const actualCount =[\s\S]*?(?=  const hasMoreActual)/)[0]
  const samples = getSampleReviews(products[0]).slice(0, 5)
  const summarize = (loadedActual, sampleReviews) => new Function('loadedActual', 'sampleReviews', 'combineReviewSummary', stats + ';return {count: combinedCount, average: combinedAverage}')(loadedActual, sampleReviews, combineReviewSummary)
  assert.equal(samples.length, 5)
  assert.deepEqual(summarize({ count: 2, average: 3 }, samples), { count: 7, average: 29 / 7 })
  assert.deepEqual(summarize({ count: 0, average: null }, samples), { count: 5, average: 4.6 })
  assert.deepEqual(summarize({ count: 0, average: null }, []), { count: 0, average: 0 })
  assert.doesNotMatch(code, /getSampleReviewSummary/)
  assert.match(code, /visibleSamples.map/)
})

test('both coupon selections calculate the actual rate and bind the actual name', () => {
  const code = read('src/pages/Checkout.jsx')
  const expression = code.match(/const discountAmount = (.*)/)[1]
  const calculate = new Function('selectedCoupon', 'cartTotal', 'return ' + expression)
  for (const [name, percent] of [['신규가입 20% 할인', 20], ['첫 구매 리뷰 감사 10% 할인', 10]]) {
    const selected = { coupons: { name, percent } }
    const discount = calculate(selected, 19999)
    assert.equal(discount, Math.floor(19999 * percent / 100))
    assert.equal(19999 + 3000 - discount, percent === 20 ? 19000 : 21000)
  }
  assert.match(code, /couponName=\{selectedCoupon\?\.coupons\?\.name\}/)
  assert.match(read('src/components/checkout/CheckoutSummary.jsx'), />\{couponName\}<\/span>/)
})

const storage = () => { const map = new Map(); return { getItem: k => map.get(k), setItem: (k, v) => map.set(k, v), removeItem: k => map.delete(k) } }
test('internal auth returns survive OAuth, consume once, and direct login keeps its fallback', () => {
  for (const path of ['/products/12', '/orders', '/wishlist', '/search?q=protein&sort=lowPrice']) {
    const tab = storage()
    rememberAuthReturn(tab, path)
    assert.equal(consumeAuthReturn(tab), path)
    assert.equal(consumeAuthReturn(tab), null)
  }
  assert.equal(consumeAuthReturn(storage()), null)
  assert.equal(consumeAuthReturn(storage(), '?redirect=%2Fproducts%2F12'), '/products/12')
})

test('auth returns reject external, protocol-relative, encoded backslash and control redirects', () => {
  for (const path of ['https://evil.test', '//evil.test', '/%2Fevil.test', '/%5Cevil.test', '/%0Aevil.test', 'javascript:alert(1)', '/login', '/register', '/payment/success']) assert.equal(safeReturnPath(path), null, path)
  const tab = storage()
  rememberAuthReturn(tab, '/orders')
  assert.equal(consumeAuthReturn(tab, '?redirect=https://evil.test'), null)
})

test('order loading completes even when review loading rejects', async () => {
  const code = read('src/pages/Orders.jsx')
  const body = code.match(/const load = async \(\) => \{([\s\S]*?)\r?\n    \}\r?\n    void load/)[1]
  const rows = [{ order_id: 'order-1', items: [{ order_item_id: 'item-1' }] }]
  let state
  await new Function('setState', 'authUserId', 'active', 'fetchMyOrders', 'fetchMyReviewItems', 'supabase', 'return (async () => {' + body + '})()')(
    next => { state = next }, 'owner', true, async () => rows, async () => { throw new Error('reviews unavailable') }, {})
  assert.deepEqual(state, { ownerId: 'owner', rows, loading: false, error: null })
  const reviewEffect = code.match(/useEffect\(\(\) => \{\r?\n    let active = true\r?\n    setReviews([\s\S]*?)\r?\n  \}, \[authUserId, reloadKey, reviewRevision\]\)/)[0]
  assert.doesNotMatch(reviewEffect, /setState\(/)
  assert.match(reviewEffect, /error: '리뷰 상태를 불러오지 못했습니다.'/)
})

test('new reward guard preserves legacy coupons and adds a transactionally unique account claim', () => {
  const migration = read('supabase/migrations/20260908000100_first_purchase_review_reward.sql')
  assert.match(migration, /user_id uuid primary key/)
  assert.match(migration, /select user_id, min\(issued_at\)/)
  assert.match(migration, /on conflict \(user_id\) do nothing returning user_id/)
  assert.match(migration, /before insert on public.user_coupons/)
  assert.match(migration, /new.reward_order_id is distinct from first_order_id/)
  assert.match(migration, /status = 'delivered'/)
  assert.match(migration, /count\(\*\)[\s\S]*?<> 1/)
  assert.match(migration, /to_jsonb\(o\)->>'paid_at'/)
  assert.doesNotMatch(migration, /delete from|truncate|drop table|p_rating.*[><=]/i)
  const prior = read('supabase/migrations/20260907000100_delivered_review_rewards.sql')
  assert.match(prior, /reviews_user_request_unique/)
  assert.match(prior, /for update of o, oi/)
  assert.match(prior, /user_coupons_welcome_once/)
})


test('successful login restores the actual router product selection and order route', () => {
  const code = read('src/StoreProvider.jsx')
  const returnBody = code.match(/const returnAfterLogin = \(\) => \{([\s\S]*?)\r?\n  \}\r?\n  const navigate/)[1]
  const popBody = code.match(/const onPopState = \(event\) => \{([\s\S]*?)\r?\n    \}\r?\n    window.addEventListener/)[1]
  for (const path of ['/products/12', '/orders']) {
    const tab = storage()
    rememberAuthReturn(tab, path)
    const state = {}
    const browser = { sessionStorage: tab, location: new URL('https://example.test/login'), requestAnimationFrame: fn => fn(), scrollTo() {}, history: { replaceState(_state, _title, path) { browser.location = new URL(path, 'https://example.test') } } }
    const scope = { window: browser, parseAppLocation, products: [{ id: 12 }] }
    for (const [, setter] of popBody.matchAll(/\b(set\w+)\(/g)) scope[setter] = value => { state[setter] = value }
    browser.dispatchEvent = event => new Function(...Object.keys(scope), 'event', popBody)(...Object.values(scope), event)
    const restore = new Function('consumeAuthReturn', 'window', 'PopStateEvent', returnBody)
    assert.equal(restore(consumeAuthReturn, browser, class { constructor(type, data) { Object.assign(this, { type }, data) } }), true)
    assert.equal(state.setView, path === '/orders' ? 'orders' : 'detail')
    if (path !== '/orders') assert.equal(state.setSelectedProduct.id, 12)
  }
})


test('product cards load DB totals and share the detail review aggregation', async () => {
  const actual = await fetchProductReviewSummary({ rpc: async (name, args) => {
    assert.equal(name, 'get_product_review_summary')
    assert.deepEqual(args, { p_product_id: 71 })
    return { data: { count: 2, average: 3 }, error: null }
  } }, 71)
  const samples = getSampleReviews(products[0])
  assert.deepEqual(combineReviewSummary(samples, actual), { count: samples.length + 2, average: (samples.reduce((sum, row) => sum + row.rating, 0) + 6) / (samples.length + 2) })
  for (const file of ['src/components/ProductCard.jsx', 'src/components/DealProductCard.jsx']) assert.match(read(file), /SampleRating product=\{product\}/)
  const card = read('src/components/Stars.jsx')
  assert.match(card, /combineReviewSummary/)
  assert.match(card, /reviewRevision/)
  assert.doesNotMatch(card, /getSampleReviewSummary/)
})


test('each product has 10–500 stable sample rows with matching summary and unique IDs', () => {
  const counts = new Set()
  for (const product of products) {
    const rows = getSampleReviews(product)
    const summary = getSampleReviewSummary(product.id)
    assert.ok(rows.length >= 10 && rows.length <= 500)
    assert.equal(new Set(rows.map(row => row.id)).size, rows.length)
    assert.ok(rows.every(row => Number.isFinite(Date.parse(row.date))))
    assert.deepEqual(getSampleReviews(product), rows)
    assert.equal(summary.reviewCount, rows.length)
    assert.equal(summary.averageRating, rows.reduce((sum, row) => sum + row.rating, 0) / rows.length)
    assert.deepEqual(rows.slice(0, 5).map(row => row.rating), [5, 4, 5, 5, 4])
    counts.add(rows.length)
  }
  assert.ok(counts.size > 10)
})
