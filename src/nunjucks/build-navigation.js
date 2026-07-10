import { SPOKES, SUPPORTED_SPECIES, SUPPORTED_TAXONOMIES } from '../index.js'

/** @import { Request } from '@hapi/hapi' */

const PERMISSION_PREFIX = 'lis-perm-'
const ACCESS_LEVELS = new Set(['read', 'write', 'admin'])
const MIN_PERMISSION_PARTS = 2

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
  const homeItem = {
    text: 'Home',
    href: buildHubHref(hubOrigin, '/'),
    current: request?.path === '/' && !currentSpecies?.id
  }
  const profileItem = {
    text: 'Profile',
    href: buildHubHref(hubOrigin, '/profile'),
    current: request?.path === '/profile' && !currentSpecies?.id
  }
  const permissions = request?.app?.hubAuth?.permissions

  if (!Array.isArray(permissions) || permissions.length === 0) {
    return [homeItem]
  }

  const permittedSpecies = getPermittedSpecies(permissions)

  return [
    homeItem,
    ...permittedSpecies.map((species) => ({
      text: species.label,
      href: buildHubHref(hubOrigin, getSpeciesHomePath(species)),
      current: species.id === currentSpecies?.id
    })),
    profileItem
  ]
}

function getPermittedSpecies(permissions) {
  if (!permissions) {
    return null
  }

  const allowedSpecies = new Set()

  for (const permission of permissions) {
    const parsedPermission = parsePermission(permission)

    if (
      parsedPermission?.type !== 'species' &&
      parsedPermission?.type !== 'app'
    ) {
      continue
    }

    const matchingSpecies = SUPPORTED_SPECIES.find(
      ({ id, slug }) =>
        id === parsedPermission.speciesId || slug === parsedPermission.speciesId
    )

    if (matchingSpecies) {
      allowedSpecies.add(matchingSpecies.id)
    }
  }

  return SUPPORTED_SPECIES.filter((species) => allowedSpecies.has(species.id))
}

function parsePermission(permission) {
  if (typeof permission !== 'string' || permission.length === 0) {
    return null
  }

  const normalizedPermission = permission.toLowerCase().trim()

  if (!normalizedPermission.startsWith(PERMISSION_PREFIX)) {
    return null
  }

  const parts = normalizedPermission
    .slice(PERMISSION_PREFIX.length)
    .split('-')
    .filter(Boolean)

  if (parts.length < MIN_PERMISSION_PARTS || !ACCESS_LEVELS.has(parts.at(-1))) {
    return null
  }

  const scopeParts = parts.slice(0, -1)

  if (scopeParts.length === 1) {
    return {
      type: scopeParts[0] === 'user' ? 'user' : 'species',
      speciesId: scopeParts[0] === 'user' ? null : scopeParts[0]
    }
  }

  return {
    type: 'app',
    speciesId: scopeParts[0],
    taxonomyId: scopeParts.slice(1).join('-')
  }
}

function getSpeciesHomePath(species) {
  return (
    SPOKES.find(
      (spoke) =>
        spoke.taxonomy.id === 'home' &&
        (spoke.species.id === species.id || spoke.species.id === species.slug)
    )?.path ?? `/${species.slug}/home`
  )
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
