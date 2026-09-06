import bundledImages from '../data/product-images.json' with { type: 'json' }
import legacyImages from '../data/product-image-legacy.json' with { type: 'json' }

export function resolveProductImage(productId, imageUrl = '') {
  const url = bundledImages[productId]
  if (!url) return imageUrl
  const localPath = url.split('?')[0]
  // Preserve new images explicitly supplied through product management.
  const sourcePath = imageUrl?.split('?')[0]
  if (!imageUrl || sourcePath === legacyImages[productId] || sourcePath === localPath) {
    return url
  }
  return imageUrl
}
