import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'

// Explicit browser regression test. Supabase requests are fixture-only and never reach the remote project.
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
const origin = process.env.CAREMARKET_ORIGIN || 'http://127.0.0.1:5177'
const supabaseUrl = process.env.SUPABASE_URL
assert.ok(supabaseUrl, 'SUPABASE_URL is required')

const userId = '00000000-0000-4000-8000-000000000040'
const image = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect width="80" height="80" fill="%23dce8d9"/%3E%3C/svg%3E'
const products = Array.from({ length: 6 }, (_, index) => ({
  product_id: index + 1,
  name: `찜 요약 테스트 상품 ${index + 1}`,
  brand: `CARE ${index + 1}`,
  category: '도시락·간편식',
  price: 5900 + index * 1000,
  original_price: 6900 + index * 1000,
  stock: 20,
  summary: '찜 요약 레이아웃 검증 상품',
  serving_size: '1개',
  calories: 240,
  protein: 18,
  carbs: 24,
  fat: 6,
  sugar: 3,
  sodium: 320,
  allergens: [],
  contains_caffeine: false,
  main_ingredients: ['닭가슴살'],
  is_active: true,
  image_url: image,
}))

let serverWishlist = [1, 2, 3, 4]
const json = (route, body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true })

try {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const accessToken = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ sub: userId, aud: 'authenticated', role: 'authenticated', exp: 4102444800 })}.fixture`
  const authUser = { id: userId, aud: 'authenticated', role: 'authenticated', email: 'wishlist@example.test', user_metadata: { display_name: '찜 테스트' } }

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
    if (url.pathname === '/rest/v1/profiles') return json(route, { user_id: userId, display_name: '찜 테스트', primary_goal: 'nutrition_management', role: 'user' })
    if (url.pathname === '/rest/v1/user_preferences') return json(route, { low_sugar: false, low_sodium: false, high_protein: false, exclude_caffeine: false, excluded_allergens: [] })
    if (url.pathname === '/rest/v1/wishlist_items') return json(route, serverWishlist.map((product_id) => ({ product_id })))
    return json(route, [])
  })

  const page = await context.newPage()
  await page.goto(`${origin}/mypage`)
  await page.locator('.wishlist-quick').waitFor()

  assert.equal(await page.locator('.wishlist-quick-item').count(), 3)
  assert.equal(await page.getByRole('button', { name: '1개 상품 더보기' }).isVisible(), true)
  const panelBox = await page.locator('.wishlist-quick').boundingBox()
  const mypageBox = await page.locator('.mypage').boundingBox()
  assert.ok(panelBox && mypageBox && panelBox.x + panelBox.width < mypageBox.x, 'quick wishlist must float left of mypage content')

  await page.getByRole('button', { name: '찜한 상품 4개' }).click()
  await page.getByRole('heading', { name: '찜한 상품', exact: true }).waitFor()
  assert.equal(new URL(page.url()).pathname, '/wishlist')
  assert.equal(await page.locator('.wishlist-page-grid .card').count(), 4)

  serverWishlist = []
  await page.goto(`${origin}/mypage`)
  await page.locator('.profile-id h1').waitFor()
  assert.equal(await page.locator('.wishlist-quick').count(), 0)

  serverWishlist = [1, 2, 3, 4]
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${origin}/mypage`)
  await page.getByRole('button', { name: '찜한 상품 4개' }).waitFor()
  assert.equal(await page.getByRole('button', { name: '찜한 상품 4개' }).isVisible(), true)
  assert.equal(await page.locator('.wishlist-quick').isVisible(), false)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true)

  console.log('wishlist browser layout assertions passed')
} finally {
  await browser.close()
}
