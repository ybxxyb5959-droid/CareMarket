import fs from 'node:fs'
import { parseAst } from 'rolldown/parseAst'

const sourceUrl = new URL('../data/caremarket_catalog_mock_data_generator.tsx', import.meta.url)
const jsonUrl = new URL('../data/products.seed.json', import.meta.url)
const sqlUrl = new URL('../supabase/seed/products_seed.sql', import.meta.url)

const DB_FIELDS = [
  'name',
  'brand',
  'category',
  'price',
  'original_price',
  'stock',
  'summary',
  'serving_size',
  'calories',
  'protein',
  'carbs',
  'fat',
  'sugar',
  'sodium',
  'allergens',
  'contains_caffeine',
  'main_ingredients',
  'is_active',
  'image_url',
]

const ALLOWED_ALLERGENS = new Set([
  '우유',
  '대두',
  '계란',
  '견과류',
  '밀',
  '갑각류',
  '복숭아',
  '쇠고기',
  '닭고기',
])

function findProductsData(node) {
  if (!node || typeof node !== 'object') return null
  if (node.type === 'VariableDeclarator' && node.id?.name === 'PRODUCTS_DATA') {
    return node.init
  }

  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const child of value) {
        const found = findProductsData(child)
        if (found) return found
      }
    } else {
      const found = findProductsData(value)
      if (found) return found
    }
  }

  return null
}

function readStaticValue(node) {
  if (node.type === 'Literal') return node.value
  if (node.type === 'ArrayExpression') return node.elements.map(readStaticValue)
  if (node.type === 'ObjectExpression') {
    return Object.fromEntries(
      node.properties.map((property) => {
        if (property.type !== 'Property' || property.computed) {
          throw new Error(`Unsupported object property: ${property.type}`)
        }
        const key = property.key.name ?? property.key.value
        return [key, readStaticValue(property.value)]
      }),
    )
  }
  if (node.type === 'UnaryExpression' && node.operator === '-') {
    return -readStaticValue(node.argument)
  }

  throw new Error(`Unsupported PRODUCTS_DATA value: ${node.type}`)
}

function validateProducts(products) {
  const errors = []
  const addError = (message) => errors.push(message)

  if (products.length !== 100) addError(`Expected 100 products, found ${products.length}`)

  const ids = products.map((product) => product.id)
  const uniqueIds = new Set(ids)
  if (uniqueIds.size !== ids.length) addError('Duplicate product IDs found')

  const missingIds = Array.from({ length: 100 }, (_, index) => index + 1)
    .filter((id) => !uniqueIds.has(id))
  if (missingIds.length) addError(`Missing product IDs: ${missingIds.join(', ')}`)

  const categoryCounts = Object.create(null)
  for (const product of products) {
    categoryCounts[product.category] = (categoryCounts[product.category] || 0) + 1
  }
  if (Object.keys(categoryCounts).length !== 10) {
    addError(`Expected 10 categories, found ${Object.keys(categoryCounts).length}`)
  }
  for (const [category, count] of Object.entries(categoryCounts)) {
    if (count !== 10) addError(`Category "${category}" has ${count} products`)
  }

  const requiredStrings = ['name', 'brand', 'category', 'image_url']
  const nonNegativeNumbers = [
    'price',
    'stock',
    'calories',
    'protein',
    'carbs',
    'fat',
    'sugar',
    'sodium',
  ]

  for (const product of products) {
    for (const field of requiredStrings) {
      if (typeof product[field] !== 'string' || !product[field].trim()) {
        addError(`Product ${product.id}: ${field} must be a non-empty string`)
      }
    }

    for (const field of nonNegativeNumbers) {
      if (typeof product[field] !== 'number' || !Number.isFinite(product[field]) || product[field] < 0) {
        addError(`Product ${product.id}: ${field} must be a non-negative number`)
      }
    }

    if (
      product.original_price !== null
      && (typeof product.original_price !== 'number'
        || !Number.isFinite(product.original_price)
        || product.original_price < 0)
    ) {
      addError(`Product ${product.id}: original_price must be null or a non-negative number`)
    }

    if (!Array.isArray(product.allergens)) {
      addError(`Product ${product.id}: allergens must be an array`)
    } else {
      const invalid = product.allergens.filter((allergen) => !ALLOWED_ALLERGENS.has(allergen))
      if (invalid.length) addError(`Product ${product.id}: invalid allergens ${invalid.join(', ')}`)
    }

    if (
      !Array.isArray(product.main_ingredients)
      || product.main_ingredients.some((ingredient) => typeof ingredient !== 'string' || !ingredient.trim())
    ) {
      addError(`Product ${product.id}: main_ingredients must be an array of non-empty strings`)
    }

    if (typeof product.contains_caffeine !== 'boolean') {
      addError(`Product ${product.id}: contains_caffeine must be boolean`)
    }
    if (typeof product.is_active !== 'boolean') {
      addError(`Product ${product.id}: is_active must be boolean`)
    }
    if (product.badges?.includes('알레르기FREE')) {
      addError(`Product ${product.id}: prohibited badge 알레르기FREE remains`)
    }
  }

  if (errors.length) {
    throw new Error(`Product validation failed:\n- ${errors.join('\n- ')}`)
  }

  return categoryCounts
}

function validateSeedProducts(seedProducts) {
  const expectedFields = [...DB_FIELDS].sort()

  if (seedProducts.length !== 100) {
    throw new Error(`Seed JSON must contain 100 products, found ${seedProducts.length}`)
  }

  for (const [index, product] of seedProducts.entries()) {
    const actualFields = Object.keys(product).sort()
    if (actualFields.join(',') !== expectedFields.join(',')) {
      throw new Error(`Seed product ${index + 1} has an invalid field set`)
    }
  }
}

function sqlLiteral(value) {
  if (value === null) return 'null'
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value === 'string') return `'${value.replaceAll("'", "''")}'`
  if (Array.isArray(value)) {
    if (value.length === 0) return 'array[]::text[]'
    return `array[${value.map(sqlLiteral).join(', ')}]::text[]`
  }
  throw new Error(`Unsupported SQL value type: ${typeof value}`)
}

const source = fs.readFileSync(sourceUrl, 'utf8')
const ast = parseAst(source, { lang: 'tsx' }, 'caremarket_catalog_mock_data_generator.tsx')
const productsNode = findProductsData(ast)
if (!productsNode || productsNode.type !== 'ArrayExpression') {
  throw new Error('PRODUCTS_DATA array not found')
}

const products = readStaticValue(productsNode)
const categoryCounts = validateProducts(products)
const seedProducts = products.map((product) => Object.fromEntries(
  DB_FIELDS.map((field) => [field, product[field]]),
))

fs.writeFileSync(jsonUrl, `${JSON.stringify(seedProducts, null, 2)}\n`)

const persistedSeedProducts = JSON.parse(fs.readFileSync(jsonUrl, 'utf8'))
validateSeedProducts(persistedSeedProducts)

const sqlRows = persistedSeedProducts.map((product) => [
  '  (',
  DB_FIELDS.map((field) => `    ${sqlLiteral(product[field])}`).join(',\n'),
  '  )',
].join('\n'))

const sql = [
  'begin;',
  '',
  '-- Generated from data/products.seed.json. Run once against an empty products table.',
  'insert into public.products (',
  DB_FIELDS.map((field) => `  ${field}`).join(',\n'),
  ')',
  'values',
  `${sqlRows.join(',\n')};`,
  '',
  'commit;',
  '',
].join('\n')

fs.writeFileSync(sqlUrl, sql)

console.log(JSON.stringify({
  products: persistedSeedProducts.length,
  categories: categoryCounts,
  output: ['data/products.seed.json', 'supabase/seed/products_seed.sql'],
}, null, 2))
