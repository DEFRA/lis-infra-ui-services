import path from 'node:path'

import { hasPermission } from '@defra/lis-hubs-infra-access/authorization'
import { HUBS, getModuleById } from '@defra/lis-hubs-infra-registry'

const HUB_SERVICE_NAME_PREFIX = 'lis-hubs-'

export const BCMS_CONTACT_HREF =
  'https://www.gov.uk/government/organisations/british-cattle-movement-service'

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
 * @typedef {object} ErrorPageLinks
 * @property {string} [contactHref] - every error page's contact link; defaults to the BCMS GOV.UK page
 * @property {string} [homeHref] - the page not found "Home page" link; defaults to '/'
 * @property {string} [getStartedHref] - the page not found "Get started" link; defaults to '/'
 */

/**
 * @param {{ config: object, getRequestBasePath: Function, logger: object, readFileSync: Function, moduleId?: string, errorPages?: ErrorPageLinks }} options
 * @returns {Function}
 */
export function createNunjucksContextBuilder({
  config,
  getRequestBasePath,
  logger,
  readFileSync,
  moduleId,
  errorPages = {}
}) {
  const errorPageLinks = {
    contactHref: errorPages.contactHref ?? BCMS_CONTACT_HREF,
    homeHref: errorPages.homeHref ?? '/',
    getStartedHref: errorPages.getStartedHref ?? '/'
  }
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
      // No primary navigation links for now: only the service name and Sign out.
      navigation: [],
      isSignedIn: Boolean(request?.auth?.credentials?.user),
      isFrontOffice: requestHubId === 'front-office',
      isBackOffice: requestHubId === 'back-office',
      hasPermission: createPermissionCheck(request),
      logoutUrl: '/signout',
      errorPages: errorPageLinks,
      getAssetPath(asset) {
        const viteAssetPath = viteManifest?.[asset]?.file
        return `${assetRoot}/${viteAssetPath ?? asset}`
      }
    }
  }
}
