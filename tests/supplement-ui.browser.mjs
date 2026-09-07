import fs from 'node:fs'
import { demoSupplements } from '../src/data/demo-supplements.js'
import { analyzeCartNutrition, composeCartInsight, cartAnalysisBasis } from '../supabase/functions/_shared/cart-nutrition-analysis.js'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'

// Explicit browser regression test. Uses the bundled Playwright runtime and HTTP fixtures only.
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
const origin = process.env.CAREMARKET_ORIGIN || 'http://127.0.0.1:5174'
const supabaseUrl = process.env.SUPABASE_URL
assert.ok(supabaseUrl, 'SUPABASE_URL is required')

const userId = '00000000-0000-4000-8000-000000000001'
const products = JSON.parse(fs.readFileSync(new URL('../data/products.seed.json', import.meta.url))).map((p,i)=>({...p,product_id:i+1})).filter(p=>[1,51,71,72,75,79].includes(p.product_id))
products.push({...products.find(p=>p.product_id===75),product_id:999,name:'마그네슘 비교용 테스트 상품',main_ingredients:['쌀발효마그네슘 200mg','비타민B6염산염']})
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
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, hasTouch: true })
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
      if (request.postDataJSON().mode === 'compare') {
        if (failAnalysis) return json(route, { message: 'AI failed' }, 503)
        return json(route, { insight: { summary: '잘못된 이전 AI 결과', highlights: [], goal_fit_summary: '근육 성장에 좋다', recommendation: { product_id: 71, reason: '임의 추천' } } })
      }
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
  preferences = { ...preferences, low_sugar: false, high_protein: false, excluded_allergens: [] }
  const noOverflow = async selector => assert.equal(await page.locator(selector).evaluate(el => el.scrollWidth > el.clientWidth + 1), false, selector)
  for (const width of [1440, 790]) {
    await page.setViewportSize({ width, height: 1000 })
    for (const id of [1, 71, 72, 75, 79, 900001, 900002, 900003]) {
      await page.goto(origin + '/products/' + id)
      await page.locator('.nutri-card').first().waitFor()
      const cards = page.locator('.nutri-card')
      if (id === 1) { assert.equal(await cards.count(), 1); assert.match(await cards.innerText(), /영양성분 정보/); assert.equal(await page.getByText('주요 성분 함량', { exact: true }).count(), 0) }
      else {
        assert.equal(await cards.count(), 2)
        assert.match(await cards.first().innerText(), /주요 성분 함량/)
        assert.match(await cards.last().innerText(), /영양성분/)
        const left = await cards.first().boundingBox(), right = await cards.last().boundingBox()
        assert.ok(Math.abs(left.y - right.y) <= 1 && right.x >= left.x + left.width, 'supplement facts must be side by side')
        await page.locator('.supplement-facts-layout').screenshot({ path: `tmp/supplement-facts-${id}-${width}.png` })
        if (id === 71 || id === 79) {
          assert.equal(await cards.first().locator('.nutri-cell').count(), id === 71 ? 5 : 4)
          assert.match(await cards.first().innerText(), id === 71 ? /100mg/ : /1,000mg/)
          assert.doesNotMatch(await cards.first().innerText(), /임의|더미|demo|정보가 없습니다/i)
        }
        if (id >= 900001) {
          assert.equal(await cards.first().locator('.nutri-cell').count(), 1); assert.match(await cards.first().innerText(), /mg/)
          const photo = page.locator(`img[src="/assets/demo/supplement-${id}-photo.webp"]`).first()
          await photo.waitFor()
          assert.ok(await photo.evaluate(img => img.complete && img.naturalWidth > 0), 'generated product photo loads')
        }
        assert.doesNotMatch(await cards.first().innerText(), /함량 미등록/)
        if (id === 72) { assert.match(await cards.first().innerText(), /EPA 및 DHA 함유유지/); assert.match(await cards.first().innerText(), /1,000mg/); assert.doesNotMatch(await cards.first().innerText(), /600mg|360mg|240mg/) }
      }
      await noOverflow('.product-detail-page')
      await cards.first().screenshot({ path: `tmp/supplement-detail-${id}-${width}.png` })
    }
    for (const pair of [[71,72], [1,71], [75,999]]) {
      await page.goto(origin + '/products')
      await page.locator('.card').first().waitFor()
      for (const id of pair) {
        const card=page.locator('.card').filter({has:page.locator('.card-name',{hasText:products.find(p=>p.product_id===id).name})})
        await card.locator('.card-compare').click()
      }
      await page.getByRole('button', { name: '비교하기', exact: true }).click()
      await page.locator('.compare-modal').waitFor()
      await page.locator('.ai-insight-status').waitFor({state:'hidden'})
      assert.equal(await page.locator('.compare-recommendation').count(), 0)
      assert.equal(await page.locator('.compare-ai-content').getByRole('button', { name: /상세보기/ }).count(), 0)
      const info = page.getByRole('button', { name: '영양제 추천 미제공 안내' })
      await info.hover()
      await page.getByRole('tooltip').waitFor()
      if (pair[0] === 71) await page.locator('.compare-ai-summary').screenshot({ path: `tmp/supplement-info-refined-${width}.png` })
      await page.keyboard.press('Escape')
      assert.equal(await page.getByRole('tooltip').count(), 0)
      assert.equal(await page.locator('.compare-modal').count(), 1)
      await info.click()
      await page.getByRole('tooltip').waitFor()
      await page.getByRole('heading', { name: 'AI 비교 요약', exact: true }).click()
      assert.equal(await page.getByRole('tooltip').count(), 0)
      if (width === 790) {
        await info.tap()
        await page.getByRole('tooltip').waitFor()
        await page.keyboard.press('Escape')
      }
      await info.focus()
      await page.keyboard.press('Enter')
      await page.getByRole('tooltip').waitFor()
      await page.keyboard.press('Escape')
      assert.doesNotMatch(await page.locator('.compare-ai-content').innerText(), /잘못된 이전 AI 결과|근육 성장/)
      if (pair[0] === 75) { assert.match(await page.locator('.compare-table').innerText(), /315mg/); assert.match(await page.locator('.compare-table').innerText(), /200mg/) }
      await noOverflow('.compare-modal')
      await page.locator('.compare-modal').screenshot({ path: `tmp/supplement-compare-${pair.join('-')}-${width}.png` })
      await page.getByRole('button', {name:'비교 닫기'}).click()
    }
    for (const goal of ['muscle_gain','supplement_search']) {
      profile.primary_goal=goal
      serverCart=products.filter(p=>(goal==='muscle_gain'?[1,51,71]:[71,72]).includes(p.product_id)).map(product=>({product,quantity:1}))
      failAnalysis=true // Exercise browser fallback when the Edge Function is unavailable.
      await page.goto(origin + '/cart')
      await page.getByRole('button', {name:'장바구니 분석 확인하기',exact:true}).click()
      await page.locator('.cart-ai-product-reason').first().waitFor()
      const supplementCard=page.locator('.cart-ai-product-reason').filter({hasText:products.find(p=>p.product_id===71).name})
      assert.match(await supplementCard.innerText(), goal==='muscle_gain'?/보조 영양 상품/:/영양제 구성/)
      assert.match(await supplementCard.innerText(), /주요 성분/)
      assert.doesNotMatch(await supplementCard.innerText(), /확인 필요|단백질.*기준 밖|정보가 충분하지/)
      await noOverflow('.cart-ai-canvas')
      await page.locator('.cart-ai-canvas').screenshot({ path: `tmp/supplement-cart-${goal}-${width}.png` })
    }
    profile.primary_goal='muscle_gain'
    for (const [goal, id] of [['muscle_gain',900001], ['weight_control',900002], ['nutrition_management',900003], ['supplement_search',71]]) {
      profile.primary_goal = goal
      await page.goto(origin + '/products?category=' + encodeURIComponent('영양제'))
      await page.locator('.card').first().waitFor()
      assert.match(await page.locator('.card-name').first().innerText(), new RegExp(id === 71 ? products.find(p=>p.product_id===id).name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : demoSupplements.find(p=>p.id===id).name))
      assert.doesNotMatch(await page.locator('.card').first().innerText(), /0kcal|단백질 0g/)
      if (goal === 'supplement_search') {
        assert.equal(await page.getByLabel('주요 성분 종류').count(), 0)
        const menu = page.locator('.cat-item').filter({ has: page.getByRole('button', { name: '영양제', exact: true }) })
        await menu.hover()
        await menu.getByRole('button', { name: '기타', exact: true }).click()
        await page.getByRole('heading', { name: '영양제 · 기타', exact: true }).waitFor()
        assert.match(await page.locator('.product-grid').innerText(), /크레아틴/)
        assert.doesNotMatch(await page.locator('.product-grid').innerText(), /오메가3|멀티비타민/)
      }
      await noOverflow('#product-list')
      await page.screenshot({ path: `tmp/supplement-catalog-${goal}-${width}.png` })
      if (id !== 71) {
        const demo = demoSupplements.find(p => p.id === id)
        await page.locator('.card-name').first().click()
        await page.getByRole('button', { name: '장바구니에서 구매하기', exact: true }).click()
        await page.getByRole('button', { name: '장바구니 분석 확인하기', exact: true }).click()
        const reason = page.locator('.cart-ai-product-reason').filter({ hasText: demo.name })
        await reason.waitFor()
        assert.match(await reason.innerText(), /보조 영양 상품/)
        assert.match(await reason.innerText(), /mg/)
        assert.doesNotMatch(await reason.innerText(), /저당|고단백|저열량/)
        assert.equal(serverCart.some(item => item.product.product_id === id), false)
        await page.getByRole('button', { name: /개 상품 주문하기/ }).click()
        assert.match(page.url(), /\/cart$/)
        await noOverflow('.cart-ai-canvas')
      }
    }
    profile.primary_goal = 'muscle_gain'
  }
  assert.deepEqual(pageErrors, [])
  console.log(JSON.stringify({ viewports:[1440,790], detail:[1,71,72,75,900001,900002,900003], comparison:['multi-omega','food-supplement','magnesium-fixture'], cart:['muscle','supplement-search','demo-goals'], catalog:['muscle','weight','nutrition','exploration'], tooltip:['hover','click','keyboard','escape','outside'], fallback:true, pageErrors }))
} finally { await browser.close() }

