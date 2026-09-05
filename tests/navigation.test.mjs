import test from 'node:test'
import assert from 'node:assert/strict'
import { catalogUrl, parseAppLocation, productUrl, viewUrl } from '../src/lib/navigation.js'

test('parses direct product URLs for refresh restoration', () => {
  assert.deepEqual(parseAppLocation({ pathname: '/products/42', search: '' }), { view: 'detail', productId: 42 })
})

test('search and catalog filters round-trip through a shareable URL', () => {
  const url = catalogUrl({
    search: '프로틴 바', searchMode: 'normal', aiQuery: '',
    shopCategory: '프로틴', shopSub: '프로틴 바·스낵', dealsOnly: false, sortBy: 'low',
  })
  const parsed = parseAppLocation(new URL(url, 'https://caremarket.example'))
  assert.equal(url, '/search?q=%ED%94%84%EB%A1%9C%ED%8B%B4+%EB%B0%94&category=%ED%94%84%EB%A1%9C%ED%8B%B4&sub=%ED%94%84%EB%A1%9C%ED%8B%B4+%EB%B0%94%C2%B7%EC%8A%A4%EB%82%B5&sort=low')
  assert.equal(parsed.view, 'products')
  assert.equal(parsed.search, '프로틴 바')
  assert.equal(parsed.shopCategory, '프로틴')
  assert.equal(parsed.shopSub, '프로틴 바·스낵')
  assert.equal(parsed.sortBy, 'low')
})

test('protein bar category navigation produces a clean catalog state', () => {
  const url = catalogUrl({
    search: '', searchMode: 'normal', aiQuery: '',
    shopCategory: '프로틴', shopSub: '프로틴 바·스낵', dealsOnly: false, sortBy: 'recommend',
  })
  const parsed = parseAppLocation(new URL(url, 'https://caremarket.example'))

  assert.equal(url, '/products?category=%ED%94%84%EB%A1%9C%ED%8B%B4&sub=%ED%94%84%EB%A1%9C%ED%8B%B4+%EB%B0%94%C2%B7%EC%8A%A4%EB%82%B5')
  assert.equal(parsed.search, '')
  assert.equal(parsed.searchMode, 'normal')
  assert.equal(parsed.aiQuery, '')
  assert.equal(parsed.shopCategory, '프로틴')
  assert.equal(parsed.shopSub, '프로틴 바·스낵')
})

test('AI search, page and product paths are canonical', () => {
  assert.equal(catalogUrl({ search: '', searchMode: 'ai', aiQuery: '저당 음료', shopCategory: '전체상품', shopSub: '전체', dealsOnly: false, sortBy: 'recommend' }), '/search?q=%EC%A0%80%EB%8B%B9+%EC%9D%8C%EB%A3%8C&mode=ai')
  assert.equal(productUrl(7), '/products/7')
  assert.equal(productUrl('bad'), '/products')
  assert.equal(viewUrl('cart'), '/cart')
  assert.equal(viewUrl('about'), '/about')
  assert.equal(viewUrl('principles'), '/principles')
  assert.equal(viewUrl('partners'), '/partners')
  assert.equal(viewUrl('partnerProposal'), '/partners/proposal')
  assert.equal(parseAppLocation({ pathname: '/partners/proposal', search: '' }).view, 'partnerProposal')
  assert.equal(viewUrl('adminPartnerships'), '/admin/partnerships')
  assert.equal(parseAppLocation({ pathname: '/principles', search: '' }).view, 'principles')
  assert.equal(viewUrl('unknown'), '/')
})
