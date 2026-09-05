import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'

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
    if (url.pathname === '/rest/v1/profiles') return json(route, { user_id: userId, display_name: '테스트 사용자', primary_goal: 'muscle_gain', role: 'user' })
    if (url.pathname === '/rest/v1/user_preferences') return json(route, { low_sugar: true, low_sodium: false, high_protein: true, exclude_caffeine: false, excluded_allergens: [] })
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
      return json(route, {
        insight: {
          headline: '여러 상품의 단백질 구성이 장바구니 전반에 고르게 포함되어 있어요.',
          summary: '여러 상품의 단백질 구성이 장바구니 전반에 고르게 포함되어 있어요.',
          balanceItems: [
            { key: 'protein', label: '단백질', status: 'good', text: '비중 높음', reason: '고단백 기준 상품의 비중이 높아요.' },
            { key: 'sugar', label: '당류', status: 'good', text: '저당 위주', reason: '저당 기준 상품이 주로 담겨 있어요.' },
            { key: 'sodium', label: '나트륨', status: 'good', text: '저염 위주', reason: '저염 기준 상품이 주로 담겨 있어요.' },
          ],
          currentFeatures: ['비슷한 종류의 상품이 반복되어 구성을 확인해 보세요.'],
          actionTitle: '이렇게 보완해보세요',
          actions: ['필요에 따라 다른 식품군을 함께 살펴보세요.'],
          recommendation: null,
          analysisVersion: 2,
          aiExplanationAvailable: true,
          basis: { personalized: true, primary_goal: '근육량 증가', selected_conditions: ['저당', '고단백'], excluded_allergens: [] },
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

  // F: Drawer shows only the short result; detail link opens the expanded Cart analysis.
  await page.getByRole('button', { name: 'AI 분석하기', exact: true }).click()
  await page.getByText('여러 상품의 단백질 구성이 장바구니 전반에 고르게 포함되어 있어요.', { exact: true }).waitFor()
  assert.equal(await page.locator('.drawer').getByText('현재 구성 특징', { exact: true }).count(), 0)
  await page.getByRole('button', { name: '분석 결과 자세히 보기', exact: true }).click()
  await page.getByText('현재 구성 특징', { exact: true }).waitFor()
  assert.equal(await page.locator('.cart-wellness summary').count(), 0)
  assert.equal(await page.getByRole('heading', { name: '내 장바구니 영양 요약', exact: true }).isVisible(), true)
  assert.equal(analysisCalls, 1)

  const unexpectedConsoleErrors = consoleErrors.filter((message) => !message.includes('net::ERR_NETWORK_ACCESS_DENIED'))
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
