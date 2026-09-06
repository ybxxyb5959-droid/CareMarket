import bundledImages from '../data/product-images.json' with { type: 'json' }

export function resolveProductImage(productId, imageUrl = '') {
  const url = bundledImages[productId]
  if (!url) return imageUrl
  const localPath = url.split('?')[0]
  // Preserve new images explicitly supplied through product management.
  if (!imageUrl || /^https:\/\/images\.unsplash\.com\//.test(imageUrl) || imageUrl.split('?')[0] === localPath) {
    return url
  }
  return imageUrl
}
