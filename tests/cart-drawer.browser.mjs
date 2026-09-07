import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { analyzeCartNutrition, composeCartInsight, cartAnalysisBasis } from '../supabase/functions/_shared/cart-nutrition-analysis.js'

// Explicit browser regression test. Real UI with Supabase HTTP fixtures; never writes remote cart data.
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
const origin = process.env.CAREMARKET_ORIGIN || 'http://127.0.0.1:5177'
const supabaseUrl = process.env.SUPABASE_URL
assert.ok(supabaseUrl, 'SUPABASE_URL is required')

const userId = '00000000-0000-4000-8000-000000000030'
const image = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"/%3E'
const products = Array.from({ length: 30 }, (_, index) => ({
  product_id: index + 1,
  name: `테스트 건강상품 ${String(index + 1).padStart(2, '0')}`,
  brand: `BRAND ${index + 1}`,
  category: index % 2 ? '음료·프로틴음료' : '도시락·간편식',
  price: 3000 + index * 100,
  original_price: 3500 + index * 100,
  stock: 50,
  summary: '장바구니 레이아웃 검증 상품',
  serving_size: '1개',
  calories: 100 + index,
  protein: 10 + (index % 8),
  carbs: 20,
  fat: 4,
  sugar: 3,
  sodium: 120 + index,
  allergens: [],
  contains_caffeine: false,
  main_ingredients: ['주원료'],
  is_active: true,
  image_url: image,
}))

let serverCart = []
let analysisCalls = 0
let failAnalysis = false
let oldAnalysisVersion = false
let primaryGoal = 'muscle_gain'
let excludedAllergens = []
const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
const cartRows = () => serverCart.map(({ product, quantity }, index) => ({
  cart_item_id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  product_id: product.product_id,
  quantity,
  product,
}))

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
    if (url.pathname === '/rest/v1/profiles') return json(route, { user_id: userId, display_name: '테스트 사용자', primary_goal: primaryGoal, role: 'user' })
    if (url.pathname === '/rest/v1/user_preferences') return json(route, { low_sugar: false, low_sodium: false, high_protein: false, exclude_caffeine: false, excluded_allergens: excludedAllergens })
    if (url.pathname === '/rest/v1/wishlist_items') return json(route, [])
    if (url.pathname === '/rest/v1/cart_items' && request.method() === 'GET') return json(route, cartRows())
    if (url.pathname === '/rest/v1/rpc/add_my_cart_item') {
      const body = request.postDataJSON()
      const item = serverCart.find(({ product }) => product.product_id === body.p_product_id)
      if (item) item.quantity += body.p_quantity
      else serverCart.push({ product: products.find((product) => product.product_id === body.p_product_id), quantity: body.p_quantity })
      return json(route, null)
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
      await new Promise(resolve => setTimeout(resolve, 250))
      if (failAnalysis) return json(route, { error: { code: 'UPSTREAM_ERROR' } }, 503)
      const basis = { primaryGoal, excludedAllergens }
      const insight = composeCartInsight(analyzeCartNutrition(serverCart, basis), cartAnalysisBasis(basis))
      if (oldAnalysisVersion) {
        insight.compositionVersion = 3
        insight.aiExplanationAvailable = true
        insight.summary = '당류와 나트륨 기준에 맞는 구성이에요.'
        delete insight.explanationNotice
      }
      return json(route, { insight })
    }
    return json(route, [])
  })

  const page = await context.newPage()
  const consoleErrors = []
  const pageErrors = []
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.goto(origin)
  await page.locator('.card-add').first().waitFor()

  // A + B: add shows an actionable toast and never opens the Drawer automatically.
  await page.locator('.card-add').first().click()
  await page.getByText('장바구니에 담았어요.', { exact: true }).waitFor()
  assert.equal(await page.locator('.drawer').count(), 0)
  assert.equal(await page.locator('.cart-btn .qty').innerText(), '1')
  await page.getByRole('button', { name: '장바구니 보기', exact: true }).click()
  await page.locator('.drawer').waitFor()
  await page.locator('.drawer-head').getByRole('button', { name: '닫기' }).click()

  // C + D: repeated adds stay on the shopping surface; Header cart still opens Quick Cart.
  await page.locator('.card-add').nth(1).click()
  await page.locator('.card-add').nth(2).click()
  await page.getByText('장바구니에 담았어요.', { exact: true }).waitFor()
  assert.equal(await page.locator('.drawer').count(), 0)
  assert.equal(await page.locator('.cart-btn .qty').innerText(), '3')
  await page.locator('.cart-btn').click()
  await page.locator('.drawer').waitFor()
  await page.locator('.drawer-head').getByRole('button', { name: '닫기' }).click()

  // E: thirty distinct rows; only product area scrolls while header/footer remain visible.
  serverCart = products.map((product) => ({ product, quantity: 1 }))
  await page.reload()
  await page.locator('.cart-btn .qty').getByText('30', { exact: true }).waitFor()
  const viewportResults = []
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 })
    await page.locator('.cart-btn').click()
    await page.locator('.drawer').waitFor()
    const before = await page.evaluate(() => {
      const drawer = document.querySelector('.drawer')
      const head = document.querySelector('.drawer-head')
      const body = document.querySelector('.drawer-body')
      const foot = document.querySelector('.drawer-foot')
      return {
        drawerHeight: drawer.getBoundingClientRect().height,
        viewportHeight: window.innerHeight,
        headTop: head.getBoundingClientRect().top,
        footBottom: foot.getBoundingClientRect().bottom,
        bodyClientHeight: body.clientHeight,
        bodyScrollHeight: body.scrollHeight,
        bodyOverflowY: getComputedStyle(body).overflowY,
        footerHeight: foot.getBoundingClientRect().height,
        horizontalOverflow: drawer.scrollWidth > drawer.clientWidth,
        closeVisible: document.querySelector('.drawer-head .icon-btn').getBoundingClientRect().height > 0,
        checkoutVisible: [...document.querySelectorAll('.drawer-cta .btn')].every((button) => button.getBoundingClientRect().height > 0),
        aiInFooter: Boolean(foot.querySelector('.cart-ai-insight.compact')),
      }
    })
    await page.locator('.drawer-body').evaluate((element) => { element.scrollTop = element.scrollHeight })
    const after = await page.evaluate(() => ({
      headTop: document.querySelector('.drawer-head').getBoundingClientRect().top,
      footBottom: document.querySelector('.drawer-foot').getBoundingClientRect().bottom,
      lastItemVisible: document.querySelector('.drawer-item:last-child').getBoundingClientRect().bottom <= document.querySelector('.drawer-body').getBoundingClientRect().bottom + 1,
    }))
    assert.ok(before.drawerHeight <= before.viewportHeight)
    assert.ok(before.bodyScrollHeight > before.bodyClientHeight)
    assert.equal(before.bodyOverflowY, 'auto')
    assert.equal(before.headTop, after.headTop)
    assert.equal(before.footBottom, after.footBottom)
    assert.equal(after.lastItemVisible, true)
    assert.equal(before.horizontalOverflow, false)
    assert.equal(before.closeVisible, true)
    assert.equal(before.checkoutVisible, true)
    assert.equal(before.aiInFooter, true)
    if (width === 390) assert.ok(before.footerHeight < before.viewportHeight * 0.42)
    viewportResults.push({ width, ...before, ...after })
    await page.locator('.drawer-head').getByRole('button', { name: '닫기' }).click()
  }

  // Quantity/delete remain functional in the independently scrollable product area.
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.locator('.cart-btn').click()
  const firstItem = page.locator('.drawer-item').first()
  await firstItem.getByRole('button', { name: '수량 증가' }).click()
  await page.locator('.cart-btn .qty').getByText('31', { exact: true }).waitFor()
  await firstItem.getByRole('button', { name: '삭제' }).click()
  await page.locator('.cart-btn .qty').getByText('29', { exact: true }).waitFor()
  assert.equal(await page.locator('.drawer-item').count(), 29)

  // F: real analysis fixtures; count parity, lifecycle, detail navigation and responsive layout.
  primaryGoal = 'nutrition_management'
  excludedAllergens = ['우유']
  const supplement = { ...products[0], product_id: 101, name: '마그네슘 영양제', category: '영양제·비타민', main_ingredients: ['마그네슘 100mg'] }
  const allergen = { ...products[2], allergens: ['우유'] }
  const salty = { ...products[1], sodium: 280 }
  const sweet = { ...products[3], sugar: 20 }
  const cases = [
    { name: 'food-zero', items: [products[0]], warnings: 0 },
    { name: 'allergy-one', items: [allergen], warnings: 1 },
    { name: 'three-warnings', items: [salty, sweet, allergen], warnings: 3 },
    { name: 'supplement', items: [supplement], warnings: 0 },
    { name: 'mixed', items: [products[0], supplement, allergen], warnings: 1 },
  ]
  const resultLayouts = []
  for (const scenario of cases) {
    serverCart = scenario.items.map(product => ({ product, quantity: 1 }))
    await page.reload()
    await page.locator('.cart-btn .qty').getByText(String(serverCart.length), { exact: true }).waitFor()
    await page.locator('.cart-btn').click()
    const callsBefore = analysisCalls
    await page.getByRole('button', { name: '장바구니 분석하기', exact: true }).click()
    const result = page.locator('.cart-ai-result-compact')
    await result.waitFor()
    assert.equal(analysisCalls - callsBefore, scenario.items.includes(supplement) ? 0 : 1)
    assert.match(await page.locator('.cart-ai-intro').innerText(), new RegExp(`식단 영양 관리 기준 · ${scenario.items.length}종 분석`))
    assert.equal(await result.locator('.cart-ai-quick-checks li').count(), Math.min(2, scenario.warnings))
    if (scenario.warnings) {
      assert.match(await result.locator('.cart-ai-quick-checks h4').innerText(), new RegExp(`${scenario.warnings}종`))
      assert.match(await result.locator('.cart-ai-quick-checks li').first().innerText(), /우유/)
    }
    if (scenario.warnings === 3) assert.match(await result.innerText(), /외 1종/)
    const expected = analyzeCartNutrition(serverCart, { primaryGoal, excludedAllergens })
    const expectedMetrics = [...expected.balanceItems.filter(m => !['attention','protein_complement'].includes(m.key)).slice(0,2), expected.balanceItems.find(m => m.key === 'attention')]
    assert.deepEqual(await result.locator('.cart-ai-quick-metrics dd').allTextContents(), expectedMetrics.map(m => `${m.count}${m.key === 'attention' ? '' : '/' + m.total}종`))
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 })
      const layout = await page.evaluate(() => {
        const ai = document.querySelector('.cart-ai-insight.compact'), drawer = document.querySelector('.drawer')
        return { height: ai.getBoundingClientRect().height, overflow: drawer.scrollWidth > drawer.clientWidth,
          checkoutBottom: document.querySelector('.drawer-cta').getBoundingClientRect().bottom,
          bodyHeight: document.querySelector('.drawer-body').clientHeight }
      })
      assert.equal(layout.overflow, false)
      assert.ok(layout.checkoutBottom <= (width === 390 ? 844 : 1000))
      assert.ok(layout.bodyHeight > 80)
      if (layout.height >= 370) await page.screenshot({ path: 'tmp/drawer-ai-size-check.png' })
      assert.ok(layout.height < 370, JSON.stringify({ scenario: scenario.name, width, ...layout }))
      resultLayouts.push({ scenario: scenario.name, width, ...layout })
      if (scenario.name === 'three-warnings' || scenario.name === 'mixed') await page.screenshot({ path: `tmp/drawer-ai-${scenario.name}-${width}.png` })
    }
    const beforeReopen = analysisCalls
    await page.locator('.drawer-head').getByRole('button', { name: '닫기' }).click()
    await page.locator('.cart-btn').click()
    await result.waitFor()
    assert.equal(analysisCalls, beforeReopen)
    await result.getByRole('button', { name: '분석 결과 자세히 보기', exact: true }).click()
    await page.locator('.cart-ai-dashboard').waitFor()
    assert.equal(await page.locator('.drawer').count(), 0)
    await page.waitForFunction(() => document.activeElement?.id === 'cart-wellness-title')
    assert.equal(await page.locator('.cart-ai-product-reason').count(), scenario.items.length)
    assert.equal(analysisCalls, beforeReopen)
  }
  // Pending mutation hides old numbers; API failure and old contracts use current local analysis.
  serverCart = [{ product: products[0], quantity: 1 }]
  await page.reload()
  await page.locator('.cart-btn .qty').getByText('1', { exact: true }).waitFor()
  await page.locator('.cart-btn').click()
  await page.getByRole('button', { name: '장바구니 분석하기', exact: true }).click()
  await page.locator('.cart-ai-result-compact').waitFor()
  await page.locator('.drawer-item').first().getByRole('button', { name: '수량 증가' }).click()
  await page.locator('.drawer .ai-insight-stale').waitFor()
  assert.equal(await page.locator('.cart-ai-quick-metrics').count(), 0)
  failAnalysis = true
  await page.locator('.drawer').getByRole('button', { name: '다시 분석', exact: true }).click()
  await page.locator('.drawer .cart-ai-trigger.is-loading').waitFor()
  assert.equal(await page.locator('.drawer .cart-ai-trigger.is-loading').isDisabled(), true)
  await page.locator('.drawer').getByText('AI 연결 대신 등록된 상품 정보로 분석했어요.', { exact: true }).waitFor()
  assert.equal(await page.locator('.cart-ai-quick-metrics dd').first().innerText(), '1/1종')
  const fallbackCalls = analysisCalls
  await page.locator('.drawer-head').getByRole('button', { name: '닫기' }).click()
  await page.locator('.cart-btn').click()
  await page.locator('.drawer').getByText('AI 연결 대신 등록된 상품 정보로 분석했어요.', { exact: true }).waitFor()
  assert.equal(analysisCalls, fallbackCalls)
  failAnalysis = false
  oldAnalysisVersion = true
  await page.locator('.drawer').getByRole('button', { name: '다시 분석', exact: true }).click()
  await page.locator('.cart-ai-result-compact').waitFor()
  assert.equal(await page.locator('.drawer .cart-ai-fallback-note').count(), 0)
  assert.equal(await page.locator('.cart-ai-quick-metrics dd').first().innerText(), '1/1종')
  oldAnalysisVersion = false
  await page.locator('.drawer').getByRole('button', { name: '다시 분석', exact: true }).click()
  await page.locator('.cart-ai-result-compact').waitFor()
  assert.match(await page.locator('.cart-ai-intro').innerText(), /1종 분석/)
  // Product addition/removal and goal changes must invalidate the prior presentation.
  await page.goto(origin + '/products')
  await page.locator('.card-add').first().waitFor()
  await page.locator('.cart-btn').click()
  await page.getByRole('button', { name: '장바구니 분석하기', exact: true }).click()
  await page.locator('.cart-ai-result-compact').waitFor()
  await page.locator('.drawer-head').getByRole('button', { name: '닫기' }).click()
  const callsBeforeAdd = analysisCalls
  await page.locator('.card').filter({ hasText: products[1].name }).locator('.card-add').click()
  await page.locator('.cart-btn .qty').getByText('3', { exact: true }).waitFor()
  await page.locator('.cart-btn').click()
  assert.equal(await page.locator('.cart-ai-quick-metrics').count(), 0)
  assert.equal(analysisCalls, callsBeforeAdd)
  await page.getByRole('button', { name: '장바구니 분석하기', exact: true }).click()
  await page.locator('.cart-ai-result-compact').waitFor()
  await page.locator('.drawer-item').last().getByRole('button', { name: '삭제', exact: true }).click()
  // Returning to an exactly cached input may reuse that input's result, never the deleted SKU's result.
  await page.waitForFunction(() => !document.querySelector('.cart-ai-quick-metrics') || document.querySelector('.cart-ai-intro').textContent.includes('1종 분석'))
  await page.goto(origin + '/goals')
  await page.locator('.goal-pick').first().waitFor()
  await page.locator('.cart-btn').click()
  await page.getByRole('button', { name: '장바구니 분석하기', exact: true }).click()
  await page.locator('.cart-ai-result-compact').waitFor()
  // Exercise the actual goal control while the mounted Drawer observes its shared store.
  await page.locator('.goal-pick').filter({ hasText: '체중 관리' }).evaluate(element => element.click())
  await page.locator('.drawer .ai-insight-stale').waitFor()
  assert.equal(await page.locator('.cart-ai-quick-metrics').count(), 0)
  await page.locator('.drawer').getByRole('button', { name: '다시 분석', exact: true }).click()
  await page.locator('.cart-ai-result-compact').waitFor()
  assert.match(await page.locator('.cart-ai-intro').innerText(), /체중 관리 기준/)
  console.log(JSON.stringify({ resultLayouts }, null, 2))
  const unexpectedConsoleErrors = consoleErrors.filter((message) => !message.includes('net::ERR_NETWORK_ACCESS_DENIED') && !message.includes('503') && !message.includes('AI insights request failed'))
  assert.deepEqual(pageErrors, [])
  assert.deepEqual(unexpectedConsoleErrors, [])
  console.log(JSON.stringify({
    scenarios: ['toast-only-add', 'toast-action', 'header-open', 'repeated-add', 'thirty-items', 'quantity', 'delete', 'compact-ai-to-cart-detail'],
    viewportResults,
    analysisCalls,
    unexpectedConsoleErrors,
    pageErrors,
  }, null, 2))
} finally {
  await browser.close()
}


