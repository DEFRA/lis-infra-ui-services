export function createStaticFilesPlugin({
  assetPaths,
  staticCacheTimeout,
  noContentStatusCode
}) {
  return {
    plugin: {
      name: 'staticFiles',
      register(server) {
        server.route([
          {
            options: {
              auth: false,
              cache: {
                expiresIn: staticCacheTimeout,
                privacy: 'private'
              }
            },
            method: 'GET',
            path: '/favicon.ico',
            handler(_request, h) {
              return h.response().code(noContentStatusCode).type('image/x-icon')
            }
          },
          ...assetPaths.map((assetPath) => ({
            options: {
              auth: false,
              cache: {
                expiresIn: staticCacheTimeout,
                privacy: 'private'
              }
            },
            method: 'GET',
            path: `${assetPath}/{param*}`,
            handler: {
              directory: {
                path: '.',
                redirectToSlash: true
              }
            }
          }))
        ])
      }
    }
  }
}
