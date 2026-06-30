import path from 'node:path'

export function createNunjucksContextBuilder({
  config,
  buildNavigation,
  getRequestBasePath,
  logger,
  readFileSync
}) {
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
          logger.error(`Vite ${path.basename(manifestPath)} not found`)
          hasLoggedManifestError = true
        }
      }
    }

    const requestBasePath = getRequestBasePath(request)
    const assetRoot = `${requestBasePath}${config.get('assetPath')}`

    return {
      assetPath: `${assetRoot}/assets`,
      serviceName: config.get('serviceName'),
      serviceUrl: requestBasePath || '/',
      breadcrumbs: [],
      navigation: buildNavigation(request),
      getAssetPath(asset) {
        const viteAssetPath = viteManifest?.[asset]?.file
        return `${assetRoot}/${viteAssetPath ?? asset}`
      }
    }
  }
}
