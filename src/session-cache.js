import yar from '@hapi/yar'

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
        clearInvalid: true
      }
    }
  }
}

export function createSessionCachePluginForConfig(config) {
  return createSessionCachePlugin({
    sessionConfig: config.get('session'),
    isSecure: config.get('session.cookie.secure')
  })
}
