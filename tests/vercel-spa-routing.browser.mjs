import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true })
const origin = process.env.CAREMARKET_TEST_ORIGIN || 'http://127.0.0.1:4173'

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
  '/payment/success',
  '/payment/fail',
]

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await context.addInitScript(() => localStorage.setItem('cm_welcome_hide_date', new Date().toISOString().slice(0, 10)))
  await context.route('**/rest/v1/**', async (route) => {
    const resource = new URL(route.request().url()).pathname.split('/').pop()
    const body = resource === 'products' ? [{
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
    }] : []
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
  console.log(JSON.stringify({
    directResults,
    paymentSuccessQueryPreserved: true,
    paymentFailQueryPreserved: true,
    adminGuardRenderedAfterDirectNavigation: true,
    internalNavigationReached: '/products',
    staticAssetsLoaded: [scriptPath, stylesheetPath, '/favicon.svg'],
  }, null, 2))
} finally {
  await browser.close()
}
