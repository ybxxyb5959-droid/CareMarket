import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'

const directory = new URL('../public/assets/products/', import.meta.url)
const images = Object.fromEntries(readdirSync(directory).sort().filter((name) => /^product-\d+-.*\.webp$/.test(name)).map((name) => {
  const version = createHash('sha256').update(readFileSync(new URL(name, directory))).digest('hex').slice(0, 12)
  return [Number(name.match(/^product-(\d+)/)[1]), `/assets/products/${name}?v=${version}`]
}))
writeFileSync(new URL('../src/data/product-images.json', import.meta.url), `${JSON.stringify(images, null, 2)}\n`)
