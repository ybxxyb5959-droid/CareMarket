import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const headerSource = readFileSync(new URL('../src/components/Header.jsx', import.meta.url), 'utf8')
const storeSource = readFileSync(new URL('../src/StoreProvider.jsx', import.meta.url), 'utf8')
const navigationSource = readFileSync(new URL('../src/lib/navigation.js', import.meta.url), 'utf8')
const appSource = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
const adminPageSources = ['AdminDashboard', 'AdminProducts', 'AdminOrders', 'AdminPartnerships', 'AdminInquiries']
  .map((page) => readFileSync(new URL(`../src/pages/${page}.jsx`, import.meta.url), 'utf8'))

test('store header exposes the admin switch only for an authenticated admin', () => {
  assert.match(headerSource, /isLoggedIn[\s\S]*?isAdmin\s*&&[\s\S]*?className="header-admin-btn"/)
  assert.match(headerSource, /className="header-admin-btn"[\s\S]*?navigate\('adminDashboard'\)/)
  assert.match(headerSource, /관리자 화면으로 전환/)
})

test('admin routes remain available', () => {
  assert.match(navigationSource, /adminProducts:\s*'\/admin\/products'/)
  assert.match(navigationSource, /adminDashboard:\s*'\/admin'/)
  assert.match(navigationSource, /adminOrders:\s*'\/admin\/orders'/)
  assert.match(navigationSource, /adminPartnerships:\s*'\/admin\/partnerships'/)
  assert.match(navigationSource, /adminInquiries:\s*'\/admin\/inquiries'/)
  assert.match(appSource, /adminProducts:\s*AdminProducts/)
  assert.match(appSource, /adminDashboard:\s*AdminDashboard/)
  assert.match(appSource, /adminOrders:\s*AdminOrders/)
  assert.match(appSource, /adminPartnerships:\s*AdminPartnerships/)
  assert.match(appSource, /adminInquiries:\s*AdminInquiries/)
})

test('admin role loading is independent from optional profile contact columns', () => {
  assert.match(storeSource, /\.select\('display_name, primary_goal, role'\)/)
  assert.match(storeSource, /\.select\('phone, postal_code, address, address_detail'\)/)
  assert.doesNotMatch(
    storeSource,
    /\.select\('display_name, primary_goal, role, phone, postal_code, address, address_detail'\)/,
  )
})

test('automatic admin entry updates the browser URL as well as the rendered view', () => {
  assert.match(storeSource, /history\.replaceState\([\s\S]*?adminUrl\)/)
  assert.match(storeSource, /setView\(adminView\)/)
})

test('same-user auth refresh does not leave profile loading stuck; account changes still load', () => {
  const body = storeSource.match(/const syncAuthSession = useCallback\(\(session\) => \{([\s\S]*?)\n  \}, \[cartController\]\)/)[1]
  let owner = 'member-a'
  const calls = []
  const scope = {
    loggingOut: { current: false },
    cartController: { getOwner: () => owner, setOwner: id => { owner = id } },
    wishlistPending: { current: new Set() },
    EMPTY_PROFILE: {}, DEFAULT_GOAL: '', DEFAULT_SUB_FILTERS: [],
    toAppUser: user => ({ name: user.id }),
  }
  for (const [, setter] of body.matchAll(/\b(set\w+)\(/g)) scope[setter] = value => calls.push([setter, value])
  const sync = new Function(...Object.keys(scope), `return (session) => {${body}}`)(...Object.values(scope))
  sync({ user: { id: 'member-a' } })
  assert.equal(calls.some(([name]) => name === 'setProfileLoading'), false)
  sync({ user: { id: 'member-b' } })
  assert.ok(calls.some(([name, value]) => name === 'setProfileLoading' && value === true))
  sync(null)
  assert.ok(calls.some(([name, value]) => name === 'setProfileLoading' && value === false))
})

test('partnership and inquiry administration use the existing role guard in navigation', () => {
  assert.match(storeSource, /\['adminHistory', 'adminProducts', 'adminOrders', 'adminPartnerships', 'adminInquiries'\]\.includes\(v\)/)
})

test('admin page headers use concise operational subtitles without the duplicated eyebrow', () => {
  assert.ok(adminPageSources.every((source) => !source.includes('ADMIN CONSOLE')))
  assert.match(adminPageSources[0], /<h1>관리자 대시보드<\/h1>[\s\S]*?<p>오늘의 운영 현황<\/p>/)
  assert.match(adminPageSources[1], /<h1>상품 관리<\/h1>[\s\S]*?<p>상품 정보 · 가격 · 재고<\/p>/)
  assert.match(adminPageSources[2], /<h1>주문 · 출고 관리<\/h1>[\s\S]*?<p>결제 이후 주문 처리 현황<\/p>/)
  assert.match(adminPageSources[3], /<h1>협업 제안<\/h1>[\s\S]*?<p>브랜드 입점 및 제휴 요청<\/p>/)
  assert.match(adminPageSources[4], /<h1>1:1 문의 관리<\/h1>[\s\S]*?<p>고객 문의 및 답변<\/p>/)
})
