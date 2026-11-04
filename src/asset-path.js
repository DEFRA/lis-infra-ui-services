import { getMountPath } from '@defra/lis-hubs-infra-registry'

/**
 * Where an app's built CSS and JavaScript are served from. A hub serves its
 * own at its configured asset path. A spoke serves its own at its `assets`
 * mount from the registry, which the hub proxies to it unchanged, so the
 * same URL works whether the spoke is reached through a hub or directly.
 *
 * @param {{ moduleId?: string, assetPath: string }} options the module id of a spoke (leave out in a hub) and the hub's own asset path
 * @returns {string}
 */
export function getAssetRoot({ moduleId, assetPath }) {
  return moduleId ? getMountPath(moduleId, 'assets') : assetPath
}

/**
 * @param {{ moduleId?: string, assetPath: string }} options
 * @returns {{ getAssetRoot: () => string, getAssetPaths: () => string[] }}
 */
export function createAssetPathHelpers({ moduleId, assetPath }) {
  const assetRoot = getAssetRoot({ moduleId, assetPath })

  return {
    getAssetRoot() {
      return assetRoot
    },
    getAssetPaths() {
      return [assetRoot]
    }
  }
}
