import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { WELLNESS_TABLE_THEMES } from '../src/lib/wellness-table.js'

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true })
const origin = process.env.CAREMARKET_TEST_ORIGIN || 'http://127.0.0.1:5175'
const products = JSON.parse(readFileSync(new URL('../data/products.seed.json', import.meta.url), 'utf8')).map((product, i) => ({ ...product, product_id: i + 1 }))
try {
  const page = await browser.newPage()
  await page.addInitScript(() => localStorage.setItem('cm_welcome_hide_date', new Date().toISOString().slice(0, 10)))
  await page.route('**/rest/v1/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(route.request().url().includes('/products?') ? products : []) }))
  await page.goto(origin)
  if (await page.locator('.ev-close').count()) await page.locator('.ev-close').click()
  await page.locator('.hotspot').first().waitFor()
  for (const width of [320, 390, 596, 640, 720, 760, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    for (const theme of WELLNESS_TABLE_THEMES) {
      await page.getByRole('tab', { name: theme.label, exact: true }).click()
      await page.locator('.wtable-stage').scrollIntoViewIfNeeded()
      const geometry = await page.locator('.wtable-stage').evaluate(async (stage) => {
        const media = stage.querySelector('.wtable-media')
        const image = new Image()
        image.src = getComputedStyle(media).backgroundImage.slice(5, -2)
        await image.decode()
        const frame = stage.getBoundingClientRect()
        return {
          ratio: frame.width / frame.height,
          sourceRatio: image.naturalWidth / image.naturalHeight,
          pins: [...stage.querySelectorAll('.hotspot')].map(pin => {
            const rect = pin.getBoundingClientRect()
            return { x: (rect.x + rect.width / 2 - frame.x) / frame.width * 100, y: (rect.y + rect.height / 2 - frame.y) / frame.height * 100 }
          }),
        }
      })
      assert.equal(geometry.pins.length, 4, theme.id)
      if (width <= 760) assert.ok(Math.abs(geometry.ratio - geometry.sourceRatio) < 0.005, `${theme.id}: photo must not be cropped at ${width}px`)
      for (const [i, pin] of geometry.pins.entries()) {
        const expected = theme.visual.slots[i].coordinates[width <= 760 ? 'mobile' : 'desktop']
        assert.ok(Math.abs(pin.x - expected.x) < 0.1 && Math.abs(pin.y - expected.y) < 0.1, `${theme.id}: pin ${i} drifted at ${width}px`)
      }
      if (process.env.WELLNESS_SCREENSHOTS && width === 390) await page.locator('.wtable-stage').screenshot({ path: `tmp/wellness-mobile-${theme.id}.png` })
      const pin = page.locator('.hotspot').first()
      const productName = (await pin.getAttribute('aria-label')).replace(/ 보기$/, '')
      await pin.click()
      assert.equal(await page.locator('.wpop-name').innerText(), productName)
      if (width <= 760) {
        const popup = await page.locator('.wpop').boundingBox()
        assert.ok(popup.x >= 0 && popup.x + popup.width <= width)
      }
    }
  }
  console.log('Wellness: all three themes retain source-image alignment and product popovers across seven viewport widths.')
} finally { await browser.close() }
