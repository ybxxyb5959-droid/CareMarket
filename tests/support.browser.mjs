import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true })
const origin = process.env.CAREMARKET_TEST_ORIGIN || 'http://127.0.0.1:5174'

const encodeJwtPart = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
const userId = '00000000-0000-4000-8000-000000000101'
const orderId = '00000000-0000-4000-8000-000000000202'
const session = {
  access_token: `${encodeJwtPart({ alg: 'none', typ: 'JWT' })}.${encodeJwtPart({ sub: userId, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.test-signature`,
  refresh_token: 'support-fixture-refresh-token',
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  expires_in: 3600,
  token_type: 'bearer',
  user: { id: userId, aud: 'authenticated', role: 'authenticated', email: 'support-customer@example.test' },
}

async function assertNoHorizontalOverflow(page, label, results) {
  const size = await page.evaluate(() => ({
    width: window.innerWidth,
    body: document.body.scrollWidth,
    root: document.documentElement.scrollWidth,
  }))
  assert.ok(size.body <= size.width + 1, `${label}: body ${size.body}px > viewport ${size.width}px`)
  assert.ok(size.root <= size.width + 1, `${label}: root ${size.root}px > viewport ${size.width}px`)
  results.push({ label, ...size })
}

try {
  const publicContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  await publicContext.addInitScript(() => localStorage.setItem('cm_welcome_hide_date', new Date().toISOString().slice(0, 10)))
  await publicContext.route('**/rest/v1/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  const publicPage = await publicContext.newPage()
  publicPage.setDefaultTimeout(10000)
  await publicPage.goto(`${origin}/support`)
  await publicPage.getByRole('heading', { name: '무엇을 도와드릴까요?' }).waitFor()
  assert.equal(await publicPage.locator('.support-accordion article').count(), 6)

  await publicPage.getByRole('button', { name: '배송', exact: true }).click()
  assert.equal(await publicPage.locator('.support-accordion article').count(), 3)
  await publicPage.getByRole('button', { name: /무료배송 기준은 무엇인가요/ }).click()
  await publicPage.getByText('현재 상품 합계 40,000원 이상 주문 시 무료배송이 적용돼요.').waitFor()

  const search = publicPage.getByPlaceholder('궁금한 내용을 검색해보세요.')
  await search.fill('의료 진단')
  assert.equal(await publicPage.locator('.support-accordion article').count(), 1)
  await publicPage.getByRole('button', { name: /AI 영양 밸런스는 의료 진단인가요/ }).click()
  await publicPage.getByText(/질병의 진단·치료/).waitFor()
  await search.fill('없는-질문-987654')
  await publicPage.getByRole('heading', { name: '검색 결과가 없어요.' }).waitFor()

  const viewportResults = []
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 768, height: 900 }, { width: 390, height: 844 }]) {
    await publicPage.setViewportSize(viewport)
    await publicPage.goto(`${origin}/support`)
    await publicPage.getByRole('heading', { name: '무엇을 도와드릴까요?' }).waitFor()
    const inquiryEntry = publicPage.getByRole('button', { name: '1:1 문의하기', exact: true })
    const historyEntry = publicPage.getByRole('button', { name: '내 문의 내역', exact: true })
    await inquiryEntry.waitFor()
    await historyEntry.waitFor()
    if (viewport.width === 390) {
      const ctaBoxes = await Promise.all([inquiryEntry.boundingBox(), historyEntry.boundingBox()])
      assert.ok(ctaBoxes[0] && ctaBoxes[1] && ctaBoxes[1].y >= ctaBoxes[0].y + ctaBoxes[0].height, 'support CTAs should stack on mobile')
    }
    await assertNoHorizontalOverflow(publicPage, `support-${viewport.width}`, viewportResults)
  }
  await publicPage.goto(`${origin}/support/inquiry`)
  await publicPage.getByRole('heading', { name: '1:1 문의는 로그인 후 이용할 수 있어요.' }).waitFor()
  await assertNoHorizontalOverflow(publicPage, 'inquiry-login-390', viewportResults)
  await publicContext.close()

  const authContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await authContext.addInitScript(({ storedSession }) => {
    localStorage.setItem('cm_welcome_hide_date', new Date().toISOString().slice(0, 10))
    localStorage.setItem('sb-owxgtzepynkwdixmwhim-auth-token', JSON.stringify(storedSession))
  }, { storedSession: session })

  let failInquiryInsert = true
  let insertCount = 0
  let submittedPayload = null
  await authContext.route('**/rest/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const table = url.pathname.split('/').pop()
    const objectHeaders = { 'Content-Type': 'application/json', 'Content-Range': '0-0/1' }

    if (table === 'profiles') {
      const select = url.searchParams.get('select') || ''
      const body = select.includes('role')
        ? { display_name: '문의 테스트 회원', primary_goal: 'nutrition_management', role: 'user' }
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
    if (table === 'orders') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{
        order_id: orderId,
        toss_order_id: 'cm_support_fixture',
        total_price: 43000,
        status: 'preparing',
        created_at: '2026-09-06T00:00:00.000Z',
        items: [],
      }]) })
      return
    }
    if (table === 'customer_inquiries' && request.method() === 'POST') {
      insertCount += 1
      submittedPayload = request.postDataJSON()
      await new Promise((resolve) => setTimeout(resolve, 120))
      if (failInquiryInsert) {
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'fixture failure' }) })
      } else {
        await route.fulfill({ status: 201, contentType: 'application/json', body: '' })
      }
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })

  const page = await authContext.newPage()
  page.setDefaultTimeout(10000)
  await page.goto(`${origin}/mypage`)
  await page.getByText('1:1 문의 내역', { exact: true }).waitFor()
  await assertNoHorizontalOverflow(page, 'mypage-390', viewportResults)
  await page.goto(`${origin}/support/inquiry`)
  await page.getByRole('heading', { name: '1:1 문의', exact: true }).waitFor()
  await page.getByRole('button', { name: '문의 접수하기' }).click()
  await page.getByText('문의 유형을 선택해 주세요.').waitFor()

  await page.locator('#inquiry-category').selectOption('배송')
  await page.locator('#inquiry-orderId').selectOption(orderId)
  await page.locator('#inquiry-title').fill('배송 상태를 확인하고 싶어요')
  await page.locator('#inquiry-content').fill('선택한 주문의 배송 상태를 확인해 주세요.')
  await page.locator('#inquiry-contactEmail').fill('wrong-email')
  await page.getByRole('button', { name: '문의 접수하기' }).click()
  await page.getByText('올바른 이메일 형식으로 입력해 주세요.').waitFor()

  await page.locator('#inquiry-contactEmail').fill('support-customer@example.test')
  await page.getByRole('button', { name: '문의 접수하기' }).click()
  await page.getByText('개인정보 수집 및 이용에 동의해 주세요.').waitFor()
  await page.locator('#inquiry-privacyAgreed').check()
  await assertNoHorizontalOverflow(page, 'inquiry-form-390', viewportResults)

  await page.getByRole('button', { name: '문의 접수하기' }).click()
  await page.getByText(/문의를 접수하지 못했어요/).waitFor()
  assert.equal(insertCount, 1)
  assert.equal(await page.locator('#inquiry-title').inputValue(), '배송 상태를 확인하고 싶어요')
  assert.equal(await page.locator('#inquiry-content').inputValue(), '선택한 주문의 배송 상태를 확인해 주세요.')

  failInquiryInsert = false
  await page.locator('.support-submit-error button').evaluate((button) => {
    button.click()
    button.click()
  })
  await page.getByRole('heading', { name: '문의가 접수되었습니다.' }).waitFor()
  assert.equal(insertCount, 2)
  assert.equal(submittedPayload.user_id, userId)
  assert.equal(submittedPayload.order_id, orderId)
  assert.equal(submittedPayload.status, undefined)
  assert.equal(submittedPayload.admin_note, undefined)
  await assertNoHorizontalOverflow(page, 'inquiry-success-390', viewportResults)
  await authContext.close()

  console.log(JSON.stringify({
    faq: { initial: 6, category: 3, searchSuccess: true, searchEmpty: true, accordion: true },
    inquiry: { validation: true, failedValuesRetained: true, insertCount, duplicateBlocked: true, success: true },
    viewportResults,
  }))
} finally {
  await browser.close()
}
