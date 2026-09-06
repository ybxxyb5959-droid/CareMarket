import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'

const directory = new URL('../public/assets/products/', import.meta.url)
const images = Object.fromEntries(readdirSync(directory).sort().filter((name) => /^product-\d+-.*\.webp$/.test(name)).map((name) => {
  const version = createHash('sha256').update(readFileSync(new URL(name, directory))).digest('hex').slice(0, 12)
  return [Number(name.match(/^product-(\d+)/)[1]), `/assets/products/${name}?v=${version}`]
}))
writeFileSync(new URL('../src/data/product-images.json', import.meta.url), `${JSON.stringify(images, null, 2)}\n`)

// The audit records the original catalog URLs before image replacement.
const audit = readFileSync(new URL('../docs/product-image-quality-audit-2026-09-06.tsv', import.meta.url), 'utf8')
const legacyImages = Object.fromEntries(audit.trim().split(/\r?\n/).slice(1).map((line) => {
  const [id, , , url] = line.split('\t')
  return [id, url.split('?')[0]]
}).filter(([id]) => images[id]))
writeFileSync(new URL('../src/data/product-image-legacy.json', import.meta.url), `${JSON.stringify(legacyImages, null, 2)}\n`)
