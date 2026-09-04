export function isAllowedOrigin(origin, productionOrigins = []) {
  try {
    const url = new URL(origin)
    // URL parsing validates the port range; the authority check rejects paths,
    // credentials, lookalike hosts and noncanonical loopback IP spellings.
    if (url.protocol === 'http:'
      && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
      && /^http:\/\/(?:localhost|127\.0\.0\.1)(?::[0-9]+)?$/.test(origin)
      && url.port !== '0') return true

    // Production origins must be explicitly listed, never wildcard or suffix matched.
    return url.protocol === 'https:' && origin === url.origin && productionOrigins.includes(origin)
  } catch {
    return false
  }
}
