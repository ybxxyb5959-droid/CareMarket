import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true })
const origin = process.env.CAREMARKET_TEST_ORIGIN || 'http://127.0.0.1:5174'

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  await context.addInitScript(() => localStorage.setItem('cm_welcome_hide_date', new Date().toISOString().slice(0, 10)))
  const page = await context.newPage()
  const emailRequests = []
  const emailConsoleErrors = []

  page.on('request', (request) => {
    const url = request.url()
    if (/notify-partnership|api\.resend\.com/i.test(url)) emailRequests.push(url)
  })
  page.on('console', (message) => {
    if (message.type() === 'error' && /notify-partnership|resend|email notification/i.test(message.text())) {
      emailConsoleErrors.push(message.text())
    }
  })

  await page.goto(`${origin}/partners/proposal`)
  await page.locator('#proposal-brandName').fill('CareMarket 협업 제안 자동 점검')
  await page.locator('#proposal-contactName').fill('QA 담당자')
  await page.locator('#proposal-email').fill('partnership-flow-test@example.test')
  await page.locator('#proposal-phone').fill('010-0000-0000')
  await page.locator('#proposal-website').fill('https://example.test')
  await page.locator('#proposal-proposalType').selectOption({ label: '콘텐츠 협업' })
  await page.locator('#proposal-productCategory').fill('테스트 카테고리')
  await page.locator('#proposal-productName').fill('테스트 제품')
  await page.locator('#proposal-brandDescription').fill('Supabase 저장과 관리자 협업 제안 처리 흐름을 검증하는 자동 점검 레코드입니다.')
  await page.locator('#proposal-partnershipReason').fill('이메일 호출 없이 내부 운영 흐름만 사용하는지 확인합니다.')
  await page.locator('#proposal-privacyAgreed').check()

  const insertResponsePromise = page.waitForResponse((response) => (
    response.request().method() === 'POST'
    && response.url().includes('/rest/v1/partnership_inquiries')
  ))
  await page.getByRole('button', { name: /입점·제휴 제안 보내기/ }).click()
  const insertResponse = await insertResponsePromise
  assert.ok(insertResponse.ok(), `Partnership INSERT failed with ${insertResponse.status()}`)
  await page.getByRole('heading', { name: '제안이 접수되었습니다.' }).waitFor()

  const payload = insertResponse.request().postDataJSON()
  assert.equal(payload.status, undefined)
  assert.match(payload.id, /^[0-9a-f-]{36}$/i)
  assert.deepEqual(emailRequests, [])
  assert.deepEqual(emailConsoleErrors, [])

  const adminUserId = '00000000-0000-4000-8000-000000000001'
  const encodeJwtPart = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const accessToken = `${encodeJwtPart({ alg: 'none', typ: 'JWT' })}.${encodeJwtPart({
    sub: adminUserId,
    role: 'authenticated',
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 3600,
  })}.test-signature`
  const session = {
    access_token: accessToken,
    refresh_token: 'browser-fixture-refresh-token',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    expires_in: 3600,
    token_type: 'bearer',
    user: { id: adminUserId, aud: 'authenticated', role: 'authenticated', email: 'admin@example.test' },
  }
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  await adminContext.addInitScript(({ storedSession }) => {
    localStorage.setItem('cm_welcome_hide_date', new Date().toISOString().slice(0, 10))
    localStorage.setItem('sb-owxgtzepynkwdixmwhim-auth-token', JSON.stringify(storedSession))
  }, { storedSession: session })

  let adminInquiry = {
    ...payload,
    status: 'new',
    admin_note: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    reviewed_at: null,
    reviewed_by: null,
  }
  const adminUpdates = []
  await adminContext.route('**/rest/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const table = url.pathname.split('/').pop()
    const objectHeaders = { 'Content-Type': 'application/json', 'Content-Range': '0-0/1' }

    if (table === 'profiles') {
      const select = url.searchParams.get('select') || ''
      const body = select.includes('role')
        ? { display_name: 'CareMarket 관리자', primary_goal: null, role: 'admin' }
        : { phone: null, postal_code: null, address: null, address_detail: null }
      await route.fulfill({ status: 200, headers: objectHeaders, body: JSON.stringify(body) })
      return
    }
    if (table === 'user_preferences') {
      await route.fulfill({ status: 200, headers: objectHeaders, body: JSON.stringify({
        low_sugar: false,
        low_sodium: false,
        high_protein: false,
        exclude_caffeine: false,
        excluded_allergens: [],
      }) })
      return
    }
    if (table === 'partnership_inquiries' && request.method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([adminInquiry]) })
      return
    }
    if (table === 'partnership_inquiries' && request.method() === 'PATCH') {
      const update = request.postDataJSON()
      adminUpdates.push(update)
      adminInquiry = { ...adminInquiry, ...update, updated_at: new Date().toISOString() }
      await route.fulfill({ status: 200, headers: objectHeaders, body: JSON.stringify(adminInquiry) })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })

  const adminPage = await adminContext.newPage()
  adminPage.setDefaultTimeout(10000)
  await adminPage.goto(`${origin}/admin/partnerships`)
  try {
    await adminPage.getByRole('heading', { name: '협업 제안', exact: true }).waitFor()
  } catch (error) {
    console.error(`Admin page did not become ready:\n${await adminPage.locator('body').innerText()}`)
    throw error
  }
  assert.equal(await adminPage.getByRole('button', { name: '협업 제안', exact: true }).count(), 1)
  await adminPage.getByText('CareMarket 협업 제안 자동 점검', { exact: true }).waitFor()
  await adminPage.getByText('신규', { exact: true }).last().waitFor()
  await adminPage.getByRole('button', { name: '보기', exact: true }).click()
  await adminPage.getByRole('dialog').waitFor()
  assert.equal(await adminPage.getByText('partnership-flow-test@example.test', { exact: true }).count(), 1)
  assert.equal(await adminPage.getByText(payload.brand_description, { exact: true }).count(), 1)

  await adminPage.locator('.admin-partnership-operations select').selectOption('reviewing')
  await adminPage.locator('.admin-partnership-operations textarea').fill('제품 성분표 확인 예정')
  await adminPage.getByRole('button', { name: '변경사항 저장', exact: true }).click()
  await adminPage.getByText('현재 저장된 상태입니다.', { exact: true }).waitFor()
  assert.equal(adminUpdates.length, 1)
  assert.equal(adminUpdates[0].status, 'reviewing')
  assert.equal(adminUpdates[0].admin_note, '제품 성분표 확인 예정')
  await adminPage.locator('.admin-actions').getByRole('button', { name: '닫기', exact: true }).click()
  await adminPage.getByRole('dialog').waitFor({ state: 'detached' })
  await adminPage.getByText('검토중', { exact: true }).last().waitFor()
  await adminPage.getByRole('button', { name: '보기', exact: true }).click()
  await adminPage.getByRole('dialog').waitFor()
  assert.equal(await adminPage.locator('.admin-partnership-operations textarea').inputValue(), '제품 성분표 확인 예정')
  await adminContext.close()

  console.log(JSON.stringify({
    inquiryId: payload.id,
    insertStatus: insertResponse.status(),
    successVisible: true,
    emailRequestCount: emailRequests.length,
    emailConsoleErrors,
    adminUi: {
      source: 'authenticated Supabase response fixture',
      newBadgeVisible: true,
      updatedStatus: adminUpdates[0].status,
      notePersistedAfterReopen: true,
    },
  }))
} finally {
  await browser.close()
}
