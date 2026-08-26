/** @import { Request } from '@hapi/hapi' */

import { getBasePathForModule } from '@defra/lis-hubs-infra-registry'

function normalizePath(path) {
  if (!path || path === '/') {
    return '/'
  }

  return path.startsWith('/') ? path : `/${path}`
}

function normalizeBasePath(path) {
  if (!path) {
    return ''
  }

  const normalizedPath = normalizePath(path)

  return normalizedPath === '/' ? '' : normalizedPath
}

function getForwardedPrefix(request) {
  const forwardedPrefix = request?.headers?.['x-forwarded-prefix']

  if (typeof forwardedPrefix !== 'string') {
    return ''
  }

  return normalizeBasePath(forwardedPrefix.trim())
}

/**
 * @param {{ request: Request, basePath: string }} options
 * @returns {boolean}
 */
export function isPrefixedRequest({ request, basePath }) {
  const normalizedBasePath = normalizeBasePath(basePath)

  if (!normalizedBasePath || !request) {
    return false
  }

  const forwardedPrefix = getForwardedPrefix(request)

  if (forwardedPrefix) {
    return forwardedPrefix === normalizedBasePath
  }

  return (
    request.path === normalizedBasePath ||
    request.path.startsWith(`${normalizedBasePath}/`)
  )
}

/**
 * @param {{ request: Request, basePath: string }} options
 * @returns {string}
 */
export function getRequestBasePath({ request, basePath }) {
  const normalizedBasePath = normalizeBasePath(basePath)

  return isPrefixedRequest({ request, basePath: normalizedBasePath })
    ? normalizedBasePath
    : ''
}

/**
 * @param {{ request: Request, routePath?: string, basePath?: string }} options
 * @returns {string}
 */
export function buildAppPath({ request, routePath = '/', basePath = '' }) {
  const requestBasePath = getRequestBasePath({ request, basePath })
  const normalizedPath = normalizePath(routePath)

  if (normalizedPath === '/') {
    return requestBasePath || '/'
  }

  return `${requestBasePath}${normalizedPath}`
}

/**
 * @param {{ routePath?: string, basePath?: string }} options
 * @returns {string[]}
 */
export function getRouteVariants({ routePath = '/', basePath: _basePath = '' }) {
  const normalizedPath = normalizePath(routePath)
  return [normalizedPath]
}

/**
 * @param {{ basePath?: string, assetPath: string }} options
 * @returns {string[]}
 */
export function getAssetPaths({ basePath: _basePath = '', assetPath }) {
  return [assetPath]
}

/**
 * @param {{ moduleId?: string, assetPath: string }} options
 * @returns {object}
 */
export function createBasePathHelpersForConfig({ moduleId, assetPath }) {
  const basePath = moduleId ? getBasePathForModule(moduleId) : ''

  function getBasePath() {
    return basePath
  }

  return {
    getBasePath,
    isPrefixedRequest(request) {
      return isPrefixedRequest({
        request,
        basePath: getBasePath()
      })
    },
    getRequestBasePath(request) {
      return getRequestBasePath({
        request,
        basePath: getBasePath()
      })
    },
    buildAppPath(request, routePath = '/') {
      return buildAppPath({
        request,
        routePath,
        basePath: getBasePath()
      })
    },
    getRouteVariants(routePath = '/') {
      return getRouteVariants({
        routePath,
        basePath: getBasePath()
      })
    },
    getAssetPaths() {
      return getAssetPaths({
        basePath: getBasePath(),
        assetPath
      })
    }
  }
}
