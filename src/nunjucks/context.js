import path from 'node:path'

import { getModuleById } from '@defra/lis-hubs-infra-registry'

/**
 * @param {{ config: object, buildNavigation: Function, getRequestBasePath: Function, logger: object, readFileSync: Function, moduleId?: string }} options
 * @returns {Function}
 */
export function createNunjucksContextBuilder({
  config,
  buildNavigation,
  getRequestBasePath,
  logger,
  readFileSync,
  moduleId
}) {
  const sectionName = moduleId ? (getModuleById(moduleId)?.label ?? null) : null
  const manifestPath = path.join(
    config.get('root'),
    '.public/.vite/manifest.json'
  )

  let viteManifest
  let hasLoggedManifestError = false

  return function context(request) {
    if (!viteManifest) {
      try {
        viteManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
        hasLoggedManifestError = false
      } catch (error) {
        if (config.get('isProduction') && !hasLoggedManifestError) {
          logger.error(error, `Vite ${path.basename(manifestPath)} not found`)
          hasLoggedManifestError = true
        }
      }
    }

    const requestBasePath = getRequestBasePath(request)
    const assetRoot = `${requestBasePath}${config.get('assetPath')}`

    return {
      assetPath: `${assetRoot}/assets`,
      serviceName: config.get('serviceName'),
      sectionName,
      serviceUrl: requestBasePath || '/',
      breadcrumbs: [],
      navigation: buildNavigation(request),
      isSignedIn: Boolean(request?.app?.hubAuth),
      logoutUrl: '/signout',
      getAssetPath(asset) {
        const viteAssetPath = viteManifest?.[asset]?.file
        return `${assetRoot}/${viteAssetPath ?? asset}`
      }
    }
  }
}
