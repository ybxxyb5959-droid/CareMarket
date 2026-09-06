import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true })
const origin = process.env.CAREMARKET_TEST_ORIGIN || 'http://127.0.0.1:4173'

const encodeJwtPart = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
const makeSession = (userId) => ({
  access_token: `${encodeJwtPart({ alg: 'none', typ: 'JWT' })}.${encodeJwtPart({ sub: userId, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.test-signature`,
  refresh_token: 'routing-fixture-refresh-token',
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  expires_in: 3600,
  token_type: 'bearer',
  user: { id: userId, aud: 'authenticated', role: 'authenticated', email: 'routing@example.test' },
})

const productFixture = {
  product_id: 1,
  name: '라우팅 테스트 상품',
  brand: 'CareMarket',
  category: '닭가슴살·고단백 식품',
  price: 10000,
  original_price: 10000,
  stock: 1,
  summary: 'SPA direct navigation fixture',
  serving_size: '1개',
  calories: 100,
  protein: 20,
  carbs: 1,
  fat: 1,
  sugar: 0,
  sodium: 10,
  allergens: [],
  contains_caffeine: false,
  main_ingredients: ['테스트'],
  is_active: true,
  image_url: '',
}

async function assertStateFits(page, selector, viewportResults, state) {
  const layout = await page.locator(selector).evaluate((container) => {
    const elements = [container, ...container.querySelectorAll('h1, h2, h3, p, button')]
    return {
      viewportWidth: window.innerWidth,
      withinViewport: elements.every((element) => {
        const rect = element.getBoundingClientRect()
        return rect.left >= -1 && rect.right <= window.innerWidth + 1 && element.scrollWidth <= element.clientWidth + 1
      }),
    }
  })
  assert.equal(layout.withinViewport, true, `${state} at ${layout.viewportWidth}px`)
  viewportResults.push({ state, ...layout })
}

const routes = [
  '/',
  '/products',
  '/products/1',
  '/search?q=protein',
  '/for-you',
  '/goals',
  '/cart',
  '/checkout',
  '/orders',
  '/mypage',
  '/wishlist',
  '/admin/products',
  '/admin/orders',
  '/admin/partnerships',
  '/about',
  '/principles',
  '/partners',
  '/partners/proposal',
  '/terms',
  '/privacy',
  '/clean-label',
  '/support',
  '/support/inquiry',
  '/payment/success',
  '/payment/fail',
]

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await context.addInitScript(() => localStorage.setItem('cm_welcome_hide_date', new Date().toISOString().slice(0, 10)))
  let forceProductFailure = false
  await context.route('**/rest/v1/**', async (route) => {
    const resource = new URL(route.request().url()).pathname.split('/').pop()
    if (resource === 'products' && forceProductFailure) {
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'fixture failure' }) })
      return
    }
    const body = resource === 'products' ? [productFixture] : []
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  })

  const page = await context.newPage()
  page.setDefaultTimeout(10000)
  const directResults = []
  for (const route of routes) {
    const response = await page.goto(`${origin}${route}`, { waitUntil: 'domcontentloaded' })
    assert.equal(response.status(), 200, route)
    await page.locator('#root > *').first().waitFor()
    assert.equal(await page.getByText('404', { exact: true }).count(), 0, route)
    directResults.push({ route, status: response.status() })
  }

  const viewportResults = []
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 768, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport)
    await page.goto(`${origin}/this-route-does-not-exist`)
    await page.getByRole('heading', { name: '페이지를 찾을 수 없습니다.', exact: true }).waitFor()
    await assertStateFits(page, '.exception-page .empty', viewportResults, '404')

    await page.goto(`${origin}/products/999999999`)
    await page.getByRole('heading', { name: '상품을 찾을 수 없습니다.', exact: true }).waitFor()
    await assertStateFits(page, '.exception-page .empty', viewportResults, 'product-not-found')

    await page.goto(`${origin}/search/?q=ZZZ-NO-MATCH-987654`)
    await page.getByRole('heading', { name: '선택하신 조건에 맞는 상품이 없습니다.', exact: true }).waitFor()
    assert.equal(new URL(page.url()).searchParams.get('q'), 'ZZZ-NO-MATCH-987654')
    await assertStateFits(page, '.page-mid > .empty', viewportResults, 'search-empty')

    forceProductFailure = true
    await page.goto(origin)
    await page.getByRole('heading', { name: '상품을 불러오지 못했어요.', exact: true }).first().waitFor()
    await assertStateFits(page, '.home-recommended-error', viewportResults, 'home-products-error')
    forceProductFailure = false
  }

  const successQuery = '?paymentKey=test_payment_key&orderId=cm_test_order&amount=13000'
  const successResponse = await page.goto(`${origin}/payment/success${successQuery}`, { waitUntil: 'domcontentloaded' })
  assert.equal(successResponse.status(), 200)
  await page.getByRole('heading', { name: '로그인 상태를 확인해 주세요', exact: true }).waitFor()
  assert.equal(await page.evaluate(() => window.location.search), successQuery)

  const failQuery = '?code=PAY_PROCESS_CANCELED&message=test_message&orderId=cm_test_order'
  const failResponse = await page.goto(`${origin}/payment/fail${failQuery}`, { waitUntil: 'domcontentloaded' })
  assert.equal(failResponse.status(), 200)
  await page.getByRole('heading', { name: '결제가 완료되지 않았어요', exact: true }).waitFor()
  assert.equal(await page.evaluate(() => window.location.search), failQuery)

  const adminResponse = await page.goto(`${origin}/admin/orders`, { waitUntil: 'domcontentloaded' })
  assert.equal(adminResponse.status(), 200)
  await page.getByRole('heading', { name: '로그인이 필요한 페이지입니다.', exact: true }).waitFor()

  await page.goto(origin)
  await page.getByRole('button', { name: /추천 상품 더보기/ }).waitFor()
  await page.getByRole('button', { name: /추천 상품 더보기/ }).click()
  await page.waitForURL(`${origin}/products`)
  assert.equal(new URL(page.url()).pathname, '/products')

  const scriptPath = await page.locator('script[type="module"]').getAttribute('src')
  const stylesheetPath = await page.locator('link[rel="stylesheet"]').evaluateAll((links) => links.map((link) => link.getAttribute('href')).find((href) => href?.startsWith('/assets/')))
  for (const assetPath of [scriptPath, stylesheetPath, '/favicon.svg']) {
    assert.ok(assetPath)
    const response = await context.request.get(`${origin}${assetPath}`)
    assert.equal(response.status(), 200, assetPath)
    assert.ok((await response.body()).length > 0, assetPath)
  }

  await context.close()

  const userId = '00000000-0000-4000-8000-000000000099'
  const userContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await userContext.addInitScript(({ session }) => {
    localStorage.setItem('cm_welcome_hide_date', new Date().toISOString().slice(0, 10))
    localStorage.setItem('sb-owxgtzepynkwdixmwhim-auth-token', JSON.stringify(session))
  }, { session: makeSession(userId) })
  let failOrders = false
  let failCart = false
  let failWishlist = false
  let failProfileContact = false
  await userContext.route('**/rest/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const resource = url.pathname.split('/').pop()
    const select = url.searchParams.get('select') || ''
    if ((resource === 'orders' && failOrders)
      || (resource === 'cart_items' && failCart)
      || (resource === 'wishlist_items' && failWishlist)
      || (resource === 'profiles' && failProfileContact && !select.includes('role'))) {
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'fixture failure' }) })
      return
    }
    if (resource === 'profiles') {
      const body = select.includes('role')
        ? { display_name: '라우팅 회원', primary_goal: 'nutrition_management', role: 'user' }
        : { phone: '', postal_code: '', address: '', address_detail: '' }
      await route.fulfill({ status: 200, headers: { 'Content-Type': 'application/json', 'Content-Range': '0-0/1' }, body: JSON.stringify(body) })
      return
    }
    if (resource === 'user_preferences') {
      await route.fulfill({ status: 200, headers: { 'Content-Type': 'application/json', 'Content-Range': '0-0/1' }, body: JSON.stringify({ low_sugar: false, low_sodium: false, high_protein: false, exclude_caffeine: false, excluded_allergens: [] }) })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(resource === 'products' ? [productFixture] : []) })
  })
  const userPage = await userContext.newPage()
  userPage.setDefaultTimeout(10000)
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 768, height: 900 }, { width: 390, height: 844 }]) {
    await userPage.setViewportSize(viewport)
    await userPage.goto(`${origin}/orders`)
    await userPage.getByRole('heading', { name: '아직 주문 내역이 없어요.', exact: true }).waitFor()
    await assertStateFits(userPage, '.page-mid > .empty', viewportResults, 'orders-empty')

    await userPage.goto(`${origin}/cart`)
    await userPage.getByRole('heading', { name: '장바구니가 비어 있어요.', exact: true }).waitFor()
    await assertStateFits(userPage, '.cart-empty', viewportResults, 'cart-empty')
  }
  failOrders = true
  await userPage.goto(`${origin}/orders`)
  await userPage.getByRole('heading', { name: '주문 내역을 불러오지 못했어요.', exact: true }).waitFor()
  failOrders = false
  failCart = true
  await userPage.goto(`${origin}/cart`)
  await userPage.getByRole('heading', { name: '장바구니를 불러오지 못했어요.', exact: true }).waitFor()
  failCart = false
  failOrders = true
  await userPage.goto(`${origin}/mypage`)
  await userPage.getByText('최근 주문을 불러오지 못했어요.', { exact: true }).waitFor()
  failOrders = false
  failWishlist = true
  await userPage.goto(`${origin}/mypage`)
  await userPage.getByText('찜 목록을 불러오지 못했어요.', { exact: true }).waitFor()
  failWishlist = false
  failProfileContact = true
  await userPage.goto(`${origin}/mypage`)
  await userPage.getByText('회원정보를 불러오지 못했어요.', { exact: true }).waitFor()
  await userContext.close()

  const adminContext = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await adminContext.addInitScript(({ session }) => {
    localStorage.setItem('cm_welcome_hide_date', new Date().toISOString().slice(0, 10))
    localStorage.setItem('sb-owxgtzepynkwdixmwhim-auth-token', JSON.stringify(session))
  }, { session: makeSession('00000000-0000-4000-8000-000000000100') })
  let failAdminOrders = false
  let failPartnerships = false
  await adminContext.route('**/rest/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const resource = url.pathname.split('/').pop()
    const select = url.searchParams.get('select') || ''
    if ((resource === 'orders' && failAdminOrders) || (resource === 'partnership_inquiries' && failPartnerships)) {
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'fixture failure' }) })
      return
    }
    if (resource === 'profiles') {
      const body = select.includes('role')
        ? { display_name: '라우팅 관리자', primary_goal: 'nutrition_management', role: 'admin' }
        : select.includes('user_id') ? [] : { phone: '', postal_code: '', address: '', address_detail: '' }
      await route.fulfill({ status: 200, headers: { 'Content-Type': 'application/json', 'Content-Range': '0-0/1' }, body: JSON.stringify(body) })
      return
    }
    if (resource === 'user_preferences') {
      await route.fulfill({ status: 200, headers: { 'Content-Type': 'application/json', 'Content-Range': '0-0/1' }, body: JSON.stringify({ low_sugar: false, low_sodium: false, high_protein: false, exclude_caffeine: false, excluded_allergens: [] }) })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(resource === 'products' ? [productFixture] : []) })
  })
  const adminPage = await adminContext.newPage()
  adminPage.setDefaultTimeout(10000)
  await adminPage.goto(`${origin}/admin/orders`)
  await adminPage.getByRole('heading', { name: '표시할 주문이 없습니다.', exact: true }).waitFor()
  failAdminOrders = true
  await adminPage.goto(`${origin}/admin/orders`)
  await adminPage.getByRole('heading', { name: '주문을 불러오지 못했습니다.', exact: true }).waitFor()
  failAdminOrders = false
  await adminPage.goto(`${origin}/admin/partnerships`)
  await adminPage.getByRole('heading', { name: '접수된 협업 제안이 없습니다.', exact: true }).waitFor()
  failPartnerships = true
  await adminPage.goto(`${origin}/admin/partnerships`)
  await adminPage.getByRole('heading', { name: '협업 제안을 불러오지 못했습니다.', exact: true }).waitFor()
  await adminContext.close()

  console.log(JSON.stringify({
    directResults,
    paymentSuccessQueryPreserved: true,
    paymentFailQueryPreserved: true,
    adminGuardRenderedAfterDirectNavigation: true,
    internalNavigationReached: '/products',
    staticAssetsLoaded: [scriptPath, stylesheetPath, '/favicon.svg'],
    exceptionStates: { unknownRoute: true, productNotFound: true, searchEmpty: true, homeProductsError: true, ordersEmptyAndError: true, cartEmptyAndError: true, myPageErrors: true, adminOrdersEmptyAndError: true, partnershipsEmptyAndError: true },
    viewportResults,
  }, null, 2))
} finally {
  await browser.close()
}
