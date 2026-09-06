import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { parseAppLocation } from '../src/lib/navigation.js'

const readSource = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

test('unknown routes resolve to 404 while one-segment product resources resolve to detail', () => {
  assert.equal(parseAppLocation({ pathname: '/this-route-does-not-exist', search: '' }).view, 'notFound')
  assert.deepEqual(parseAppLocation({ pathname: '/products/999999999', search: '' }), { view: 'detail', productId: 999999999 })
  assert.deepEqual(parseAppLocation({ pathname: '/products/not-a-product', search: '' }), { view: 'detail', productId: 'not-a-product' })
})

test('trailing slashes share route parsing and keep callback query values available', () => {
  const search = '?paymentKey=key&orderId=order&amount=12000'
  assert.deepEqual(
    parseAppLocation({ pathname: '/search/', search: '?q=protein' }),
    parseAppLocation({ pathname: '/search', search: '?q=protein' }),
  )
  assert.equal(parseAppLocation({ pathname: '/products/', search: '' }).view, 'products')
  assert.equal(parseAppLocation({ pathname: '/payment/success/', search }).view, 'paymentSuccess')
  assert.equal(new URLSearchParams(search).get('paymentKey'), 'key')
})

test('customer exception states expose separate retryable error and successful empty copy', () => {
  const productDetail = readSource('../src/pages/ProductDetail.jsx')
  const catalog = readSource('../src/pages/AllProducts.jsx')
  const orders = readSource('../src/pages/Orders.jsx')
  const cart = readSource('../src/pages/Cart.jsx')
  const mypage = readSource('../src/pages/MyPage.jsx')

  assert.match(productDetail, /상품을 찾을 수 없습니다/)
  assert.match(productDetail, /onClick=\{reloadProducts\}/)
  assert.match(catalog, /productsError[\s\S]*reloadProducts/)
  assert.match(catalog, /aiProducts\.length === 0/)
  assert.match(orders, /주문 내역을 불러오지 못했어요[\s\S]*다시 시도/)
  assert.match(orders, /아직 주문 내역이 없어요/)
  assert.match(cart, /cartLoading \?[\s\S]*cartError \?[\s\S]*(?:cart|previewCart)\.length === 0/)
  assert.match(mypage, /recentOrdersState\.error[\s\S]*profileError/)
  assert.doesNotMatch(mypage, /mypage-wishlist-title/)
})

test('admin exception states hide raw errors and distinguish base empty from filtered empty', () => {
  const orders = readSource('../src/pages/AdminOrders.jsx')
  const partnerships = readSource('../src/pages/AdminPartnerships.jsx')

  assert.match(orders, /표시할 주문이 없습니다/)
  assert.match(orders, /현재 조건에 해당하는 주문이 없습니다/)
  assert.doesNotMatch(orders, /<p>\{error\}<\/p>/)
  assert.match(partnerships, /접수된 협업 제안이 없습니다/)
  assert.match(partnerships, /현재 조건에 해당하는 제안이 없습니다/)
  assert.doesNotMatch(partnerships, /<p>\{error\}<\/p>/)
})
