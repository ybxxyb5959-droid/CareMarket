import fs from 'node:fs'
import { analyzeCartNutrition, composeCartInsight, cartAnalysisBasis } from '../supabase/functions/_shared/cart-nutrition-analysis.js'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'

// Explicit browser regression test. Uses the bundled Playwright runtime and HTTP fixtures only.
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
const origin = process.env.CAREMARKET_ORIGIN || 'http://127.0.0.1:5174'
const supabaseUrl = process.env.SUPABASE_URL
assert.ok(supabaseUrl, 'SUPABASE_URL is required')

const userId = '00000000-0000-4000-8000-000000000001'
const products = JSON.parse(fs.readFileSync(new URL('../data/products.seed.json', import.meta.url))).map((p,i)=>({...p,product_id:i+1})).filter(p=>[1,51,71,72,75].includes(p.product_id))
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
    if (url.pathname === '/functions/v1/ai-insights') {
      const ids = request.postDataJSON().product_ids
      assert.ok(ids.length >= 2 && ids.length <= 3)
      return json(route, { insight: { summary: '비교 테스트', highlights: [], goal_fit_summary: '등록 정보 확인', recommendation: null } })
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

  for (const width of [1440, 790, 390]) {
    await page.setViewportSize({width, height: 900})
    await page.goto(origin + '/products?category=' + encodeURIComponent('영양제'))
    await page.locator('.card-compare').first().waitFor()
    for (let i=0; i<3; i++) await page.locator('.card-compare').nth(i).click()
    await page.locator('.goal-nav').getByRole('button', {name:'전체상품', exact:true}).click()
    const other = page.locator('.card').filter({has:page.locator('.card-name',{hasText:products[0].name})}).locator('.card-compare')
    await other.click()
    assert.match(await page.locator('.compare-toolbar').innerText(), /3\/3/)
    assert.equal(await page.getByRole('button',{name:'비교하기',exact:true}).isEnabled(),true)
    await page.getByRole('button',{name:'비교하기',exact:true}).click()
    await page.locator('.compare-remove').first().click()
    assert.equal(await page.locator('.compare-remove').count(),2)
    await page.getByRole('button',{name:'비교 닫기'}).click()
    await other.click()
    assert.match(await page.locator('.compare-toolbar').innerText(), /3\/3/)
    await page.getByRole('button',{name:'비교하기',exact:true}).click()
    const bounds=await page.locator('.compare-modal').boundingBox()
    assert.ok(bounds.width<=820 && bounds.width<=width && bounds.height<=900 && bounds.x>=0 && bounds.y>=0, JSON.stringify(bounds))
    await noOverflow('.compare-modal')
    assert.equal(await page.locator('.compare-table th').evaluateAll(cells => cells.every(cell => getComputedStyle(cell).whiteSpace === 'normal')), true)
    await page.locator('.compare-modal').screenshot({path:'tmp/comparison-fixed-'+width+'.png'})
    await page.locator('.compare-remove').first().click()
    await page.locator('.compare-remove').first().click()
    await page.getByRole('button',{name:'비교 닫기'}).click()
    // Zero search results must not hide the selection toolbar.
    await page.evaluate(() => { history.pushState({}, '', '/products?q=zzzznomatch'); window.dispatchEvent(new PopStateEvent('popstate')) })
    await page.getByText('선택하신 조건에 맞는 상품이 없습니다.').waitFor()
    await page.getByRole('button',{name:'비교하기',exact:true}).click()
    assert.equal(await page.locator('.compare-remove').count(),1)
    await page.getByRole('button',{name:'전체 비우기'}).click()
    assert.equal(await page.locator('.compare-remove').count(),0)
    await page.getByRole('button',{name:'비교 닫기'}).click()
    console.log('PASS selection management and modal bounds', width, bounds)
  }
  assert.deepEqual(pageErrors,[])
} finally { await browser.close() }
