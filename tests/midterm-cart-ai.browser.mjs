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

  await page.goto(origin + '/cart')
  await page.getByRole('button', { name: '장바구니 분석 확인하기', exact: true }).waitFor()
  assert.equal(await page.locator('.cart-checkout-button, .cart-mobile-checkout').count(), 0)
  await page.locator('.cart-btn').click()
  await page.getByRole('button', { name: '장바구니 분석하기', exact: true }).click()
  await page.locator('.drawer .cart-ai-result-compact').waitFor()
  assert.equal(analysisCalls, 1)
  assert.equal(await page.getByRole('button', { name: '주문하기', exact: true }).count(), 0)
  await page.getByRole('button', { name: '분석 결과 자세히 보기', exact: true }).click()
  await page.locator('#cart-ai-guide .cart-ai-product-reason').waitFor()
  await page.getByRole('button', { name: '담백한 닭가슴살 수량 증가' }).click()
  await page.getByText('장바구니 또는 구매 조건이 변경됐어요.', { exact: true }).waitFor()
  assert.match(await page.locator('.cart-ai-dashboard-head').innerText(), /구매 수량 2개/)
  await page.locator('.cart-ai-state').getByRole('button', { name: '다시 분석', exact: true }).click()
  await page.locator('.cart-ai-state').waitFor({ state: 'hidden' })
  await page.locator('.cart-ai-evidence summary').click()
  assert.match(await page.locator('.cart-ai-nutrition-details').innerText(), /구매 수량 2개/)
  await page.locator('.cart-btn').click()
  await page.getByRole('button', { name: '수량 증가', exact: true }).click()
  await page.locator('.drawer .ai-insight-stale').waitFor()
  await page.locator('.drawer').getByRole('button', { name: '다시 분석', exact: true }).click()
  await page.locator('.drawer .cart-ai-result-compact').waitFor()
  assert.equal(serverCart[0].quantity, 3)
  serverCart=[]
  await page.reload()
  await page.getByRole('heading', { name: '장바구니가 비어 있어요.' }).waitFor()
  await page.locator('.cart-btn').click()
  await page.getByText('담긴 상품이 없습니다.', { exact: true }).waitFor()
  assert.equal(await page.locator('.cart-ai-insight').count(),0)
  for(const path of ['/checkout','/orders','/admin','/admin/products','/admin/orders','/admin/reviews','/admin/unknown','/payment/success','/payment/fail','/wishlist']) {
    await page.goto(origin+path)
    await page.getByRole('heading',{name:'페이지를 찾을 수 없습니다.'}).waitFor()
  }
  const guest=await browser.newContext()
  await guest.route('**/*', route=>new URL(route.request().url()).origin===new URL(supabaseUrl).origin ? json(route,[]) : route.continue())
  const guestPage=await guest.newPage()
  guestPage.on('pageerror',error=>pageErrors.push(error.message))
  await guestPage.goto(origin+'/cart')
  await guestPage.getByRole('heading',{name:'장바구니가 비어 있어요.'}).waitFor()
  await guestPage.locator('.cart-btn').click()
  await guestPage.getByRole('dialog').waitFor()
  assert.equal(await guestPage.locator('.drawer').count(), 0)
  assert.equal(await guestPage.locator('.cart-ai-insight').count(),0)
  assert.deepEqual(pageErrors,[])
  console.log(JSON.stringify({stage:'midterm',drawer:true,cart:true,quantityRefresh:true,emptyCart:true,guest:true,blockedRoutes:10,analysisCalls,pageErrors}))
} finally { await browser.close() }
