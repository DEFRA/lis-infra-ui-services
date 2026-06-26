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

export function getRequestBasePath({ request, basePath }) {
  const normalizedBasePath = normalizeBasePath(basePath)

  return isPrefixedRequest({ request, basePath: normalizedBasePath })
    ? normalizedBasePath
    : ''
}

export function buildAppPath({ request, routePath = '/', basePath = '' }) {
  const requestBasePath = getRequestBasePath({ request, basePath })
  const normalizedPath = normalizePath(routePath)

  if (normalizedPath === '/') {
    return requestBasePath || '/'
  }

  return `${requestBasePath}${normalizedPath}`
}

export function getRouteVariants({ routePath = '/', basePath = '' }) {
  const normalizedPath = normalizePath(routePath)
  return [normalizedPath]
}

export function getAssetPaths({ basePath = '', assetPath }) {
  return [assetPath]
}

export function createBasePathHelpersForConfig(config) {
  function getBasePath() {
    return config.get('basePath')
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
        assetPath: config.get('assetPath')
      })
    }
  }
}
