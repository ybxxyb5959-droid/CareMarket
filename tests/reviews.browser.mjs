import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true })
const origin = process.env.CAREMARKET_TEST_ORIGIN || 'http://127.0.0.1:5176'
const userId = '00000000-0000-4000-8000-000000000901'
const orderId = '00000000-0000-4000-8000-000000000902'
const item1 = '00000000-0000-4000-8000-000000000903'
const item2 = '00000000-0000-4000-8000-000000000904'
const reviewId = '00000000-0000-4000-8000-000000000905'
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url')
const session = {
  access_token: `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ sub: userId, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.fixture`,
  refresh_token: 'review-fixture-refresh',
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  expires_in: 3600,
  token_type: 'bearer',
  user: { id: userId, aud: 'authenticated', role: 'authenticated', email: 'review@example.test' },
}
const product = {
  product_id: 1, name: '모바일 리뷰 검증 상품', brand: 'CareMarket', category: '건강 간식',
  price: 30000, original_price: 30000, stock: 10, summary: '리뷰 UI 검증 상품',
  serving_size: '1개', calories: 100, protein: 10, carbs: 10, fat: 2,
  sugar: 2, sodium: 20, allergens: [], contains_caffeine: false,
  main_ingredients: ['검증 원료'], is_active: true, image_url: '',
}
const reviewItems = [
  {
    order_id: orderId, order_item_id: item1, product_id: 1, quantity: 1,
    order_status: 'delivered', order_created_at: '2026-09-06T00:00:00Z',
    product_name: product.name, image_url: '', option_label: null,
    review_id: reviewId, reviewed: true, review_rating: 2,
    review_content: '기존 리뷰 본문이 수정 화면에 그대로 표시되는지 확인합니다.',
    review_created_at: '2026-09-06T01:00:00Z', review_updated_at: '2026-09-06T02:00:00Z',
    review_deleted_at: null, review_hidden: false, reward_issued: true,
    reward_coupon_name: '구매후기 감사 10%', reward_coupon_percent: 10,
  },
  {
    order_id: orderId, order_item_id: item2, product_id: 1, quantity: 2,
    order_status: 'delivered', order_created_at: '2026-09-06T00:00:00Z',
    product_name: product.name, image_url: '', option_label: null,
    review_id: null, reviewed: false, review_rating: null, review_content: null,
    review_deleted_at: null, review_hidden: false, reward_issued: true,
    reward_coupon_name: '구매후기 감사 10%', reward_coupon_percent: 10,
  },
]
const publicReviews = {
  count: 2, average: 3.5,
  reviews: [
    { id: reviewId, rating: 2, content: reviewItems[0].review_content, created_at: '2026-09-06T01:00:00Z', updated_at: '2026-09-06T02:00:00Z', is_mine: true, author_name: '리**', verified_purchase: true },
    { id: '00000000-0000-4000-8000-000000000906', rating: 5, content: '다른 구매자의 실제 구매후기입니다.', created_at: '2026-09-07T01:00:00Z', updated_at: '2026-09-07T01:00:00Z', is_mine: false, author_name: '다**', verified_purchase: true },
  ],
}

async function fitsViewport(page, selector) {
  const box = await page.locator(selector).boundingBox()
  assert.ok(box)
  assert.ok(box.x >= -1 && box.x + box.width <= 391, `${selector} exceeds 390px viewport`)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true)
}

try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await context.addInitScript(({ stored }) => {
    localStorage.setItem('cm_welcome_hide_date', new Date().toISOString().slice(0, 10))
    localStorage.setItem('sb-owxgtzepynkwdixmwhim-auth-token', JSON.stringify(stored))
  }, { stored: session })
  await context.route('**/auth/v1/user', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(session.user) }))
  await context.route('**/rest/v1/**', async route => {
    const url = new URL(route.request().url())
    const resource = url.pathname.split('/').pop()
    const objectHeaders = { 'Content-Type': 'application/json', 'Content-Range': '0-0/1' }
    if (resource === 'get_my_review_items') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(reviewItems) })
    if (resource === 'get_public_product_reviews') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(publicReviews) })
    if (resource === 'profiles') {
      const select = url.searchParams.get('select') || ''
      const body = select.includes('role')
        ? { display_name: '리뷰 회원', primary_goal: 'nutrition_management', role: 'user' }
        : { phone: null, postal_code: null, address: null, address_detail: null }
      return route.fulfill({ status: 200, headers: objectHeaders, body: JSON.stringify(body) })
    }
    if (resource === 'user_preferences') return route.fulfill({ status: 200, headers: objectHeaders, body: JSON.stringify({ low_sugar: false, low_sodium: false, high_protein: false, exclude_caffeine: false, excluded_allergens: [] }) })
    if (resource === 'products') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([product]) })
    if (resource === 'orders') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{
      order_id: orderId, toss_order_id: 'cm_review_fixture', total_price: 60000,
      status: 'delivered', created_at: '2026-09-06T00:00:00Z',
      recipient_name: '리뷰 회원', recipient_phone: '010-1234-5678', postal_code: '12345',
      address: '서울시 검증 주소', address_detail: '', delivery_request: '',
      items: [
        { order_item_id: item1, product_id: 1, quantity: 1, price_at_order: 30000, product: { name: product.name, image_url: '' } },
        { order_item_id: item2, product_id: 1, quantity: 2, price_at_order: 30000, product: { name: product.name, image_url: '' } },
      ],
    }]) })
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })

  const page = await context.newPage()
  page.setDefaultTimeout(10000)
  const errors = []
  page.on('pageerror', error => errors.push(error.message))

  await page.goto(`${origin}/products/1`)
  await page.getByText('내가 작성한 후기', { exact: true }).waitFor()
  assert.equal(await page.locator('.actual-review-row').first().getByText('내가 작성한 후기', { exact: true }).count(), 1)
  await page.getByRole('button', { name: '수정', exact: true }).click()
  await page.getByRole('heading', { name: '리뷰 수정', exact: true }).waitFor()
  assert.equal(await page.locator('.review-dialog textarea').inputValue(), reviewItems[0].review_content)
  assert.equal(await page.locator('[data-rating="2"]').getAttribute('aria-checked'), 'true')
  await fitsViewport(page, '.review-dialog')
  await page.getByRole('button', { name: '리뷰 수정 닫기' }).click()

  await page.getByRole('button', { name: '삭제', exact: true }).click()
  await page.getByRole('heading', { name: '작성한 리뷰를 삭제하시겠습니까?', exact: true }).waitFor()
  await page.getByText('삭제한 리뷰는 상품 후기에서 더 이상 표시되지 않습니다.', { exact: true }).waitFor()
  await fitsViewport(page, '.review-delete-dialog')
  await page.getByRole('button', { name: '취소', exact: true }).click()
  assert.equal(await page.getByRole('heading', { name: '샘플 후기', exact: true }).count(), 0)
  assert.ok(await page.locator('#review-list .review-row').count() >= 5)

  await page.goto(`${origin}/orders`)
  await page.getByText('작성 완료', { exact: true }).waitFor()
  await page.locator('.order-product-name-link').first().click()
  await page.waitForURL('**/products/1')
  await page.goto(`${origin}/orders`)
  await page.getByText('작성 완료', { exact: true }).waitFor()
  await page.getByText('영수증', { exact: true }).click()
  await page.getByText('상품금액', { exact: true }).waitFor()
  await page.getByText('쿠폰할인', { exact: true }).waitFor()
  await page.getByText('배송지', { exact: true }).waitFor()
  await fitsViewport(page, '.order-card')
  await page.getByRole('button', { name: '리뷰 작성', exact: true }).click()
  await page.getByRole('heading', { name: '구매후기 작성', exact: true }).waitFor()
  await page.locator('[data-rating="5"]').click()
  await page.locator('.review-dialog textarea').fill('모바일 작성 중 닫기 확인을 검증하기 위한 충분히 긴 리뷰 본문입니다.')
  let confirmMessage = ''
  page.once('dialog', async dialog => {
    confirmMessage = dialog.message()
    await dialog.dismiss()
  })
  await page.getByRole('button', { name: '리뷰 작성 닫기' }).click()
  assert.match(confirmMessage, /작성 중인 내용이 있습니다/)
  await page.getByRole('heading', { name: '구매후기 작성', exact: true }).waitFor()
  await fitsViewport(page, '.review-dialog')

  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ viewport: 390, myReviewFirst: true, editPrefill: true, deleteConfirm: true, createModal: true, draftCloseConfirm: true, noOverflow: true }))
  await context.close()
} finally {
  await browser.close()
}
