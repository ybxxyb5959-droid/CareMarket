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
    if (url.pathname === '/rest/v1/rpc/change_my_cart_quantity') {
      const body = request.postDataJSON()
      const item = serverCart.find(({ product }) => product.product_id === body.p_product_id)
      item.quantity = Math.max(1, item.quantity + body.p_delta)
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

      const totalQuantity = serverCart.reduce((sum, item) => sum + item.quantity, 0)
      const personalized = Boolean(profile.primary_goal || preferences?.low_sugar || preferences?.high_protein || preferences?.excluded_allergens?.length)
      return json(route, {
        insight: {
          headline: totalQuantity > serverCart.length
            ? '단백질 상품의 비중이 더 커졌어요.'
            : '현재 담긴 상품의 영양 특징을 살펴봤어요.',
          summary: totalQuantity > serverCart.length
            ? '수량이 늘어난 단백질 식품의 비중이 장바구니에서 더 커졌어요.'
            : '단백질 식품을 중심으로 간결하게 구성된 장바구니예요.',
          balanceItems: [
            { key: 'protein', label: '단백질', status: 'good', text: '비중 높음', reason: '고단백 기준 상품의 비중이 높아요.' },
            serverCart.length === 4
              ? { key: 'sodium', label: '나트륨', status: 'good', text: '저염 위주', reason: '저염 기준 상품이 주로 담겨 있어요.' }
              : { key: 'sodium', label: '나트륨', status: 'attention', text: '확인 필요', reason: '저염 기준 밖 상품이 있어요.' },
            { key: 'sugar', label: '당류', status: 'good', text: '저당 위주', reason: '저당 기준 상품이 주로 담겨 있어요.' },
          ],
          currentFeatures: serverCart.length > 1
            ? ['우유 알레르기 제외 조건과 맞지 않는 상품을 확인해 주세요.']
            : ['현재 담긴 상품 한 개의 영양 특징을 살펴봤어요.'],
          actionTitle: '이렇게 보완해보세요',
          actions: ['현재 상품을 유지하면서 다른 식품군도 함께 살펴보세요.'],
          recommendation: { filterLabel: '저염', label: '저염 상품 살펴보기' },
          analysisVersion: 2,
          aiExplanationAvailable: true,
          basis: personalized ? {
            personalized: true,
            primary_goal: '근육량 증가',
            selected_conditions: ['저당', '고단백'],
            excluded_allergens: ['우유'],
          } : {
            personalized: false,
            primary_goal: null,
            selected_conditions: [],
            excluded_allergens: [],
          },
        },
      })
    }
    return json(route, [])
  })

  const page = await context.newPage()
  const consoleErrors = []
  const pageErrors = []
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.goto(`${origin}/cart`)
  await page.getByRole('heading', { name: '장바구니', exact: true }).waitFor()
  await page.getByRole('heading', { name: '내 장바구니 영양 요약', exact: true }).waitFor()
  await page.getByText('영양 밸런스 분석', { exact: true }).waitFor()
  assert.equal(await page.locator('.cart-wellness summary').count(), 0)

  // A + duplicate prevention: one item and two synchronous clicks still make one request.
  const firstTrigger = page.getByRole('button', { name: '장바구니 영양 분석하기' })
  await firstTrigger.evaluate((button) => { button.click(); button.click() })
  await page.getByRole('heading', { name: '현재 담긴 상품의 영양 특징을 살펴봤어요.', exact: true }).waitFor()
  assert.equal(analysisCalls, 1)

  // B: multiple products.
  serverCart.push({ product: products[1], quantity: 1 })
  await page.reload()
  await page.getByText('2종 · 2개', { exact: true }).first().waitFor()
  await page.getByRole('button', { name: '장바구니 영양 분석하기' }).click()
  await page.getByText('우유 알레르기 제외 조건과 맞지 않는 상품을 확인해 주세요.', { exact: true }).waitFor()

  // C + D: quantity change invalidates the result; explicit retry uses the new quantity.
  await page.getByRole('button', { name: '담백한 닭가슴살 수량 증가' }).click()
  await page.getByText('장바구니가 변경됐어요. 다시 분석해주세요.', { exact: true }).waitFor()
  await page.getByRole('button', { name: '다시 분석', exact: true }).click()
  await page.getByRole('heading', { name: '단백질 상품의 비중이 더 커졌어요.', exact: true }).waitFor()

  // Returning to analyzed signatures reuses the successful in-memory cache.
  const callsBeforeCacheReuse = analysisCalls
  await page.getByRole('button', { name: '담백한 닭가슴살 수량 감소' }).click()
  await page.getByRole('heading', { name: '현재 담긴 상품의 영양 특징을 살펴봤어요.', exact: true }).waitFor()
  await page.getByRole('button', { name: '담백한 닭가슴살 수량 증가' }).click()
  await page.getByRole('heading', { name: '단백질 상품의 비중이 더 커졌어요.', exact: true }).waitFor()
  assert.equal(analysisCalls, callsBeforeCacheReuse)

  // F + responsive page checks.
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 })
    await page.locator('.cart-ai-result').scrollIntoViewIfNeeded()
    const metrics = await page.evaluate(() => ({
      viewport: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      checkoutVisible: [...document.querySelectorAll('.cart-checkout-button, .cart-mobile-checkout')]
        .some((element) => getComputedStyle(element).display !== 'none' && element.getBoundingClientRect().width > 0),
      aiRight: document.querySelector('.cart-ai-result').getBoundingClientRect().right,
      aiOverflow: document.querySelector('.cart-ai-result').scrollWidth > document.querySelector('.cart-ai-result').clientWidth,
    }))
    assert.equal(metrics.viewport, width)
    assert.ok(metrics.aiRight <= width, JSON.stringify(metrics))
    assert.equal(metrics.aiOverflow, false)
    assert.equal(metrics.checkoutVisible, true)
  }
  assert.equal(await page.locator('.cart-ai-basis-inline').innerText(), '분석 기준 · 저당 · 고단백 · 우유 제외')
  assert.ok(await page.getByRole('heading', { name: '왜 이렇게 분석했나요?' }).isVisible())
  assert.ok(await page.getByRole('heading', { name: '이렇게 보완해보세요' }).isVisible())
  assert.ok(await page.getByText('저당 기준 상품', { exact: true }).isVisible())

  // E: failure is isolated and retry succeeds without disabling checkout.
  failAnalysis = true
  await page.getByRole('button', { name: '다시 분석', exact: true }).click()
  await page.getByText('상세 설명을 불러오지 못했어요. 계산된 분석 결과를 보여드려요.', { exact: true }).waitFor()
  assert.equal(await page.getByRole('button', { name: /주문하기/ }).last().isEnabled(), true)
  assert.equal(await page.locator('.cart-item').count(), 2)
  failAnalysis = false
  await page.getByRole('button', { name: '다시 분석', exact: true }).click()
  await page.getByRole('heading', { name: '단백질 상품의 비중이 더 커졌어요.', exact: true }).waitFor()

  // Deleting a product also invalidates and refreshes the analysis.
  await page.locator('.cart-item').nth(1).getByRole('button', { name: '삭제', exact: true }).click()
  await page.getByText('장바구니가 변경됐어요. 다시 분석해주세요.', { exact: true }).waitFor()
  await page.getByRole('button', { name: '다시 분석', exact: true }).click()
  await page.getByRole('heading', { name: '단백질 상품의 비중이 더 커졌어요.', exact: true }).waitFor()

  // The complementary-products CTA uses the existing deterministic catalog filter.
  await page.getByRole('button', { name: '보완 상품 살펴보기', exact: true }).click()
  await page.locator('.chip.on').getByText('저염', { exact: true }).waitFor()
  assert.match(page.url(), /\/products/)

  // G + compact Drawer check: no criteria yields an explicit general-analysis notice.
  profile = { ...profile, primary_goal: null }
  preferences = null
  await page.reload()
  await page.getByRole('button', { name: /장바구니 2/ }).click()
  await page.getByRole('button', { name: 'AI 분석하기' }).click()
  const drawerMetrics = await page.evaluate(() => {
    const drawer = document.querySelector('.drawer')
    const foot = document.querySelector('.drawer-foot')
    const close = document.querySelector('.drawer-head .icon-btn')
    return {
      width: drawer.getBoundingClientRect().width,
      right: drawer.getBoundingClientRect().right,
      viewport: window.innerWidth,
      footVisible: foot.getBoundingClientRect().height > 0,
      closeVisible: close.getBoundingClientRect().height > 0,
      overflowX: drawer.scrollWidth > drawer.clientWidth,
    }
  })
  assert.ok(drawerMetrics.width <= 390 && drawerMetrics.right <= drawerMetrics.viewport)
  assert.equal(drawerMetrics.footVisible, true)
  assert.equal(drawerMetrics.closeVisible, true)
  assert.equal(drawerMetrics.overflowX, false)
  await page.getByRole('button', { name: '분석 결과 자세히 보기' }).click()
  await page.getByText('현재 설정된 맞춤 기준이 없어 일반적인 영양 구성만 분석했어요.', { exact: true }).waitFor()

  // Collapsing affects presentation only; all four SKUs remain in the nutrition totals.
  profile = { ...profile, primary_goal: 'muscle_gain' }
  preferences = { low_sugar: true, high_protein: true, excluded_allergens: ['우유'] }
  serverCart = Array.from({ length: 4 }, (_, index) => ({ product: { ...products[0], product_id: index + 1, name: `접기 검증 상품 ${index + 1}`, sodium: 195 }, quantity: index === 0 ? 6 : 1 }))
  await page.goto(`${origin}/cart`)
  const toggle = page.getByRole('button', { name: '나머지 1종 더 보기' })
  await toggle.waitFor()
  await page.getByRole('button', { name: '장바구니 영양 분석하기' }).click()
  await page.getByText('저염 기준 상품', { exact: true }).waitFor()
  assert.equal(await page.locator('.cart-ai-result-detail').getByText('저염 위주', { exact: true }).count(), 0)
  assert.equal(await page.getByText('저염 기준 상품', { exact: true }).locator('..').innerText(), '저염 기준 상품\n비중 높음')
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 })
    assert.equal(await page.locator('.cart-item').count(), 3)
    assert.equal(await page.locator('.ns-cell').first().innerText(), '총 나트륨\n1,755mg')
    await toggle.click()
    assert.equal(await page.locator('.cart-item').count(), 4)
    assert.equal(await page.locator('.ns-cell').first().innerText(), '총 나트륨\n1,755mg')
    await page.getByRole('button', { name: '상품 접기', exact: true }).click()
    assert.equal(await page.locator('.cart-item').count(), 3)
    const overflow = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, cartScroll: document.querySelector('.cart-page').scrollWidth, cartWidth: document.querySelector('.cart-page').clientWidth, elements: [...document.querySelectorAll('.cart-page *')].filter((element) => element.getBoundingClientRect().right > innerWidth).map((element) => element.className), outsideCart: [...document.querySelectorAll('body *')].filter((element) => !element.closest('.cart-page') && element.getBoundingClientRect().right > innerWidth).map((element) => element.className).slice(0, 8) }))
    assert.ok(overflow.cartScroll <= overflow.cartWidth && overflow.elements.length === 0, JSON.stringify(overflow))
    if (overflow.scroll > width) console.log('Existing overflow outside cart:', JSON.stringify(overflow))
  }

  const expectedConsoleError = (message) => (
    message.includes('AI insights request failed')
    || message.includes('net::ERR_NETWORK_ACCESS_DENIED')
    || message.includes('status of 404')
  )
  const unexpectedConsoleErrors = consoleErrors.filter((message) => !expectedConsoleError(message))
  assert.deepEqual(pageErrors, [])
  assert.deepEqual(unexpectedConsoleErrors, [])
  console.log(JSON.stringify({
    scenarios: ['single', 'multiple', 'stale-after-quantity', 'reanalyze', 'failure-retry', 'delete-refresh', 'signature-cache-reuse', 'complement-filter', 'personalized', 'general'],
    viewports: [1440, 768, 390],
    analysisCalls,
    expectedFixtureOrSandboxConsoleErrors: consoleErrors.length - unexpectedConsoleErrors.length,
    unexpectedConsoleErrors,
    pageErrors,
    drawerMetrics,
  }, null, 2))
} finally {
  await browser.close()
}
