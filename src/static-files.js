import { fileURLToPath } from 'node:url'

import { GOOGLE_TAG_SCRIPT_NAME } from './analytics/gtm.js'

const GOOGLE_TAG_SCRIPT_PATH = fileURLToPath(
  new URL('./client/google-tag.js', import.meta.url)
)

/**
 * @param {{ assetPaths: string[], staticCacheTimeout: number, noContentStatusCode: number }} options
 * @returns {object}
 */
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
          })),
          // This package's own script, which no app builds, so every hub
          // and spoke can serve it to the layout from its asset root.
          ...assetPaths.map((assetPath) => ({
            options: {
              auth: false,
              cache: {
                expiresIn: staticCacheTimeout,
                privacy: 'private'
              }
            },
            method: 'GET',
            path: `${assetPath}/${GOOGLE_TAG_SCRIPT_NAME}`,
            handler: {
              file: { path: GOOGLE_TAG_SCRIPT_PATH, confine: false }
            }
          }))
        ])
      }
    }
  }
}
