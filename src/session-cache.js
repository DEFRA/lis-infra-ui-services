import yar from '@hapi/yar'

/**
 * @param {{ sessionConfig: object, isSecure: boolean }} options
 * @returns {object}
 */
export function createSessionCachePlugin({ sessionConfig, isSecure }) {
  return {
    plugin: yar,
    options: {
      name: sessionConfig.cache.name,
      cache: {
        cache: sessionConfig.cache.name,
        expiresIn: sessionConfig.cache.ttl
      },
      storeBlank: false,
      errorOnCacheNotReady: true,
      cookieOptions: {
        password: sessionConfig.cookie.password,
        ttl: sessionConfig.cookie.ttl,
        isSecure,
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
    sessionConfig: config.get('session'),
    isSecure: config.get('session.cookie.secure')
  })
}
