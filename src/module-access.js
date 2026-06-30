const ACCESS_LEVEL_RANKS = {
  read: 1,
  write: 2,
  admin: 3
}

const PERMISSION_PREFIX = 'lis-perm-'
const PUBLIC_ROUTE_PREFIXES = ['/health']

export function hasModuleAccess(user, moduleAccess) {
  const requiredAccessLevel = ACCESS_LEVEL_RANKS[moduleAccess?.minLevel]

  if (!requiredAccessLevel) {
    return false
  }

  const userAccessLevel = getUserAccessLevelForModule(user, moduleAccess)

  return userAccessLevel >= requiredAccessLevel
}

export function createModuleAccessGuard({ assetPath, moduleAccess }) {
  return {
    plugin: {
      name: `moduleAccessGuard:${buildModuleAccessGuardName(moduleAccess)}`,
      register(server) {
        server.ext('onPreHandler', (request, h) => {
          if (isPublicModuleAccessRequest(request, assetPath)) {
            return h.continue
          }

          if (hasModuleAccess(request.app?.hubAuth, moduleAccess)) {
            return h.continue
          }

          return h.response({ message: 'Forbidden' }).code(403).takeover()
        })
      }
    }
  }
}

function getUserAccessLevelForModule(user, moduleAccess) {
  const permissions = Array.isArray(user?.permissions) ? user.permissions : []
  let accessLevel = 0

  for (const permission of permissions) {
    const parsedPermission = parsePermission(permission)

    if (
      !parsedPermission ||
      parsedPermission.species !== moduleAccess.species
    ) {
      continue
    }

    if (
      moduleAccess.scope === 'species' &&
      parsedPermission.scope === 'species'
    ) {
      accessLevel = Math.max(accessLevel, parsedPermission.level)
    }

    if (
      moduleAccess.scope === 'app' &&
      parsedPermission.scope === 'app' &&
      parsedPermission.app === moduleAccess.app
    ) {
      accessLevel = Math.max(accessLevel, parsedPermission.level)
    }
  }

  return accessLevel
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

  if (parts.length < 2) {
    return null
  }

  const level = ACCESS_LEVEL_RANKS[parts.at(-1)] ?? 0

  if (!level) {
    return null
  }

  const scopeParts = parts.slice(0, -1)

  if (scopeParts.length === 1) {
    return {
      scope: 'species',
      species: scopeParts[0],
      level
    }
  }

  return {
    scope: 'app',
    species: scopeParts[0],
    app: scopeParts.slice(1).join('-'),
    level
  }
}

function isPublicModuleAccessRequest(request, assetPath) {
  return (
    request.path === '/favicon.ico' ||
    PUBLIC_ROUTE_PREFIXES.includes(request.path) ||
    request.path === assetPath ||
    request.path.startsWith(`${assetPath}/`) ||
    request.path.includes(`${assetPath}/`)
  )
}

function buildModuleAccessGuardName(moduleAccess) {
  return [
    moduleAccess?.species,
    moduleAccess?.scope,
    moduleAccess?.app,
    moduleAccess?.minLevel
  ]
    .filter(Boolean)
    .join(':')
}
