import { SPOKES, SUPPORTED_SPECIES, SUPPORTED_TAXONOMIES } from '../index.js'

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
    current: request?.path === '/profile' && !currentSpecies.id
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
  if(!permissions)
    return null

  const allowedSpecies = new Set(
    permissions
      .filter((permission) => typeof permission === 'string' && permission.length > 0)
      .map((permission) => permission.split('.')[0].toLowerCase())
  )

  return SUPPORTED_SPECIES.filter((species) => allowedSpecies.has(species.id))
}

function getPermittedTaxonomies(species, permissions) {
  if(!permissions || !species)
    return null

  const allowedTaxonomies = new Set(
    permissions
      .filter((permission) => permission.startsWith(`${species.id}.`))
      .map((permission) => permission.split('.')[1].toLowerCase())
  )

  return SUPPORTED_TAXONOMIES.filter((taxonomy) => allowedTaxonomies.has(taxonomy.id))
}

function getSpeciesHomePath(species) {
  return (
    SPOKES.find(
      (spoke) =>
        spoke.taxonomy.id === 'home' && spoke.species.id === species.id
    )?.path ?? `/${species.slug}/home`
  )
}

function getCurrentSpecies({ request, basePath }) {
  for (const path of [request?.path, basePath]) {
    const [speciesSlug, taxonomySlug] = path.split('/').filter(Boolean)

    const taxonomy = SUPPORTED_TAXONOMIES.find((taxonomy) => taxonomy.slug === taxonomySlug)
    const species = SUPPORTED_SPECIES.find((species) => species.slug === speciesSlug)
    if (taxonomy && species) {
      return species
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
