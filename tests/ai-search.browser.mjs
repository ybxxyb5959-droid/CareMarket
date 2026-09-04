import assert from 'node:assert/strict'
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
import { createAiSearchHandler } from '../supabase/functions/ai-search/handler.js'
import { searchCases, geminiResponse } from './ai-search-cases.mjs'

// Run explicitly, not as a node:test file. Real public products GET; Gemini HTTP fixture only.
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true })
const origin = 'http://127.0.0.1:5173'
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  await context.addInitScript(() => localStorage.setItem('cm_welcome_hide_date', new Date().toISOString().slice(0, 10)))
  const page = await context.newPage()
  const runtimeErrors = [], results = [], seenQueries = [], dbProducts = [], forbidden = []
  page.on('pageerror', e => runtimeErrors.push(e.message))
  page.on('request', r => {
    if (r.url().includes('generativelanguage.googleapis.com')) forbidden.push(r.url())
    if (r.url().includes('/cart_items') && r.method() !== 'GET') forbidden.push(r.url())
  })
  page.on('response', async r => {
    if (new URL(r.url()).pathname === '/rest/v1/products' && r.ok()) dbProducts.splice(0, dbProducts.length, ...await r.json())
  })
  let failure = false, delay = 100
  await context.route('**/functions/v1/ai-search', async route => {
    const request = route.request(), body = request.postDataJSON()
    seenQueries.push(body.query)
    assert.deepEqual(Object.keys(body), ['query'])
    const entry = searchCases.find(c => c.query === body.query)
    const handler = createAiSearchHandler({ getApiKey: () => 'fixture-key-not-real', allowedOrigins: [origin], logger: { error() {} },
      fetchImpl: async () => {
        await new Promise(r => setTimeout(r, delay))
        if (failure) return new Response('private upstream error', { status: 503 })
        if (body.query === '0원 이하 상품') return Response.json(geminiResponse({ price_max: 0 }))
        assert.ok(entry, 'Unexpected parser test query')
        return Response.json(geminiResponse(entry.parsed))
      },
    })
    const response = await handler(new Request(request.url(), { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }))
    await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: await response.text() })
  })
  await page.goto(origin)
  await page.locator('.card-add').first().waitFor({ timeout: 60000 })
  assert.equal(dbProducts.length, 100)
  const names = new Set(dbProducts.map(p => p.name))
  await page.getByTitle('AI 자연어 검색으로 전환').click()
  const input = page.getByRole('textbox', { name: 'AI 자연어 검색' })
  for (const [i, entry] of searchCases.slice(0, 9).entries()) {
    await input.fill(entry.query)
    await input.press('Enter')
    await page.locator('.ai-result-summary .ai-query').waitFor()
    assert.equal(await page.locator('.ai-query').textContent(), `“${entry.query}”`)
    const shown = await page.locator('.product-grid .card-name').allTextContents()
    assert.ok(shown.every(name => names.has(name)))
    results.push({ case: i + 1, query: entry.query, count: shown.length })
    if (i === 6) assert.equal(await page.locator('.f-sort select').inputValue(), 'lowPrice')
  }
  await input.fill('')
  await input.press('Enter')
  await page.getByRole('alert').waitFor()
  assert.equal(await page.locator('.product-grid').count(), 0)
  // UI limits length; bypass only in this negative test to exercise client validation too.
  await input.evaluate(el => el.removeAttribute('maxlength'))
  await input.fill('가'.repeat(301))
  await input.press('Enter')
  await page.getByText('검색어는 250자 이내로 입력해 주세요.', { exact: true }).waitFor()
  await input.fill(searchCases[11].query)
  await input.press('Enter')
  await page.getByText('상품 검색 조건만 입력해 주세요.', { exact: true }).waitFor()
  assert.equal(seenQueries.length, 9, 'Invalid queries should not call Edge Function')
  await input.fill('0원 이하 상품')
  await input.press('Enter')
  await page.getByRole('heading', { name: '선택하신 조건에 맞는 상품이 없습니다.' }).waitFor()
  failure = true
  await input.fill(searchCases[0].query)
  await input.press('Enter')
  await page.getByRole('alert').waitFor()
  assert.equal(await page.locator('.product-grid').count(), 0)
  assert.ok(!(await page.locator('body').textContent()).includes('private upstream'))
  await page.getByRole('button', { name: '일반 검색으로 전환', exact: true }).click()
  const normal = page.getByRole('textbox', { name: '상품명 또는 카테고리 검색' })
  await normal.fill('그래놀라')
  const normalNames = await page.locator('.product-grid .card-name').allTextContents()
  assert.ok(normalNames.length > 0 && normalNames.every(name => names.has(name)))
  failure = false
  await page.getByTitle('AI 자연어 검색으로 전환').click()
  delay = 500
  await input.fill(searchCases[0].query)
  await input.press('Enter')
  await page.getByRole('status').filter({ hasText: '검색 조건' }).waitFor()
  await page.getByTitle('일반 검색으로 전환').click()
  await page.waitForTimeout(650)
  assert.equal(await page.locator('.ai-result-summary').count(), 0, 'Cancelled search must not restore AI results')
  delay = 100
  await page.getByTitle('AI 자연어 검색으로 전환').click()
  await input.fill(searchCases[0].query)
  await input.press('Enter')
  await page.locator('.ai-query').waitFor()
  const out = process.env.AI_SCREENSHOT_DIR
  if (out) {
    await page.screenshot({ path: `${out}/caremarket-ai-desktop.png` })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.locator('.ai-result-summary').scrollIntoViewIfNeeded()
    await page.screenshot({ path: `${out}/caremarket-ai-mobile.png` })
    const box = await page.locator('.ai-result-summary').boundingBox()
    assert.ok(box.x >= 0 && box.x + box.width <= 390)
  }
  assert.deepEqual(runtimeErrors, [])
  assert.deepEqual(forbidden, [])
  const report = { mode: 'Real Supabase products + Gemini HTTP fixtures; not a live Gemini test', productCount: dbProducts.length, results, validationCases: [10, 11, 12], runtimeErrors, directGeminiOrCartWrites: forbidden.length }
  console.log(JSON.stringify(report, null, 2))
  if (process.env.AI_TEST_REPORT) fs.writeFileSync(process.env.AI_TEST_REPORT, JSON.stringify(report, null, 2) + '\n')
} finally { await browser.close() }
