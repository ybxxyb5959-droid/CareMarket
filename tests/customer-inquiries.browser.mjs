import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const playwrightModuleUrl = process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href
  : new URL('../node_modules/playwright-core/index.mjs', import.meta.url).href
const { chromium } = await import(playwrightModuleUrl)

const origin = process.env.CAREMARKET_TEST_ORIGIN || 'http://127.0.0.1:5174'
const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split(/\r?\n/)
  .filter((line) => line && !line.startsWith('#'))
  .map((line) => { const separator = line.indexOf('='); return [line.slice(0, separator), line.slice(separator + 1)] }))
const projectRef = new URL(env.VITE_SUPABASE_URL).hostname.split('.')[0]
const storageKey = `sb-${projectRef}-auth-token`
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const browser = await chromium.launch({ executablePath: chromePath, headless: true })

const encodeJwtPart = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
const identities = {
  userA: { id: '00000000-0000-4000-8000-000000000101', email: 'user-a@example.test', role: 'user' },
  userB: { id: '00000000-0000-4000-8000-000000000102', email: 'user-b@example.test', role: 'user' },
  admin: { id: '00000000-0000-4000-8000-000000000103', email: 'admin@example.test', role: 'admin' },
}
const sessions = Object.fromEntries(Object.entries(identities).map(([key, identity]) => [key, {
  access_token: `${encodeJwtPart({ alg: 'none', typ: 'JWT' })}.${encodeJwtPart({ sub: identity.id, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.test-signature`,
  refresh_token: `${key}-refresh-token`,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  expires_in: 3600,
  token_type: 'bearer',
  user: { id: identity.id, aud: 'authenticated', role: 'authenticated', email: identity.email },
}]))

const inquiries = []
let directPatchBlocked = false

function bearerSubject(request) {
  const token = request.headers().authorization?.replace(/^Bearer\s+/i, '')
  if (!token) return null
  try { return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).sub }
  catch { return null }
}

function identityForSubject(subject) {
  return Object.values(identities).find((identity) => identity.id === subject)
}

async function installBackend(context) {
  await context.route('**/rest/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const subject = bearerSubject(request)
    const identity = identityForSubject(subject)
    const table = url.pathname.split('/').filter(Boolean).at(-1)
    const objectHeaders = { 'Content-Type': 'application/json', 'Content-Range': '0-0/1' }

    if (table === 'profiles') {
      const select = url.searchParams.get('select') || ''
      const body = select.includes('role')
        ? { display_name: identity?.role === 'admin' ? '문의 관리자' : '문의 테스트 회원', primary_goal: 'nutrition_management', role: identity?.role || 'user' }
        : { phone: null, postal_code: null, address: null, address_detail: null }
      await route.fulfill({ status: 200, headers: objectHeaders, body: JSON.stringify(body) })
      return
    }
    if (table === 'user_preferences') {
      await route.fulfill({ status: 200, headers: objectHeaders, body: JSON.stringify({ low_sugar: false, low_sodium: false, high_protein: false, exclude_caffeine: false, excluded_allergens: [] }) })
      return
    }
    if (table === 'orders' || table === 'products' || table === 'wishlist_items' || table === 'cart_items') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      return
    }
    if (table === 'customer_inquiries' && request.method() === 'POST') {
      const payload = request.postDataJSON()
      if (!identity || payload.user_id !== subject || payload.status || payload.admin_answer) {
        await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: 'RLS denied insert' }) })
        return
      }
      inquiries.push({ ...payload, status: 'received', created_at: new Date().toISOString(), admin_answer: null, answered_at: null, answered_by: null, orders: null })
      await route.fulfill({ status: 201, contentType: 'application/json', body: '' })
      return
    }
    if (table === 'customer_inquiries' && request.method() === 'PATCH') {
      directPatchBlocked = identity?.role !== 'admin'
      await route.fulfill({ status: directPatchBlocked ? 403 : 204, contentType: 'application/json', body: directPatchBlocked ? JSON.stringify({ message: 'RLS denied update' }) : '' })
      return
    }
    if (table === 'customer_inquiries' && request.method() === 'GET') {
      const idFilter = url.searchParams.get('id')?.replace(/^eq\./, '')
      const visible = inquiries.filter((inquiry) => (identity?.role === 'admin' || inquiry.user_id === subject) && (!idFilter || inquiry.id === idFilter))
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(visible) })
      return
    }
    if (table === 'admin_answer_customer_inquiry' && request.method() === 'POST') {
      if (identity?.role !== 'admin') {
        await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: 'Administrator role required' }) })
        return
      }
      const payload = request.postDataJSON()
      const inquiry = inquiries.find((item) => item.id === payload.p_inquiry_id)
      if (!inquiry || !payload.p_answer?.trim() || inquiry.status === 'answered') {
        await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: 'Invalid answer' }) })
        return
      }
      Object.assign(inquiry, { admin_answer: payload.p_answer.trim(), status: 'answered', answered_at: new Date().toISOString(), answered_by: subject })
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(inquiry) })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
}

async function createContext(identityKey, viewport = { width: 1440, height: 1000 }) {
  const context = await browser.newContext({ viewport })
  await context.addInitScript(({ key, session }) => {
    localStorage.setItem('cm_welcome_hide_date', new Date().toISOString().slice(0, 10))
    localStorage.setItem(key, JSON.stringify(session))
  }, { key: storageKey, session: sessions[identityKey] })
  await installBackend(context)
  return context
}

async function assertNoOverflow(page, label, results) {
  const dimensions = await page.evaluate(() => ({ viewport: window.innerWidth, body: document.body.scrollWidth, root: document.documentElement.scrollWidth }))
  assert.ok(dimensions.body <= dimensions.viewport + 1, `${label}: body overflow ${JSON.stringify(dimensions)}`)
  assert.ok(dimensions.root <= dimensions.viewport + 1, `${label}: root overflow ${JSON.stringify(dimensions)}`)
  results.push({ label, ...dimensions })
}

const longTitle = '배송 상태 확인 요청 — 모바일에서도 길게 작성된 문의 제목이 영역 밖으로 넘치지 않아야 합니다'
const longContent = '주문 상품의 배송 상태를 확인해 주세요. '.repeat(22).trim()
const answerText = '문의하신 주문은 정상적으로 준비 중이며, 출고 후 주문 내역에서 배송 상태를 확인하실 수 있습니다. '.repeat(8).trim()
const viewportResults = []

try {
  const userAContext = await createContext('userA')
  const userAPage = await userAContext.newPage()
  userAPage.setDefaultTimeout(12000)
  await userAPage.goto(`${origin}/support`)
  await userAPage.getByRole('heading', { name: '무엇을 도와드릴까요?' }).waitFor()
  await userAPage.getByRole('button', { name: /1:1 문의하기/ }).last().click()
  await userAPage.locator('#inquiry-category').selectOption('배송')
  await userAPage.locator('#inquiry-title').fill(longTitle)
  await userAPage.locator('#inquiry-content').fill(longContent)
  await userAPage.locator('#inquiry-contactEmail').fill(identities.userA.email)
  await userAPage.locator('#inquiry-privacyAgreed').check()
  await userAPage.getByRole('button', { name: '문의 접수하기' }).click()
  await userAPage.getByRole('heading', { name: '문의가 접수되었습니다.' }).waitFor()
  assert.equal(inquiries.length, 1)
  await userAPage.getByRole('button', { name: '내 문의 확인하기' }).click()
  await userAPage.getByRole('heading', { name: '1:1 문의 내역' }).waitFor()
  await userAPage.getByRole('button', { name: longTitle }).click()
  await userAPage.getByRole('heading', { name: '답변을 준비하고 있어요.' }).waitFor()
  await assertNoOverflow(userAPage, 'customer-waiting-1440', viewportResults)

  const attack = await userAPage.evaluate(async ({ endpoint, key, inquiryId }) => {
    const session = JSON.parse(localStorage.getItem(key))
    const response = await fetch(`${endpoint}/rest/v1/customer_inquiries?id=eq.${inquiryId}`, { method: 'PATCH', headers: { apikey: session.access_token, authorization: `Bearer ${session.access_token}`, 'content-type': 'application/json' }, body: JSON.stringify({ status: 'answered', admin_answer: 'forged' }) })
    return response.status
  }, { endpoint: env.VITE_SUPABASE_URL, key: storageKey, inquiryId: inquiries[0].id })
  assert.equal(attack, 403)
  assert.equal(directPatchBlocked, true)
  await userAContext.close()

  const adminContext = await createContext('admin')
  const adminPage = await adminContext.newPage()
  adminPage.setDefaultTimeout(12000)
  await adminPage.goto(`${origin}/admin/inquiries`)
  await adminPage.getByRole('heading', { name: '1:1 문의 관리' }).waitFor()
  await adminPage.getByRole('button', { name: '보기', exact: true }).click()
  await adminPage.getByRole('button', { name: '답변 등록' }).click()
  await adminPage.getByText('답변 내용을 입력해 주세요.').waitFor()
  await adminPage.getByRole('textbox', { name: '답변 내용' }).fill(answerText)
  await adminPage.getByRole('button', { name: '답변 등록' }).click()
  await adminPage.getByText('답변이 등록되었습니다.').waitFor()
  await adminPage.getByText('등록된 답변입니다.').waitFor()
  assert.equal(inquiries[0].status, 'answered')
  assert.equal(inquiries[0].answered_by, identities.admin.id)
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 768, height: 900 }, { width: 390, height: 844 }]) {
    await adminPage.setViewportSize(viewport)
    await assertNoOverflow(adminPage, `admin-detail-${viewport.width}`, viewportResults)
  }
  await adminContext.close()

  const userAReturnContext = await createContext('userA')
  const userAReturnPage = await userAReturnContext.newPage()
  userAReturnPage.setDefaultTimeout(12000)
  await userAReturnPage.goto(`${origin}/support/inquiries`)
  await userAReturnPage.getByText('답변 완료', { exact: true }).last().waitFor()
  await userAReturnPage.getByRole('button', { name: longTitle }).click()
  await userAReturnPage.getByRole('heading', { name: 'CareMarket 답변' }).waitFor()
  await userAReturnPage.getByText(answerText, { exact: true }).waitFor()
  await userAReturnPage.getByText(/답변일/).waitFor()
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 768, height: 900 }, { width: 390, height: 844 }]) {
    await userAReturnPage.setViewportSize(viewport)
    await assertNoOverflow(userAReturnPage, `customer-answered-${viewport.width}`, viewportResults)
  }
  await userAReturnContext.close()

  const userBContext = await createContext('userB', { width: 390, height: 844 })
  const userBPage = await userBContext.newPage()
  userBPage.setDefaultTimeout(12000)
  await userBPage.goto(`${origin}/support/inquiries`)
  await userBPage.getByRole('heading', { name: '아직 접수한 문의가 없어요.' }).waitFor()
  assert.equal(await userBPage.getByText(longTitle).count(), 0)
  await assertNoOverflow(userBPage, 'customer-b-empty-390', viewportResults)
  await userBContext.close()

  console.log(JSON.stringify({
    flow: ['FAQ', '1:1 문의 작성', '접수 완료', '답변 대기', '관리자 답변', '답변 완료', '고객 답변 확인'],
    userBBlocked: true,
    customerProtectedUpdateBlocked: directPatchBlocked,
    inquiryStatus: inquiries[0].status,
    viewportResults,
  }))
} finally {
  await browser.close()
}
