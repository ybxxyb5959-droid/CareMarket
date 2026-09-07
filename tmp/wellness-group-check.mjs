import assert from 'node:assert/strict'
import { chromium } from 'file:///C:/Users/krime/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'
import { WELLNESS_TABLE_THEMES } from '../src/lib/wellness-table.js'
const products = WELLNESS_TABLE_THEMES.flatMap((theme, t) => theme.visual.slots.map((slot, i) => ({ product_id: t * 10 + i + 1, name: slot.keywords[0] + ' 테스트 상품', category: slot.categories[0], brand: 'TEST', price: 3000, stock: 10, protein: 20, sugar: 1, sodium: 100, calories: 150, is_active: true, allergens: [], image_url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"/%3E' })))
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
try {
 const page = await browser.newPage({viewport: {width:1440,height:1000}})
 const errors=[]; page.on('pageerror', e=>errors.push(e.message))
 await page.addInitScript(()=>sessionStorage.setItem('cm_welcome_dismissed','1'))
 await page.route('https://caremarket-ui-test.supabase.co/**', route=>route.fulfill({contentType:'application/json',body:JSON.stringify(route.request().url().includes('/rest/v1/products')?products:[])}))
 await page.goto('http://127.0.0.1:5178')
 const section=page.locator('.wellness-table-section')
 await section.locator('.hotspot').first().waitFor()
 for (const theme of WELLNESS_TABLE_THEMES) {
  await section.getByRole('tab',{name:theme.label,exact:true}).click()
  assert.equal(await section.locator('.hotspot').count(),3)
  const grouped=section.locator('.hotspot').filter({hasText:''})
  let found=false
  for (const pin of await grouped.all()) { await pin.hover(); if(await section.locator('.wpop-product').count()===2){ found=true; break } }
  assert.ok(found)
  await section.locator('.wpop-product').last().hover()
  assert.equal(await section.locator('.wpop-product').count(),2)
 }
 await section.getByRole('tab',{name:'고단백 밸런스',exact:true}).click()
 await section.locator('.hotspot').nth(1).hover()
 await section.screenshot({path:'tmp/wellness-group-desktop.png'})
 await section.locator('.wpop-product').last().click()
 await page.waitForURL('**/products/*')
 await page.goBack()
 await page.setViewportSize({width:390,height:900})
 await section.locator('.hotspot').nth(1).click()
 assert.equal(await section.locator('.wpop-product').count(),2)
 await section.screenshot({path:'tmp/wellness-group-mobile.png'})
 assert.equal(await section.evaluate(el=>el.scrollWidth>el.clientWidth),false)
 await page.keyboard.press('Escape')
 assert.equal(await section.locator('.wpop-product').count(),0)
 assert.deepEqual(errors,[])
 console.log('PASS: desktop 3 themes grouped hover, product navigation, mobile two-product tap, Escape, no overflow/runtime errors')
} finally {await browser.close()}


