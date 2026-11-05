import yar from '@hapi/yar'

/**
 * @param {{ sessionConfig: object }} options
 * @returns {object}
 */
export function createSessionCachePlugin({ sessionConfig }) {
  return {
    plugin: yar,
    options: {
      name: sessionConfig.cache.name,
      cache: {
        cache: sessionConfig.cache.name,
        expiresIn: sessionConfig.cache.ttl
      },
      storeBlank: false,
      // The session carries the user's hub JWT, so it must always live in the server cache, never the cookie.
      maxCookieSize: 0,
      errorOnCacheNotReady: true,
      cookieOptions: {
        password: sessionConfig.cookie.password,
        ttl: sessionConfig.cookie.ttl,
        // Secure is a fixed invariant: the browser always reaches the app over
        // HTTPS (Caddy locally, the CDP edge deployed).
        isSecure: true,
        isSameSite: 'Lax',
        clearInvalid: true
      }
    }
  }
}

/**
 * @param {object} config
 * @returns {object}
 */
export function createSessionCachePluginForConfig(config) {
  return createSessionCachePlugin({
    sessionConfig: config.get('session')
  })
}
