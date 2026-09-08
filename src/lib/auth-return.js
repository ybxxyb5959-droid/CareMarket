import { parseAppLocation } from './navigation.js'
const KEY = 'cm-auth-return'
export function safeReturnPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value)) return null
  try {
    const decoded = decodeURIComponent(value)
    if (decoded.startsWith('//') || /[\\\u0000-\u0020]/.test(decoded)) return null
    const url = new URL(value, 'https://caremarket.invalid')
    if (url.origin !== 'https://caremarket.invalid' || ['login', 'register', 'notFound', 'paymentSuccess', 'paymentFail'].includes(parseAppLocation(url).view)) return null
    return url.pathname + url.search + url.hash
  } catch { return null }
}
export function rememberAuthReturn(storage, value) {
  const path = safeReturnPath(value)
  try { if (path) storage.setItem(KEY, JSON.stringify({ path, at: Date.now() })) } catch { /* Login still works without storage. */ }
}
export function consumeAuthReturn(storage, search = '') {
  const params = new URLSearchParams(search)
  let saved
  try { saved = JSON.parse(storage.getItem(KEY) || 'null'); storage.removeItem(KEY) } catch { /* Storage unavailable. */ }
  if (params.has('redirect')) return safeReturnPath(params.get('redirect'))
  return saved && Date.now() - saved.at < 30 * 60 * 1000 ? safeReturnPath(saved.path) : null
}
