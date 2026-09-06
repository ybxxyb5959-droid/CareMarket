import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const myPageSource = readFileSync(new URL('../src/pages/MyPage.jsx', import.meta.url), 'utf8')
const quickPanelSource = readFileSync(new URL('../src/components/WishlistQuickPanel.jsx', import.meta.url), 'utf8')
const headerSource = readFileSync(new URL('../src/components/Header.jsx', import.meta.url), 'utf8')
const navigationSource = readFileSync(new URL('../src/lib/navigation.js', import.meta.url), 'utf8')

test('mypage uses a conditional compact wishlist summary instead of full product cards', () => {
  assert.match(myPageSource, /<WishlistQuickPanel\s*\/>/)
  assert.doesNotMatch(myPageSource, /mypage-wishlist-title/)
  assert.doesNotMatch(myPageSource, /mypage-wishlist-grid|<ProductCard/)
  assert.match(quickPanelSource, /if \(!wishlist\.length \|\| !wishedProducts\.length\) return null/)
  assert.match(quickPanelSource, /slice\(0, MAX_PREVIEW_ITEMS\)/)
  assert.match(quickPanelSource, /addToCart\(product, 1\)/)
  assert.doesNotMatch(quickPanelSource, />전체보기\s*</)
  assert.match(quickPanelSource, /'찜한 상품 전체보기'/)
})

test('mypage sections follow the requested order', () => {
  const sectionOrder = [
    'mypage-orders-title',
    'mypage-profile-title',
    'mypage-goal-title',
    'mypage-inquiries-title',
  ]
  const positions = sectionOrder.map((id) => myPageSource.indexOf(`aria-labelledby="${id}"`))
  assert.ok(positions.every((position) => position >= 0))
  assert.deepEqual([...positions].sort((a, b) => a - b), positions)
})

test('header heart opens the dedicated wishlist route', () => {
  assert.match(headerSource, /onClick=\{\(\) => navigate\('wishlist'\)\}/)
  assert.match(navigationSource, /wishlist: '\/wishlist'/)
})
