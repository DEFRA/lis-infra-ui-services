import { MODULES } from '@defra/lis-hubs-infra-registry'
import { SUPPORTED_SPECIES, SUPPORTED_TAXONOMIES } from '../index.js'

/** @import { Request } from '@hapi/hapi' */

/**
 * @param {{ request: Request, basePath?: string, hubOrigin?: string }} options
 * @returns {object[]}
 */
export function buildPrimaryNavigation({
  request,
  basePath = '',
  hubOrigin = ''
}) {
  const currentSpecies = getCurrentSpecies({ request, basePath })
  const profileItem = {
    text: 'Profile',
    href: buildHubHref(hubOrigin, '/profile'),
    current: request?.path === '/profile' && !currentSpecies?.id
  }
  const permittedSpecies = request?.app?.authorizedSpecies

  if (!Array.isArray(permittedSpecies) || permittedSpecies.length === 0) {
    return []
  }

  return [
    ...permittedSpecies.map((species) => ({
      text: species.label,
      href: buildHubHref(hubOrigin, getSpeciesHomePath(species)),
      current: species.id === currentSpecies?.id
    })),
    profileItem
  ]
}

function getSpeciesHomePath(species) {
  const speciesId = species.slug ?? species.id
  const homeModule = MODULES.find((module) => module.id === `${speciesId}-home`)

  return homeModule?.path ?? `/${speciesId}/home`
}

function getCurrentSpecies({ request, basePath }) {
  for (const path of [request?.path, basePath]) {
    if (typeof path !== 'string' || path.length === 0) {
      continue
    }

    const [speciesSlug, taxonomySlug] = path.split('/').filter(Boolean)

    const matchingTaxonomy = SUPPORTED_TAXONOMIES.find(
      (taxonomy) => taxonomy.slug === taxonomySlug
    )
    const matchingSpecies = SUPPORTED_SPECIES.find(
      (species) => species.slug === speciesSlug
    )
    if (matchingTaxonomy && matchingSpecies) {
      return matchingSpecies
    }
  }

  return null
}

function buildHubHref(hubOrigin, routePath) {
  if (!hubOrigin) {
    return routePath
  }

  return new URL(routePath, hubOrigin).toString()
}
