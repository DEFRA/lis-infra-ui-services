import { isPublicRequest } from './auth.js'

const ACCESS_LEVEL_RANKS = {
  read: 1,
  write: 2,
  admin: 3
}

const PERMISSION_PREFIX = 'lis-perm-'
const SPECIES_SCOPED_TAXONOMIES = new Set(['home', 'status', 'events'])

export function createModuleAccessGuard({ assetPath, moduleAccess }) {
  const resolvedModuleAccess = normalizeModuleAccess(moduleAccess)

  if (!resolvedModuleAccess) {
    throw new Error('Unable to resolve module access configuration')
  }

  return {
    plugin: {
      name: 'moduleAccessGuard',
      register(server) {
        server.ext('onPreAuth', (request, h) => {
          if (isPublicRequest(request, assetPath)) {
            return h.continue
          }

          if (hasModuleAccess(request.app?.hubAuth, resolvedModuleAccess)) {
            return h.continue
          }

          return h
            .response({ message: 'Module access denied' })
            .code(403)
            .takeover()
        })
      }
    }
  }
}

export function getAccessibleModulesForHub({
  hubId,
  user,
  modules = [],
  taxonomy
}) {
  if (!hubId || !hasPortalAccess(user, hubId)) {
    return []
  }

  return modules.filter((module) => {
    if (!Array.isArray(module?.hubs) || !module.hubs.includes(hubId)) {
      return false
    }

    if (taxonomy && module.taxonomy !== taxonomy) {
      return false
    }

    return hasModuleAccess(user, resolveModuleAccess(module))
  })
}

export function hasModuleAccess(user, moduleAccess) {
  if (!moduleAccess?.minLevel) {
    return false
  }

  const permissions = Array.isArray(user?.permissions) ? user.permissions : []
  const requiredRank = ACCESS_LEVEL_RANKS[moduleAccess.minLevel] ?? 0

  return permissions.some((permission) => {
    const parsedPermission = parsePermission(permission)

    if (!parsedPermission || parsedPermission.scope !== moduleAccess.scope) {
      return false
    }

    if (parsedPermission.levelRank < requiredRank) {
      return false
    }

    if (moduleAccess.scope === 'user') {
      return true
    }

    if (parsedPermission.species !== moduleAccess.species) {
      return false
    }

    if (moduleAccess.scope === 'species') {
      return true
    }

    return parsedPermission.app === moduleAccess.app
  })
}

export function resolveModuleAccess(module) {
  if (module?.access) {
    return module.access
  }

  const species = getModuleSpecies(module)

  if (!species) {
    return null
  }

  if (SPECIES_SCOPED_TAXONOMIES.has(module?.taxonomy)) {
    return {
      species,
      scope: 'species',
      minLevel: 'read'
    }
  }

  if (module?.taxonomy) {
    return {
      species,
      scope: 'app',
      app: module.taxonomy,
      minLevel: 'read'
    }
  }

  return null
}

function normalizeModuleAccess(moduleAccess) {
  if (moduleAccess?.minLevel) {
    return moduleAccess
  }

  return resolveModuleAccess(moduleAccess)
}

function hasPortalAccess(user, hubId) {
  const permissions = Array.isArray(user?.permissions) ? user.permissions : []

  return permissions.some(
    (permission) => permission?.toLowerCase?.() === `${PERMISSION_PREFIX}${hubId}`
  )
}

function getModuleSpecies(module) {
  if (typeof module?.access?.species === 'string' && module.access.species.length > 0) {
    return module.access.species
  }

  if (typeof module?.path === 'string') {
    const species = module.path.split('/')[1]

    if (species) {
      return species.toLowerCase()
    }
  }

  return null
}

function parsePermission(permission) {
  if (typeof permission !== 'string' || permission.length === 0) {
    return null
  }

  const normalizedPermission = permission.toLowerCase().trim()

  if (!normalizedPermission.startsWith(PERMISSION_PREFIX)) {
    return null
  }

  const body = normalizedPermission.slice(PERMISSION_PREFIX.length)

  if (body === 'front-office' || body === 'back-office') {
    return {
      scope: 'portal'
    }
  }

  const parts = body.split('-').filter(Boolean)

  if (parts.length < 2) {
    return null
  }

  const level = parts.at(-1)
  const levelRank = ACCESS_LEVEL_RANKS[level] ?? 0

  if (!levelRank) {
    return null
  }

  const scopeParts = parts.slice(0, -1)

  if (scopeParts.length === 1 && scopeParts[0] === 'user') {
    return {
      scope: 'user',
      level,
      levelRank
    }
  }

  if (scopeParts.length === 1) {
    return {
      scope: 'species',
      species: scopeParts[0],
      level,
      levelRank
    }
  }

  return {
    scope: 'app',
    species: scopeParts[0],
    app: scopeParts.slice(1).join('-'),
    level,
    levelRank
  }
}
