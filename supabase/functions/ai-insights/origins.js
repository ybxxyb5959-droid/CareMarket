// The canonical storefront must work even when optional origin secrets are unset or stale.
export const STOREFRONT_ORIGIN = 'https://caremarket.vercel.app'

export function resolveInsightOrigins(configuredOrigins = '') {
  return [...new Set([
    STOREFRONT_ORIGIN,
    ...configuredOrigins.split(',').map((origin) => origin.trim()).filter(Boolean),
  ])]
}
