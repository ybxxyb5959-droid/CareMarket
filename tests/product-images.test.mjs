import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import images from '../src/data/product-images.json' with { type: 'json' }
import { resolveProductImage } from '../src/lib/product-images.js'

test('bundled product images resolve in production and invalidate stale file caches', () => {
  for (const [id, url] of Object.entries(images)) {
    const [path, query] = url.split('?')
    const bytes = readFileSync(new URL(`../public${path}`, import.meta.url))
    assert.equal(query, `v=${createHash('sha256').update(bytes).digest('hex').slice(0, 12)}`)
    assert.equal(resolveProductImage(id, 'https://images.unsplash.com/photo-old?w=600'), url)
    assert.equal(resolveProductImage(id, path), url)
    assert.equal(resolveProductImage(id, `${path}?v=old`), url)
  }
})

test('explicit administrator image changes and unbundled products are preserved', () => {
  for (const url of ['https://example.com/custom.webp', '/assets/custom-product.webp']) {
    assert.equal(resolveProductImage(1, url), url)
    assert.equal(resolveProductImage(999, url), url)
  }
  assert.equal(resolveProductImage(999), '')
})
