import path from 'node:path'

import { hasPermission } from '@defra/lis-hubs-infra-access/authorization'
import { HUBS, getModuleById } from '@defra/lis-hubs-infra-registry'

const HUB_SERVICE_NAME_PREFIX = 'lis-hubs-'

/**
 * Both auth schemes put the hub's service name on credentials.caller - a
 * spoke gets the hub that called it, a hub gets itself - so it is only
 * known once the request has authenticated.
 * @param {object} [request]
 * @returns {string | null}
 */
function resolveHubId(request) {
  const caller = request?.auth?.credentials?.caller

  return (
    HUBS.find(
      (candidateHubId) =>
        caller === `${HUB_SERVICE_NAME_PREFIX}${candidateHubId}`
    ) ?? null
  )
}

/**
 * Builds the hasPermission() template helper for a request. It throws on a
 * missing permission or cph because templates render undefined variables as
 * empty, so a typo would otherwise silently hide the content it guards.
 * @param {object} [request]
 * @returns {(params: { permission: string, cph: string }) => boolean}
 */
function createPermissionCheck(request) {
  return function hasPermissionForRequest({ permission, cph } = {}) {
    if (typeof permission !== 'string' || permission.length === 0) {
      throw new Error('hasPermission() requires a permission')
    }

    if (typeof cph !== 'string' || cph.length === 0) {
      throw new Error(
        "hasPermission() requires a cph - pass '*' where no holding applies"
      )
    }

    return hasPermission(request?.auth?.credentials?.user, { permission, cph })
  }
}

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
    const requestHubId = resolveHubId(request)

    return {
      assetPath: `${assetRoot}/assets`,
      serviceName: config.get('serviceName'),
      sectionName,
      serviceUrl: '/',
      breadcrumbs: [],
      navigation: buildNavigation(request),
      isSignedIn: Boolean(request?.auth?.credentials?.user),
      isFrontOffice: requestHubId === 'front-office',
      isBackOffice: requestHubId === 'back-office',
      hasPermission: createPermissionCheck(request),
      logoutUrl: '/signout',
      getAssetPath(asset) {
        const viteAssetPath = viteManifest?.[asset]?.file
        return `${assetRoot}/${viteAssetPath ?? asset}`
      }
    }
  }
}
