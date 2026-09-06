import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { parseAppLocation, viewUrl } from '../src/lib/navigation.js'

const vercelConfig = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
const checkoutSource = readFileSync(new URL('../src/pages/Checkout.jsx', import.meta.url), 'utf8')
const paymentSuccessSource = readFileSync(new URL('../src/pages/PaymentSuccess.jsx', import.meta.url), 'utf8')
const paymentFailSource = readFileSync(new URL('../src/pages/PaymentFail.jsx', import.meta.url), 'utf8')

const directRoutes = {
  '/': 'main',
  '/products': 'products',
  '/search': 'products',
  '/cart': 'cart',
  '/checkout': 'checkout',
  '/orders': 'orders',
  '/mypage': 'mypage',
  '/admin/products': 'adminProducts',
  '/admin/orders': 'adminOrders',
  '/admin/partnerships': 'adminPartnerships',
  '/about': 'about',
  '/principles': 'principles',
  '/partners': 'partners',
  '/partners/proposal': 'partnerProposal',
  '/payment/success': 'paymentSuccess',
  '/payment/fail': 'paymentFail',
}

test('Vercel uses the official minimal Vite SPA fallback', () => {
  assert.deepEqual(vercelConfig.rewrites, [{ source: '/(.*)', destination: '/index.html' }])
  assert.equal(vercelConfig.$schema, 'https://openapi.vercel.sh/vercel.json')
  assert.equal(vercelConfig.redirects, undefined)
  assert.equal(vercelConfig.routes, undefined)
})

test('every current direct route is resolved by the existing History API parser', () => {
  for (const [pathname, view] of Object.entries(directRoutes)) {
    assert.equal(parseAppLocation({ pathname, search: '' }).view, view, pathname)
  }
  assert.deepEqual(parseAppLocation({ pathname: '/products/42', search: '' }), { view: 'detail', productId: 42 })
})

test('internal navigation continues to emit the same application paths', () => {
  for (const [pathname, view] of Object.entries(directRoutes)) {
    if (pathname === '/search') continue
    assert.equal(viewUrl(view), pathname, view)
  }
})

test('Toss callbacks use the active deployment origin without localhost hardcoding', () => {
  assert.match(checkoutSource, /successUrl:\s*`\$\{window\.location\.origin\}\/payment\/success`/)
  assert.match(checkoutSource, /failUrl:\s*`\$\{window\.location\.origin\}\/payment\/fail`/)
  assert.doesNotMatch(checkoutSource, /successUrl:[^\n]*(localhost|127\.0\.0\.1)/i)
  assert.doesNotMatch(checkoutSource, /failUrl:[^\n]*(localhost|127\.0\.0\.1)/i)
})

test('success callback still reads Toss query parameters and fail UX remains unchanged', () => {
  assert.match(paymentSuccessSource, /new URLSearchParams\(window\.location\.search\)/)
  for (const parameter of ['paymentKey', 'orderId', 'amount']) {
    assert.match(paymentSuccessSource, new RegExp(`params\\.get\\('${parameter}'\\)`))
  }
  assert.doesNotMatch(paymentFailSource, /URLSearchParams|window\.location\.search/)
})
