import { analyzeCartNutrition, composeCartInsight, cartAnalysisBasis } from '../supabase/functions/_shared/cart-nutrition-analysis.js'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'

// Explicit browser regression test. Uses the bundled Playwright runtime and HTTP fixtures only.
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
const origin = process.env.CAREMARKET_ORIGIN || 'http://127.0.0.1:5174'
const supabaseUrl = process.env.SUPABASE_URL
assert.ok(supabaseUrl, 'SUPABASE_URL is required')

const userId = '00000000-0000-4000-8000-000000000001'
const products = [
  {
    product_id: 1, name: '담백한 닭가슴살', brand: 'CARE LABS', category: '도시락·간편식',
    price: 9000, original_price: 9000, stock: 20, summary: '간편한 단백질 식품', serving_size: '1팩',
    calories: 180, protein: 24, carbs: 8, fat: 5, sugar: 2, sodium: 320,
    allergens: [], contains_caffeine: false, main_ingredients: ['닭가슴살'], is_active: true,
    image_url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"/%3E',
  },
  {
    product_id: 2, name: '저당 그릭요거트', brand: 'DAILY ROOT', category: '음료·프로틴음료',
    price: 7000, original_price: 7000, stock: 20, summary: '저당 요거트', serving_size: '1개',
    calories: 130, protein: 12, carbs: 10, fat: 4, sugar: 3, sodium: 75,
    allergens: ['우유'], contains_caffeine: false, main_ingredients: ['원유'], is_active: true,
    image_url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"/%3E',
  },
]
let serverCart = [{ product: products[0], quantity: 1 }]
let profile = { user_id: userId, display_name: '테스트 사용자', primary_goal: 'muscle_gain', role: 'user' }
let preferences = { low_sugar: true, low_sodium: false, high_protein: true, exclude_caffeine: false, excluded_allergens: ['우유'] }
let failAnalysis = false
let analysisCalls = 0

const json = (route, body, status = 200) => route.fulfill({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
})

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const accessToken = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ sub: userId, aud: 'authenticated', role: 'authenticated', exp: 4102444800 })}.fixture`
  const authUser = { id: userId, aud: 'authenticated', role: 'authenticated', email: 'fixture@example.test', user_metadata: { display_name: '테스트 사용자' } }
  await context.addInitScript(({ storageKey, session }) => {
    localStorage.setItem(storageKey, JSON.stringify(session))
    localStorage.setItem('cm_welcome_hide_date', new Date().toISOString().slice(0, 10))
  }, {
    storageKey: `sb-${projectRef}-auth-token`,
    session: { access_token: accessToken, refresh_token: 'fixture-refresh', expires_at: 4102444800, expires_in: 3600, token_type: 'bearer', user: authUser },
  })

  await context.route('**/*', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.origin !== new URL(supabaseUrl).origin) return route.continue()

    if (url.pathname === '/auth/v1/user') return json(route, authUser)
    if (url.pathname === '/rest/v1/products') return json(route, products)
    if (url.pathname === '/rest/v1/profiles') return json(route, profile)
    if (url.pathname === '/rest/v1/user_preferences') return json(route, preferences)
    if (url.pathname === '/rest/v1/wishlist_items') return json(route, [])
    if (url.pathname === '/rest/v1/cart_items' && request.method() === 'GET') {
      return json(route, serverCart.map(({ product, quantity }, index) => ({
        cart_item_id: `00000000-0000-4000-8000-00000000001${index}`,
        product_id: product.product_id,
        quantity,
        product,
      })))
    }
    if (url.pathname === '/rest/v1/rpc/add_my_cart_item') {
      const body = request.postDataJSON()
      const item = serverCart.find(({ product }) => product.product_id === body.p_product_id)
      if (item) item.quantity += body.p_quantity
      else serverCart.push({ product: products.find(p => p.product_id === body.p_product_id), quantity: body.p_quantity })
      return json(route, null)
    }
    if (url.pathname === '/rest/v1/rpc/change_my_cart_quantity') {
      const body = request.postDataJSON()
      const item = serverCart.find(({ product }) => product.product_id === body.p_product_id)
      if (item) item.quantity = Math.max(1, item.quantity + body.p_delta)
      else serverCart.push({ product: products.find(p => p.product_id === body.p_product_id), quantity: body.p_delta })
      return json(route, null)
    }
    if (url.pathname === '/rest/v1/cart_items' && request.method() === 'DELETE') {
      const productId = Number((url.searchParams.get('product_id') || '').replace('eq.', ''))
      serverCart = serverCart.filter(({ product }) => product.product_id !== productId)
      return json(route, null)
    }
    if (url.pathname === '/functions/v1/ai-insights') {
      analysisCalls += 1
      assert.deepEqual(request.postDataJSON(), { mode: 'cart_summary' })
      await new Promise((resolve) => setTimeout(resolve, 120))
      if (failAnalysis) return json(route, { message: 'Function not found' }, 404)

      const context = { primaryGoal: profile.primary_goal, selectedConditions: [], excludedAllergens: preferences?.excluded_allergens || [] }
      return json(route, { insight: composeCartInsight(analyzeCartNutrition(serverCart, context), cartAnalysisBasis(context), { summary: '현재 목적에 맞는 상품 구성을 살펴봤습니다.', actions: ['상품별 표시 정보를 함께 확인해주세요.'] }, true) })
    }
    return json(route, [])
  })

  const page = await context.newPage()
  const consoleErrors = []
  const pageErrors = []
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.setDefaultTimeout(10000)
  // Saved allergies default to hidden; OFF never modifies preferences.
  preferences = { ...preferences, high_protein: false, low_sugar: false }
  await page.goto(origin + '/products')
  const toggle = page.getByRole('checkbox', { name: '내 알레르기 성분 포함 상품 숨기기' })
  await toggle.waitFor()
  assert.equal(await toggle.isChecked(), true)
  assert.equal(await page.locator('.card').count(), 1)
  await toggle.uncheck()
  await page.locator('.card').filter({ hasText: '저당 그릭요거트' }).waitFor()
  assert.equal(await page.locator('.card').count(), 2)
  await page.locator('.card').getByText('⚠ 우유 포함', { exact: true }).waitFor()
  await page.locator('.card').filter({ hasText: '저당 그릭요거트' }).locator('.card-media').click()
  await page.locator('.allergen-warning').waitFor()
  assert.match(await page.locator('.allergen-warning').innerText(), /우유/)
  await page.getByRole('button', { name: '알레르기 정보 확인', exact: true }).click()
  await page.getByText('알레르기 주의 물질 · 우유', { exact: true }).waitFor()
  await page.getByRole('button', { name: '장바구니 담기', exact: true }).click()
  await page.getByRole('button', { name: '장바구니 보기', exact: true }).click()
  await page.locator('.drawer .allergen-badge').waitFor()
  const drawerMedia = page.locator('.drawer-item-media').filter({ has: page.locator('.allergen-badge') })
  assert.equal(await drawerMedia.count(), 1)
  assert.equal(await drawerMedia.evaluate(el => el.querySelector('.di-allergens').getBoundingClientRect().top >= el.querySelector('.di-nutrient').getBoundingClientRect().bottom), true)
  await page.getByRole('button', { name: '장바구니 상세 보기', exact: true }).click()
  await page.locator('.cart-item .allergen-badge').waitFor()
  assert.equal(preferences.excluded_allergens[0], '우유')
  assert.equal(await page.locator('.ns-cell').count(), 0)
  assert.equal(await page.locator('.cart-ai-product-reason').count(), 0)
  const guideToggle = page.getByRole('button', { name: '장바구니 분석 확인하기', exact: true })
  await guideToggle.evaluate(button => { button.click(); button.click() })
  await page.getByRole('button', { name: '다시 분석', exact: true }).waitFor()
  await page.getByRole('heading', { name: 'AI 한눈 요약', exact: true }).waitFor()
  assert.equal(analysisCalls, 1)
  assert.equal(await page.locator('.cart-ai-evidence[open]').count(), 0)
  assert.equal(await page.locator('.cart-ai-product-reason .allergen-badge').count(), 1)
  const disclosure = page.locator('.cart-ai-evidence').first()
  assert.equal(await disclosure.locator('ul').isVisible(), false)
  await disclosure.locator('summary').click()
  assert.equal(await disclosure.locator('ul').isVisible(), true)
  assert.match(await disclosure.locator('ul').innerText(), /24g/)
  await disclosure.locator('summary').click()
  assert.equal(analysisCalls, 1)
  const previous = await page.locator('.cart-ai-balance-items').innerText()
  await page.getByRole('button', { name: '담백한 닭가슴살 수량 증가' }).click()
  await page.getByText('2종 · 3개', { exact: true }).first().waitFor()
  await page.getByText('장바구니 또는 구매 조건이 변경됐어요.', { exact: true }).waitFor()
  assert.equal(await page.locator('.cart-ai-balance-items').count(), 0)
  assert.equal(analysisCalls, 1)
  failAnalysis = true
  await page.getByRole('button', { name: '다시 분석', exact: true }).click()
  await page.locator('.cart-ai-trigger.is-loading').waitFor({ state: 'hidden' })
  await page.getByText('AI 분석을 완료하지 못했어요.', { exact: true }).waitFor()
  assert.equal(await page.locator('.cart-checkout-button').isEnabled(), true)
  assert.equal(await page.locator('.cart-item').count(), 2)
  failAnalysis = false
  await page.getByRole('button', { name: '다시 시도', exact: true }).click()
  await page.locator('.cart-ai-product-reason').first().waitFor()
  assert.equal(await page.locator('.cart-ai-balance-items').innerText(), previous)
  const callsBeforeToggle = analysisCalls
  await page.getByRole('button', { name: '영양 가이드 접기', exact: true }).click()
  await guideToggle.click()
  assert.equal(analysisCalls, callsBeforeToggle)
  await disclosure.locator('summary').focus()
  await page.keyboard.press('Enter')
  assert.equal(await disclosure.locator('ul').isVisible(), true)
  await page.keyboard.press('Enter')
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 })
    assert.equal(await page.locator('.cart-ai-product-reason').count(), 2)
    const layout = await page.evaluate(() => ({
      metrics: getComputedStyle(document.querySelector('.cart-ai-metrics')).gridTemplateColumns.split(' ').length,
      findings: getComputedStyle(document.querySelector('.cart-ai-findings')).gridTemplateColumns.split(' ').length,
      openEvidence: document.querySelectorAll('.cart-ai-evidence[open]').length,
      findingItems: [...document.querySelectorAll('.cart-ai-finding ul')].map(el => el.children.length),
    }))
    assert.equal(layout.metrics, width === 390 ? 2 : 4)
    assert.equal(layout.findings, width === 390 ? 1 : 2)
    assert.equal(layout.openEvidence, 0)
    assert.ok(layout.findingItems.every(count => count <= 3))
    await page.evaluate(() => window.scrollTo(0,0))
    const clip = await page.locator('.cart-wellness').evaluate(el => { const r=el.getBoundingClientRect(); return { x:r.x, y:r.y+scrollY, width:r.width, height:r.height } })
    await page.screenshot({ path: `tmp/cart-canvas-${width}.png`, fullPage: true, clip })
    const overflow = await page.locator('.cart-page').evaluate(el => el.scrollWidth > el.clientWidth)
    assert.equal(overflow, false)
  }
  // A new goal starts without old results and uses the current analysis criteria.
  profile = { ...profile, primary_goal: 'weight_control' }
  serverCart = [{ product: products[0], quantity: 20 }]
  await page.reload()
  await page.getByRole('button', { name: '장바구니 분석 확인하기', exact: true }).click()
  await page.locator('.cart-ai-product-reason').waitFor()
  assert.match(await page.locator('.cart-ai-balance-items').innerText(), /고단백 상품[\s\S]*1 \/ 1종/)
  assert.equal(await page.locator('.cart-ai-product-reason').count(), 1)
  // Returning to the catalog restores the default ON state.
  await page.goto(origin + '/products')
  await toggle.waitFor()
  assert.equal(await toggle.isChecked(), true)
  assert.equal(await page.locator('.card').count(), 1)
  preferences = { ...preferences, excluded_allergens: [] }
  await page.reload()
  await page.locator('.card').nth(1).waitFor()
  assert.equal(await toggle.count(), 0)
  assert.equal(await page.locator('.allergen-badge').count(), 0)
  products.push({ ...products[0], product_id: 3, name: '추가 분석 상품 3' }, { ...products[0], product_id: 4, name: '추가 분석 상품 4' })
  serverCart = products.map(product => ({ product, quantity: 1 }))
  await page.goto(origin + '/cart')
  await page.getByRole('button', { name: '장바구니 분석 확인하기', exact: true }).click()
  assert.equal(await page.getByText('선택 확인', { exact: true }).count(), 0)
  await page.getByText('상품구성 상세내용을 확인해보세요.', { exact: true }).waitFor()
  await page.locator('.cart-ai-product-reason').first().waitFor()
  assert.equal(await page.locator('.cart-ai-product-reason').count(), 3)
  const moreProducts = page.locator('.cart-ai-product-section .cart-products-toggle')
  const callsBeforeMore = analysisCalls
  await moreProducts.focus()
  await page.keyboard.press('Enter')
  assert.equal(await moreProducts.getAttribute('aria-expanded'), 'true')
  assert.equal(await page.locator('.cart-ai-product-reason').count(), 4)
  await moreProducts.click()
  assert.equal(await page.locator('.cart-ai-product-reason').count(), 3)
  assert.equal(analysisCalls, callsBeforeMore)
  await page.getByRole('button', { name: '영양 가이드 접기', exact: true }).click()
  await page.locator('.cart-btn').click()
  await page.locator('.drawer .cart-ai-result-compact').waitFor()
  assert.equal(await page.locator('.drawer .cart-ai-balance-items').count(), 0)
  assert.equal(await page.locator('.drawer .cart-ai-result-compact > p').count(), 1)
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 })
    assert.equal(await page.locator('.drawer').evaluate(el => el.scrollWidth > el.clientWidth), false)
    await page.locator('.drawer').screenshot({ path: `tmp/cart-drawer-compact-${width}.png` })
  }
  await page.getByRole('button', { name: '분석 결과 자세히 보기', exact: true }).click()
  await page.locator('#cart-ai-guide').waitFor({ state: 'visible' })
  assert.equal(analysisCalls, callsBeforeMore)
  // The same cached result opens immediately when arriving from another page.
  await page.goto(origin + '/products')
  await page.locator('.cart-btn').click()
  await page.getByRole('button', { name: 'AI 분석하기', exact: true }).click()
  await page.getByRole('button', { name: '분석 결과 자세히 보기', exact: true }).waitFor()
  const callsBeforeDetail = analysisCalls
  await page.getByRole('button', { name: '분석 결과 자세히 보기', exact: true }).click()
  await page.locator('#cart-ai-guide .cart-ai-glance').waitFor({ state: 'visible' })
  assert.equal(analysisCalls, callsBeforeDetail)
  products[0] = { ...products[0], name: '영양정보가등록되지않은긴상품명'.repeat(10), protein: null, sugar: null, sodium: null, calories: null, allergens: null }
  serverCart = [{ product: products[0], quantity: 2 }]
  await page.reload()
  await page.getByRole('button', { name: '장바구니 분석 확인하기', exact: true }).click()
  await page.locator('.cart-ai-data-note').waitFor()
  await page.locator('.cart-ai-product-reason').waitFor()
  assert.match(await page.locator('.cart-ai-metrics').innerText(), /정보 없음 · 비교 보류/)
  await page.locator('.cart-ai-evidence summary').last().click()
  assert.equal(await page.locator('.cart-ai-nutrition-details b').filter({ hasText: '정보 없음 · 분석 제외' }).count(), 4)
  assert.match(await page.locator('.cart-ai-nutrition-details').innerText(), /정보 없음 · 원재료 표시 확인 필요/)
  assert.equal(await page.locator('.cart-ai-canvas').evaluate(el => el.scrollWidth > el.clientWidth), false)
  serverCart = []
  await page.reload()
  await page.getByRole('heading', { name: '장바구니가 비어 있어요.' }).waitFor()
  assert.equal(await page.locator('.cart-ai-result').count(), 0)
  assert.deepEqual(pageErrors, [])
  console.log(JSON.stringify({ scenarios: ['allergy-default-on', 'toggle-off-badge', 'detail-warning', 'drawer-warning', 'cart-warning', 'quantity-stale', 'goal-change', 'api-failure-retry', 'keyboard-disclosure', 'guide-toggle-no-api', 'revisit-reset', 'no-allergies', 'missing-nutrition', 'long-product-name', 'empty-cart'], viewports: [1440, 768, 390], analysisCalls, pageErrors }))
} finally {
  await browser.close()
}
