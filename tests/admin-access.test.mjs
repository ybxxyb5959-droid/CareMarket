import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const headerSource = readFileSync(new URL('../src/components/Header.jsx', import.meta.url), 'utf8')
const storeSource = readFileSync(new URL('../src/StoreProvider.jsx', import.meta.url), 'utf8')
const navigationSource = readFileSync(new URL('../src/lib/navigation.js', import.meta.url), 'utf8')
const appSource = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')

test('store header exposes the admin switch only for an authenticated admin', () => {
  assert.match(headerSource, /isLoggedIn[\s\S]*?isAdmin\s*&&[\s\S]*?className="header-admin-btn"/)
  assert.match(headerSource, /className="header-admin-btn"[\s\S]*?navigate\('adminProducts'\)/)
  assert.match(headerSource, /관리자 화면으로 전환/)
})

test('admin routes remain available', () => {
  assert.match(navigationSource, /adminProducts:\s*'\/admin\/products'/)
  assert.match(navigationSource, /adminOrders:\s*'\/admin\/orders'/)
  assert.match(navigationSource, /adminPartnerships:\s*'\/admin\/partnerships'/)
  assert.match(appSource, /adminProducts:\s*AdminProducts/)
  assert.match(appSource, /adminOrders:\s*AdminOrders/)
  assert.match(appSource, /adminPartnerships:\s*AdminPartnerships/)
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

test('partnership administration uses the existing role guard in navigation', () => {
  assert.match(storeSource, /\['adminProducts', 'adminOrders', 'adminPartnerships'\]\.includes\(v\)/)
})
