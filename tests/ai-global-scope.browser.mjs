import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { emptyConditions } from '../supabase/functions/_shared/ai-search-contract.js'

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true })
const origin = process.env.CAREMARKET_TEST_ORIGIN || 'http://127.0.0.1:5173'
const product = (overrides) => ({
  product_id: 1, name: '테스트 상품', brand: 'CareMarket', category: '영양제·비타민',
  price: 10000, original_price: 10000, stock: 10, summary: '검색 범위 검증 상품',
  serving_size: '1개', calories: 10, protein: 1, carbs: 1, fat: 0,
  sugar: 0, sodium: 0, allergens: [], contains_caffeine: false,
  main_ingredients: ['테스트 원료'], is_active: true, image_url: '',
  ...overrides,
})
const products = [
  product({ product_id: 1, name: '카테고리 안 영양제' }),
  product({ product_id: 2, name: '전체 상품 무카페인 음료', category: '음료·프로틴음료' }),
]

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await context.addInitScript(() => localStorage.setItem('cm_welcome_hide_date', new Date().toISOString().slice(0, 10)))
  await context.route('**/rest/v1/products*', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'Content-Range': '0-1/2' },
    body: JSON.stringify(products),
  }))
  await context.route('**/functions/v1/ai-search', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ conditions: { ...emptyConditions(), category: '음료·프로틴음료', exclude_caffeine: true } }),
  }))

  const page = await context.newPage()
  page.setDefaultTimeout(10000)
  await page.goto(`${origin}/products?category=${encodeURIComponent('영양제')}`)
  await page.getByText('카테고리 안 영양제', { exact: true }).waitFor()
  assert.equal(await page.getByText('전체 상품 무카페인 음료', { exact: true }).count(), 0)

  await page.getByTitle('AI 자연어 검색으로 전환').click()
  await page.getByRole('textbox', { name: 'AI 자연어 검색' }).fill('카페인 없는 음료')
  await page.getByRole('textbox', { name: 'AI 자연어 검색' }).press('Enter')
  await page.locator('.ai-result-summary .ai-query').waitFor()

  assert.deepEqual(await page.locator('.product-grid .card-name').allTextContents(), ['전체 상품 무카페인 음료'])
  const resultUrl = new URL(page.url())
  assert.equal(resultUrl.searchParams.has('category'), false)
  assert.equal(resultUrl.searchParams.has('sub'), false)
  assert.equal(await page.locator('.goal-nav button').filter({ hasText: '전체상품' }).first().getAttribute('class'), 'on')
  console.log(JSON.stringify({ startedIn: '영양제', result: '전체 상품 무카페인 음료', categoryScopeCleared: true }))
} finally {
  await browser.close()
}
