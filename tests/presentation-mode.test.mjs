import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { parseAppLocation, viewUrl } from '../src/lib/navigation.js'
import { isPresentationViewAllowed, MIDTERM_ALLOWED_VIEWS } from '../src/lib/presentation.js'

const location = (pathname, search = '') => ({ pathname, search })

test('midterm presentation keeps only milestone routes available', () => {
  const expected = ['main', 'products', 'detail', 'goalSetup', 'cart', 'mypage', 'login', 'register', 'notFound']
  assert.deepEqual([...MIDTERM_ALLOWED_VIEWS], expected)
  for (const view of expected) assert.equal(isPresentationViewAllowed(view, 'midterm'), true)

  for (const view of ['checkout', 'paymentSuccess', 'paymentFail', 'orders', 'wishlist', 'deals', 'adminDashboard', 'adminProducts', 'adminOrders', 'adminReviews', 'adminPartnerships', 'adminInquiries']) {
    assert.equal(isPresentationViewAllowed(view, 'midterm'), false, view)
  }
})

test('midterm direct URLs cannot mount future feature pages', () => {
  for (const path of ['/checkout', '/orders', '/payment/success', '/payment/fail', '/wishlist', '/deals', '/admin', '/admin/products', '/admin/orders', '/admin/reviews', '/support/inquiry', '/partners/proposal']) {
    assert.equal(parseAppLocation(location(path), 'midterm').view, 'notFound', path)
  }
  assert.equal(parseAppLocation(location('/'), 'midterm').view, 'main')
  assert.equal(parseAppLocation(location('/products'), 'midterm').view, 'products')
  assert.equal(parseAppLocation(location('/search', '?q=저당'), 'midterm').view, 'products')
  assert.equal(parseAppLocation(location('/products/42'), 'midterm').view, 'detail')
  assert.equal(parseAppLocation(location('/goals'), 'midterm').view, 'goalSetup')
  assert.equal(parseAppLocation(location('/cart'), 'midterm').view, 'cart')
  assert.equal(parseAppLocation(location('/mypage'), 'midterm').view, 'mypage')
})

test('midterm navigation resolves blocked views to the safe home URL', () => {
  assert.equal(viewUrl('products', 'midterm'), '/products')
  assert.equal(viewUrl('cart', 'midterm'), '/cart')
  assert.equal(viewUrl('checkout', 'midterm'), '/')
  assert.equal(viewUrl('orders', 'midterm'), '/')
  assert.equal(viewUrl('adminProducts', 'midterm'), '/')
})

test('midterm action guards protect production-side writes', () => {
  const storeSource = readFileSync(new URL('../src/StoreProvider.jsx', import.meta.url), 'utf8')
  assert.match(storeSource, /const isAdminUser = !IS_MIDTERM_PRESENTATION &&/)
  assert.match(storeSource, /if \(!isPresentationViewAllowed\(v\)\)/)
  assert.match(storeSource, /const toggleWish = async \(id\) => \{\s+if \(IS_MIDTERM_PRESENTATION\) return false/)
  assert.match(storeSource, /const checkout = \(\) => \{\s+if \(IS_MIDTERM_PRESENTATION\)/)
  assert.match(storeSource, /if \(IS_MIDTERM_PRESENTATION \|\| !authUserId\)/)
})

test('midterm cart reuses AI analysis while checkout actions stay blocked', () => {
  const cartSource = readFileSync(new URL('../src/pages/Cart.jsx', import.meta.url), 'utf8')
  const drawerSource = readFileSync(new URL('../src/components/CartDrawer.jsx', import.meta.url), 'utf8')
  assert.match(cartSource, /<CartAiInsight cartOverride=\{displayCart\} \/>/)
  assert.match(drawerSource, /<CartAiInsight compact \/>/)
  assert.doesNotMatch(drawerSource, /!IS_MIDTERM_PRESENTATION && <CartAiInsight/)
  assert.match(cartSource, /!IS_MIDTERM_PRESENTATION && <div className="cart-mobile-checkout"/)
  assert.match(drawerSource, /!IS_MIDTERM_PRESENTATION && <button className="btn btn-primary"[^\n]+onClick=\{checkout\}/)
})
