import { TextEncoder } from 'node:util'

import { SignJWT, jwtVerify } from 'jose'

import { SPOKES, SUPPORTED_TAXONOMIES } from './index.js'

const encoder = new TextEncoder()
const accessModeRanks = {
  public: 0,
  'user-session': 1,
  'hub-service': 2
}
const defaultAccessMode = 'user-session'

function getHubJwtSecret(secret) {
  return encoder.encode(secret)
}

function normalizeAccessMode(accessMode) {
  const normalizedAccessMode = accessMode ?? defaultAccessMode

  if (!(normalizedAccessMode in accessModeRanks)) {
    throw new Error(`Unknown access mode: ${normalizedAccessMode}`)
  }

  return normalizedAccessMode
}

export function getHubJwtCookieOptions({ ttlSeconds, isSecure }) {
  return {
    encoding: 'none',
    ttl: ttlSeconds * 1000,
    isHttpOnly: true,
    isSecure,
    isSameSite: 'Lax',
    clearInvalid: true,
    path: '/'
  }
}

export function sanitizeReturnUrl(value) {
  if (!value) {
    return '/'
  }

  if (value.startsWith('/') && !value.startsWith('//')) {
    return value
  }

  try {
    const url = new URL(value)

    if (['localhost', '127.0.0.1'].includes(url.hostname)) {
      return url.toString()
    }
  } catch (error) {
    return '/'
  }

  return '/'
}

export function getReturnUrlFromRequest(request) {
  return sanitizeReturnUrl(request.query?.returnUrl ?? '/')
}

function normalizeForwardedPrefix(prefix) {
  if (typeof prefix !== 'string') {
    return ''
  }

  const trimmedPrefix = prefix.trim()

  if (!trimmedPrefix || trimmedPrefix === '/') {
    return ''
  }

  return trimmedPrefix.startsWith('/') ? trimmedPrefix : `/${trimmedPrefix}`
}

export function buildCurrentRequestUrl(request, port) {
  const protocol = request.headers['x-forwarded-proto'] ?? 'http'
  const host = request.headers.host ?? `localhost:${port}`
  const currentUrl = new URL(
    request.raw.req.url ?? request.path,
    `${protocol}://${host}`
  )
  const forwardedPrefix = normalizeForwardedPrefix(
    request.headers['x-forwarded-prefix']
  )

  if (forwardedPrefix) {
    currentUrl.pathname =
      currentUrl.pathname === '/'
        ? forwardedPrefix
        : `${forwardedPrefix}${currentUrl.pathname}`
  }

  return currentUrl
}

export function buildHubLoginUrl({ hubOrigin, returnUrl }) {
  const loginUrl = new URL('/auth/login', hubOrigin)
  loginUrl.searchParams.set('returnUrl', sanitizeReturnUrl(returnUrl))
  return loginUrl.toString()
}

export function isPublicRequest(request, assetPath) {
  return (
    request.path === '/favicon.ico' ||
    request.path === '/health' ||
    request.path === assetPath ||
    request.path.startsWith(`${assetPath}/`) ||
    request.path.includes(`${assetPath}/`)
  )
}

export async function issueHubJwt(user, { secret, issuer, audience, ttlSeconds }) {
  return new SignJWT({
    email: user.email ?? '',
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    roles: Array.isArray(user.roles) ? user.roles : [],
    permissions: Array.isArray(user.permissions) ? user.permissions : [],
    serviceId: user.serviceId ?? '',
    loa: user.loa ?? '',
    amr: Array.isArray(user.amr) ? user.amr : []
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.sub)
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(getHubJwtSecret(secret))
}

export async function createSpokeAuthToken(
  { taxonomyId, spokeId, user },
  { secret, issuer, audience, ttlSeconds }
) {
  const token = await new SignJWT({
    taxonomy: taxonomyId,
    spokeId,
    actorSub: user?.sub ?? '',
    actorEmail: user?.email ?? '',
    actorFirstName: user?.firstName ?? '',
    actorLastName: user?.lastName ?? ''
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('hub-service')
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(getHubJwtSecret(secret))

  return `Bearer ${token}`
}

export async function verifyHubJwt(token, { secret, issuer, audience }) {
  const { payload } = await jwtVerify(token, getHubJwtSecret(secret), {
    issuer,
    audience
  })

  return payload
}

export function resolveAccessMode({ taxonomyAccessMode, spokeAccessMode }) {
  const resolvedTaxonomyAccessMode = normalizeAccessMode(taxonomyAccessMode)
  const resolvedSpokeAccessMode = normalizeAccessMode(
    spokeAccessMode ?? taxonomyAccessMode
  )

  return accessModeRanks[resolvedTaxonomyAccessMode] >=
    accessModeRanks[resolvedSpokeAccessMode]
    ? resolvedTaxonomyAccessMode
    : resolvedSpokeAccessMode
}

export function getSpokeById(spokeId) {
  return SPOKES.find((spoke) => spoke.id === spokeId) ?? null
}

export function getSpokeAccessMode(spoke) {
  const taxonomy = SUPPORTED_TAXONOMIES.find(
    ({ id }) => id === spoke?.taxonomy?.id
  )

  return resolveAccessMode({
    taxonomyAccessMode: taxonomy?.accessMode,
    spokeAccessMode: spoke?.accessMode
  })
}

export function getCurrentSpokeAccessMode(spokeId) {
  const spoke = getSpokeById(spokeId)

  if (!spoke) {
    return defaultAccessMode
  }

  return getSpokeAccessMode(spoke)
}

function getAuthorizationBearerToken(request) {
  const authorizationHeader = request.headers?.authorization

  if (typeof authorizationHeader !== 'string') {
    return null
  }

  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i)

  return match?.[1] ?? null
}

export async function getHubJwtPayloadFromRequest(
  request,
  { cookieName, secret, issuer, audience }
) {
  const token = request.state?.[cookieName]

  if (!token) {
    return null
  }

  try {
    return await verifyHubJwt(token, { secret, issuer, audience })
  } catch (error) {
    return null
  }
}

export async function verifyHubServiceJwt(
  token,
  { secret, issuer, audience, taxonomyId, spokeId }
) {
  const payload = await verifyHubJwt(token, { secret, issuer, audience })

  if (payload.sub !== 'hub-service') {
    throw new Error('Unexpected service token subject')
  }

  if (payload.taxonomy !== taxonomyId) {
    throw new Error('Unexpected service token taxonomy')
  }

  if (payload.spokeId !== spokeId) {
    throw new Error('Unexpected service token spoke')
  }

  return payload
}

export async function getHubServiceJwtPayloadFromRequest(
  request,
  { secret, issuer, audience, taxonomyId, spokeId }
) {
  const token = getAuthorizationBearerToken(request)

  if (!token) {
    return null
  }

  try {
    return await verifyHubServiceJwt(token, {
      secret,
      issuer,
      audience,
      taxonomyId,
      spokeId
    })
  } catch (error) {
    return null
  }
}

function createRequestGuard({ name, assetPath, registerState, authenticate }) {
  return {
    plugin: {
      name,
      register(server) {
        registerState?.(server)

        server.ext('onPreAuth', async (request, h) => {
          if (isPublicRequest(request, assetPath)) {
            return h.continue
          }

          return authenticate(request, h)
        })
      }
    }
  }
}

export function createAuthGuard({
  hubOrigin,
  cookieName,
  cookieOptions,
  assetPath,
  port,
  secret,
  issuer,
  audience
}) {
  return createRequestGuard({
    name: 'authGuard',
    assetPath,
    registerState(server) {
      server.state(cookieName, cookieOptions)
    },
    async authenticate(request, h) {
      const hubJwtPayload = await getHubJwtPayloadFromRequest(request, {
        cookieName,
        secret,
        issuer,
        audience
      })

      if (!hubJwtPayload) {
        const loginUrl = buildHubLoginUrl({
          hubOrigin,
          returnUrl: buildCurrentRequestUrl(request, port).toString()
        })

        return h.redirect(loginUrl).takeover()
      }

      request.app.hubAuth = hubJwtPayload
      return h.continue
    }
  })
}

export function createHubServiceGuard({
  assetPath,
  secret,
  issuer,
  audience,
  taxonomyId,
  spokeId
}) {
  return createRequestGuard({
    name: 'hubServiceGuard',
    assetPath,
    async authenticate(request, h) {
      const hubServiceJwtPayload = await getHubServiceJwtPayloadFromRequest(
        request,
        {
          secret,
          issuer,
          audience,
          taxonomyId,
          spokeId
        }
      )

      if (!hubServiceJwtPayload) {
        return h
          .response({ message: 'Hub service authentication required' })
          .code(401)
          .takeover()
      }

      request.app.hubServiceAuth = hubServiceJwtPayload
      request.app.hubAuth = {
        sub: hubServiceJwtPayload.actorSub,
        email: hubServiceJwtPayload.actorEmail,
        firstName: hubServiceJwtPayload.actorFirstName,
        lastName: hubServiceJwtPayload.actorLastName
      }

      return h.continue
    }
  })
}

export function createSpokeGuard({
  spokeId,
  hubOrigin,
  cookieName,
  cookieOptions,
  assetPath,
  port,
  secret,
  issuer,
  audience
}) {
  const spoke = getSpokeById(spokeId)

  if (!spoke) {
    throw new Error(`Unable to resolve spoke configuration for ${spokeId}`)
  }

  const accessMode = getSpokeAccessMode(spoke)

  if (accessMode === 'public') {
    return null
  }

  if (accessMode === 'hub-service') {
    return createHubServiceGuard({
      assetPath,
      secret,
      issuer,
      audience,
      taxonomyId: spoke.taxonomy.id,
      spokeId: spoke.id
    })
  }

  return createAuthGuard({
    hubOrigin,
    cookieName,
    cookieOptions,
    assetPath,
    port,
    secret,
    issuer,
    audience
  })
}
