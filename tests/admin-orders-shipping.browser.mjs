import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true })
const origin = process.env.CAREMARKET_TEST_ORIGIN || 'http://127.0.0.1:5174'

const encodeJwtPart = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
const makeSession = (userId, email) => ({
  access_token: `${encodeJwtPart({ alg: 'none', typ: 'JWT' })}.${encodeJwtPart({
    sub: userId,
    role: 'authenticated',
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 3600,
  })}.test-signature`,
  refresh_token: 'browser-fixture-refresh-token',
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  expires_in: 3600,
  token_type: 'bearer',
  user: { id: userId, aud: 'authenticated', role: 'authenticated', email },
})

async function installSession(context, session) {
  await context.addInitScript(({ storedSession }) => {
    localStorage.setItem('cm_welcome_hide_date', new Date().toISOString().slice(0, 10))
    localStorage.setItem('sb-owxgtzepynkwdixmwhim-auth-token', JSON.stringify(storedSession))
  }, { storedSession: session })
}

async function mockCommonReads(context, { role, orders = [], onStatusUpdate, onOrdersRead }) {
  await context.route('**/rest/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const resource = url.pathname.split('/').pop()
    const select = url.searchParams.get('select') || ''
    const objectHeaders = { 'Content-Type': 'application/json', 'Content-Range': '0-0/1' }

    if (resource === 'profiles') {
      if (select.includes('role')) {
        await route.fulfill({ status: 200, headers: objectHeaders, body: JSON.stringify({ display_name: role === 'admin' ? 'CareMarket 관리자' : '일반 회원', primary_goal: 'muscle_gain', role }) })
      } else if (select.includes('user_id')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ user_id: orders[0]?.user_id, display_name: '박용빈' }]) })
      } else {
        await route.fulfill({ status: 200, headers: objectHeaders, body: JSON.stringify({ phone: null, postal_code: null, address: null, address_detail: null }) })
      }
      return
    }
    if (resource === 'user_preferences') {
      await route.fulfill({ status: 200, headers: objectHeaders, body: JSON.stringify({ low_sugar: false, low_sodium: false, high_protein: false, exclude_caffeine: false, excluded_allergens: [] }) })
      return
    }
    if (resource === 'orders') {
      onOrdersRead?.()
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(orders) })
      return
    }
    if (resource === 'admin_update_order_status') {
      onStatusUpdate?.(request.postDataJSON())
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify('shipped') })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
}

try {
  const adminUserId = '00000000-0000-4000-8000-000000000001'
  const longAddress = `서울특별시 강남구 테헤란로 ${'가'.repeat(180)}`
  const longRequest = `문 앞에 놓아주세요. ${'나'.repeat(170)}`
  const orders = [
    {
      order_id: '10000000-0000-4000-8000-000000000001',
      user_id: adminUserId,
      toss_order_id: 'CM-20260906-001',
      total_price: 43000,
      status: 'preparing',
      created_at: '2026-09-06T00:30:00.000Z',
      recipient_name: '박용빈',
      recipient_phone: '010-0000-0000',
      postal_code: '06236',
      address: longAddress,
      address_detail: '케어아파트 101동 101호',
      delivery_request: longRequest,
      order_items: [{ product_id: 1, quantity: 2, price_at_order: 20000, products: { name: '주문 당시 상품', brand: 'CareMarket' } }],
    },
    {
      order_id: '10000000-0000-4000-8000-000000000002',
      user_id: adminUserId,
      toss_order_id: 'CM-LEGACY-001',
      total_price: 13000,
      status: 'delivered',
      created_at: '2026-09-05T00:30:00.000Z',
      recipient_name: null,
      recipient_phone: null,
      postal_code: null,
      address: null,
      address_detail: null,
      delivery_request: null,
      order_items: [{ product_id: 2, quantity: 1, price_at_order: 10000, products: { name: '이전 주문 상품', brand: 'CareMarket' } }],
    },
    {
      order_id: '10000000-0000-4000-8000-000000000003',
      user_id: adminUserId,
      toss_order_id: 'CM-PENDING-001',
      total_price: 16000,
      status: 'pending',
      created_at: '2026-09-06T00:35:00.000Z',
      recipient_name: '박용빈',
      order_items: [{ product_id: 3, quantity: 1, price_at_order: 13000, products: { name: '결제 미완료 상품', brand: 'CareMarket' } }],
    },
    {
      order_id: '10000000-0000-4000-8000-000000000004',
      user_id: adminUserId,
      toss_order_id: 'CM-PAID-001',
      total_price: 23000,
      status: 'paid',
      created_at: '2026-09-06T00:34:00.000Z',
      recipient_name: '박용빈',
      order_items: [{ product_id: 4, quantity: 1, price_at_order: 20000, products: { name: '결제 완료 상품', brand: 'CareMarket' } }],
    },
  ]

  const statusUpdates = []
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  await installSession(adminContext, makeSession(adminUserId, 'admin@example.test'))
  await mockCommonReads(adminContext, { role: 'admin', orders, onStatusUpdate: (payload) => statusUpdates.push(payload) })
  const page = await adminContext.newPage()
  page.setDefaultTimeout(10000)
  page.on('dialog', (dialog) => dialog.accept())
  await page.goto(`${origin}/admin/orders`)
  await page.getByRole('heading', { name: '주문 · 출고 관리', exact: true }).waitFor()
  await page.getByText('CM-20260906-001', { exact: true }).waitFor()
  assert.equal(await page.getByText('CM-PENDING-001', { exact: true }).count(), 0)
  assert.equal(await page.getByText('CM-PAID-001', { exact: true }).count(), 1)
  assert.equal(await page.locator('.admin-order-summary > div').filter({ hasText: '전체 주문' }).locator('dd').innerText(), '3건')

  await page.getByRole('button', { name: '결제 미완료', exact: true }).click()
  await page.getByText('CM-PENDING-001', { exact: true }).waitFor()
  assert.equal(await page.getByText('CM-20260906-001', { exact: true }).count(), 0)
  assert.equal(await page.getByText('CM-PAID-001', { exact: true }).count(), 0)
  await page.getByRole('button', { name: '출고 전체', exact: true }).click()
  await page.getByText('CM-20260906-001', { exact: true }).waitFor()
  assert.equal(await page.getByText('CM-PENDING-001', { exact: true }).count(), 0)


  for (const width of [320, 390, 596, 768]) {
    await page.setViewportSize({ width, height: 900 })
    const layout = await page.locator('.admin-orders-table').evaluate((table) => ({
      width: table.getBoundingClientRect().width,
      viewport: innerWidth,
      overflow: table.scrollWidth > table.clientWidth + 1,
      statuses: [...table.querySelectorAll('.status')].every((el) => el.scrollWidth <= el.clientWidth + 1),
      fieldsVisible: [...table.querySelectorAll('tbody tr:first-child td')].every((el) => getComputedStyle(el).display !== 'none'),
    }))
    assert.ok(layout.width <= layout.viewport)
    assert.equal(layout.overflow, false)
    assert.equal(layout.statuses, true)
    assert.equal(layout.fieldsVisible, true)
  }
  const selectAll = page.getByRole('checkbox', { name: '화면의 상품준비중 주문 전체선택' })
  await selectAll.check()
  assert.equal(await page.locator('.admin-bulk-bar b').innerText(), '1')
  await selectAll.uncheck()
  await page.getByRole('button', { name: '상세', exact: true }).first().click()
  const detail = page.getByRole('dialog')
  await detail.waitFor()
  await detail.getByText('박용빈', { exact: true }).last().waitFor()
  assert.equal(await detail.getByText('010-0000-0000', { exact: true }).count(), 1)
  assert.equal(await detail.getByText(longAddress, { exact: true }).count(), 1)
  assert.equal(await detail.getByText(longRequest, { exact: true }).count(), 1)
  assert.equal(await detail.getByText('주문 당시 단가 20,000원', { exact: true }).count(), 1)

  const viewportResults = []
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 768, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport)
    const layout = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]')
      const address = document.querySelector('.admin-shipping-detail dd')
      return {
        viewportWidth: window.innerWidth,
        pageOverflow: document.documentElement.scrollWidth > window.innerWidth,
        dialogOverflow: dialog.scrollWidth > dialog.clientWidth,
        addressWithinDialog: address.getBoundingClientRect().right <= dialog.getBoundingClientRect().right + 1,
      }
    })
    assert.equal(layout.pageOverflow, false)
    assert.equal(layout.dialogOverflow, false)
    assert.equal(layout.addressWithinDialog, true)
    viewportResults.push(layout)
  }

  await detail.getByRole('button', { name: '배송중 처리', exact: true }).click()
  await detail.getByRole('button', { name: '배송완료 처리', exact: true }).waitFor()
  assert.deepEqual(statusUpdates, [{ p_order_id: orders[0].order_id, p_new_status: 'shipped' }])
  await detail.locator('.admin-actions').getByRole('button', { name: '닫기', exact: true }).click()
  await detail.waitFor({ state: 'detached' })

  await page.getByRole('button', { name: '상세', exact: true }).nth(1).click()
  await page.getByRole('dialog').getByText('저장된 배송 정보가 없습니다.', { exact: true }).waitFor()
  await adminContext.close()

  let regularUserOrderReads = 0
  const userId = '00000000-0000-4000-8000-000000000002'
  const userContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await installSession(userContext, makeSession(userId, 'user@example.test'))
  await mockCommonReads(userContext, { role: 'user', onOrdersRead: () => { regularUserOrderReads += 1 } })
  const userPage = await userContext.newPage()
  await userPage.goto(`${origin}/admin/orders`)
  await userPage.getByRole('heading', { name: '관리자 권한이 필요한 페이지입니다.', exact: true }).waitFor()
  assert.equal(regularUserOrderReads, 0)
  await userContext.close()

  console.log(JSON.stringify({
    pendingSeparatedFromDefaultFulfillmentList: true,
    paidVisibleInDefaultFulfillmentList: true,
    fulfillmentTotalExcludesPending: true,
    shippingSnapshotVisible: true,
    missingSnapshotEmptyStateVisible: true,
    regularUserBlockedBeforeAdminOrderRead: true,
    statusTransitionPreserved: statusUpdates[0],
    viewportResults,
  }, null, 2))
} finally {
  await browser.close()
}
