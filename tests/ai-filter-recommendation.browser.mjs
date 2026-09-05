import assert from 'node:assert/strict'
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
import { availableFilterIds } from '../supabase/functions/_shared/ai-filter-recommendation-contract.js'

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true })
const origin = 'http://127.0.0.1:5173'
const screenshotDir = process.env.AI_FILTER_SCREENSHOT_DIR
const productRows = JSON.parse(fs.readFileSync(new URL('../data/products.seed.json', import.meta.url), 'utf8'))
  .map((product, index) => ({ ...product, product_id: 1001 + index }))

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  await context.addInitScript(() => localStorage.setItem('cm_welcome_hide_date', new Date().toISOString().slice(0, 10)))
  const page = await context.newPage()
  const runtimeErrors = []
  const consoleErrors = []
  const seenInputs = []
  let failRecommendation = false

  page.on('pageerror', error => runtimeErrors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  await context.route('**/rest/v1/products*', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'Content-Range': `0-${productRows.length - 1}/${productRows.length}` },
    body: JSON.stringify(productRows),
  }))
  await context.route('**/functions/v1/ai-filter-recommendation', async route => {
    const input = route.request().postDataJSON()
    seenInputs.push(input)
    assert.deepEqual(input.availableFilters, availableFilterIds(input.currentCategory))
    assert.deepEqual(Object.keys(input).sort(), [
      'availableFilters', 'currentCategory', 'currentlySelected', 'goal', 'naturalLanguageRequest',
    ])
    await new Promise(resolve => setTimeout(resolve, 120))
    if (failRecommendation) {
      await route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ error: { code: 'UPSTREAM_ERROR' } }) })
      return
    }
    const byCategory = {
      '소스·조미료': ['low_sugar', 'low_sodium'],
      '건강음료': ['low_sugar', 'no_caffeine'],
      '프로틴': ['high_protein', 'low_sugar'],
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ recommendation: {
        recommendedFilters: byCategory[input.currentCategory] || input.availableFilters.slice(0, 1),
        reason: `${input.goal} 목적과 ${input.currentCategory} 상품군에 맞는 기존 빠른 조건을 추천해요.`,
      } }),
    })
  })

  const url = `${origin}/products?${new URLSearchParams({ category: '소스·조미료' })}`
  await page.goto(url)
  await page.locator('.product-grid .card').first().waitFor({ timeout: 60000 })
  assert.equal(seenInputs.length, 0, 'Opening the catalog must not call Gemini')

  const quickFilterLabels = await page.locator('.filterbar .f-tags .chip').allTextContents()
  assert.deepEqual(quickFilterLabels, ['저당', '저염'])
  assert.equal(await page.getByRole('button', { name: '고단백', exact: true }).count(), 0)
  assert.equal(await page.getByRole('button', { name: '카페인 제외', exact: true }).count(), 0)

  await page.getByRole('button', { name: '저당', exact: true }).click()
  await page.getByRole('button', { name: 'AI 조건 추천', exact: true }).click()
  await page.getByRole('status').filter({ hasText: '조건을 살펴보고 있어요' }).waitFor()
  await page.locator('.ai-filter-success').waitFor()
  assert.deepEqual(seenInputs[0].currentlySelected, ['low_sugar'])
  assert.equal(await page.locator('.ai-filter-group').filter({ hasText: '현재 적용' }).getByText('저당', { exact: true }).count(), 1)
  assert.equal(await page.locator('.ai-filter-group.recommended').getByText('저염', { exact: true }).count(), 1)

  await page.getByRole('button', { name: 'AI 조건 추천 닫기' }).click()
  const callsBeforeCache = seenInputs.length
  await page.getByRole('button', { name: 'AI 조건 추천', exact: true }).click()
  await page.locator('.ai-filter-success').waitFor()
  assert.equal(seenInputs.length, callsBeforeCache, 'Identical successful input should use session memory cache')

  const beforeApply = await page.locator('.product-grid .card').count()
  await page.getByRole('button', { name: '추천 조건 적용', exact: true }).click()
  await page.getByRole('button', { name: '저염', exact: true }).waitFor()
  assert.match(await page.getByRole('button', { name: '저염', exact: true }).getAttribute('class'), /\bon\b/)
  const afterApply = await page.locator('.product-grid .card').count()
  assert.ok(afterApply <= beforeApply && afterApply > 0)

  await page.locator('.header-nav .goal-nav').getByRole('button', { name: /건강음료/ }).first().click()
  await page.getByRole('heading', { name: '건강음료', exact: true }).waitFor()
  assert.deepEqual(await page.locator('.filterbar .f-tags .chip').allTextContents(), ['저당', '카페인 제외'])
  assert.equal(await page.locator('.filterbar .chip.on').count(), 0, 'Category navigation must clear incompatible hidden filters')

  failRecommendation = true
  await page.getByRole('button', { name: 'AI 조건 추천', exact: true }).click()
  await page.locator('.ai-filter-error[role="alert"]').waitFor()
  await page.getByRole('button', { name: '저당', exact: true }).click()
  assert.match(await page.getByRole('button', { name: '저당', exact: true }).getAttribute('class'), /\bon\b/)
  failRecommendation = false
  await page.getByRole('button', { name: 'AI 조건 추천', exact: true }).click()
  await page.locator('.ai-filter-success').waitFor()

  const viewportResults = []
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 })
    await page.locator('.filterbar').scrollIntoViewIfNeeded()
    const metrics = await page.locator('.ai-filter-panel').evaluate(element => {
      const box = element.getBoundingClientRect()
      return {
        viewport: window.innerWidth,
        left: Math.round(box.left),
        right: Math.round(box.right),
        width: Math.round(box.width),
        position: getComputedStyle(element).position,
        documentOverflow: document.documentElement.scrollWidth > window.innerWidth,
        overflowing: [...document.querySelectorAll('body *')].filter(node => {
          const rect = node.getBoundingClientRect()
          return rect.width > 0 && (rect.right > window.innerWidth + 1 || rect.left < -1)
        }).slice(0, 8).map(node => `${node.tagName}.${node.className}`),
      }
    })
    assert.equal(metrics.viewport, width)
    assert.ok(metrics.left >= 0 && metrics.right <= width)
    assert.equal(metrics.overflowing.some(name => name.includes('ai-filter')), false, JSON.stringify(metrics))
    if (width === 390) assert.equal(metrics.position, 'static')
    viewportResults.push(metrics)
    if (screenshotDir) await page.screenshot({ path: `${screenshotDir}/ai-filter-${width}.png`, fullPage: false })
  }

  const unexpectedConsoleErrors = consoleErrors.filter(message => (
    !message.includes('Failed to load resource: the server responded with a status of 502')
    && !message.includes('AI filter recommendation request failed')
    && !message.includes('net::ERR_NETWORK_ACCESS_DENIED')
  ))
  assert.deepEqual(runtimeErrors, [])
  assert.deepEqual(unexpectedConsoleErrors, [])
  console.log(JSON.stringify({
    mode: '100-product catalog fixture + intercepted AI recommendation HTTP fixture',
    scenarios: ['A', 'B', 'D', 'E', 'F', 'G', 'H'],
    calls: seenInputs.length,
    productCounts: { beforeApply, afterApply },
    viewportResults,
    runtimeErrors,
    unexpectedConsoleErrors,
  }, null, 2))
} finally {
  await browser.close()
}
