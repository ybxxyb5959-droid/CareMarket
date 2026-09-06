import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import images from '../src/data/product-images.json' with { type: 'json' }
import legacyImages from '../src/data/product-image-legacy.json' with { type: 'json' }
import { resolveProductImage } from '../src/lib/product-images.js'

test('bundled product images resolve in production and invalidate stale file caches', () => {
  for (const [id, url] of Object.entries(images)) {
    const [path, query] = url.split('?')
    const bytes = readFileSync(new URL(`../public${path}`, import.meta.url))
    assert.equal(query, `v=${createHash('sha256').update(bytes).digest('hex').slice(0, 12)}`)
    assert.ok(legacyImages[id], `product ${id} has an original catalog URL`)
    assert.equal(resolveProductImage(id, `${legacyImages[id]}?w=600`), url)
    assert.equal(resolveProductImage(id, path), url)
    assert.equal(resolveProductImage(id, `${path}?v=old`), url)
  }
})

test('explicit administrator image changes and unbundled products are preserved', () => {
  for (const url of ['https://example.com/custom.webp', '/assets/custom-product.webp', 'https://images.unsplash.com/photo-custom?w=600', 'https://upload.wikimedia.org/wikipedia/commons/custom.jpg']) {
    assert.equal(resolveProductImage(1, url), url)
    assert.equal(resolveProductImage(999, url), url)
  }
  assert.equal(resolveProductImage(999), '')
})

test('Wikimedia catalog photos shown in the regression use their new product images', () => {
  const rows = readFileSync(new URL('../docs/product-image-quality-audit-2026-09-06.tsv', import.meta.url), 'utf8').trim().split(/\r?\n/).slice(1)
  for (const id of [9, 18, 36]) {
    const row = rows.find((line) => line.split('\t')[0] === String(id)).split('\t')
    assert.match(row[3], /wikimedia\.org/)
    assert.equal(resolveProductImage(id, row[3]), images[id])
  }
})
