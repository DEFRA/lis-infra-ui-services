import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildCurrentRequestUrl,
  createSpokeGuard,
  createSpokeAuthToken,
  getCurrentSpokeAccessMode,
  getHubJwtPayloadFromRequest,
  getHubJwtCookieOptions,
  getHubServiceJwtPayloadFromRequest,
  resolveAccessMode,
  verifyHubJwt
} from './auth.js'
import { SPOKES } from './index.js'

const jwtConfig = {
  secret: 'test-hub-secret-please-change-1234567890',
  issuer: 'http://localhost:3000',
  audience: 'livestock-spokes',
  ttlSeconds: 3600
}

test('buildCurrentRequestUrl reapplies the forwarded prefix for mounted spokes', () => {
  const url = buildCurrentRequestUrl(
    {
      headers: {
        host: 'localhost:3000',
        'x-forwarded-prefix': '/chicken/move'
      },
      raw: {
        req: {
          url: '/about?step=1'
        }
      },
      path: '/about'
    },
    3206
  )

  assert.equal(url.toString(), 'http://localhost:3000/chicken/move/about?step=1')
})

test('createSpokeAuthToken returns a bearer token value', async () => {
  const bearerToken = await createSpokeAuthToken(
    {
      taxonomyId: 'status',
      spokeId: 'cattle-status',
      user: {
        sub: 'test-user',
        email: 'test.user@example.com',
        firstName: 'Test',
        lastName: 'User'
      }
    },
    jwtConfig
  )

  assert.match(bearerToken, /^Bearer\s.+$/)
})

test('createSpokeAuthToken signs a JWT with the expected hub service claims', async () => {
  const bearerToken = await createSpokeAuthToken(
    {
      taxonomyId: 'status',
      spokeId: 'cattle-status',
      user: {
        sub: 'test-user',
        email: 'test.user@example.com',
        firstName: 'Test',
        lastName: 'User'
      }
    },
    jwtConfig
  )

  const [, token] = bearerToken.split(' ')
  const payload = await verifyHubJwt(token, jwtConfig)

  assert.equal(payload.sub, 'hub-service')
  assert.equal(payload.taxonomy, 'status')
  assert.equal(payload.spokeId, 'status-cattle')
  assert.equal(payload.actorEmail, 'test.user@example.com')
})

test('getHubJwtPayloadFromRequest only accepts the hub session cookie', async () => {
  const payload = await getHubJwtPayloadFromRequest(
    {
      headers: {
        authorization: 'Bearer not-used-here'
      },
      state: {}
    },
    {
      cookieName: 'livestock_hub_jwt',
      secret: jwtConfig.secret,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience
    }
  )

  assert.equal(payload, null)
})

test('getHubServiceJwtPayloadFromRequest accepts bearer tokens for fetch-based requests', async () => {
  const bearerToken = await createSpokeAuthToken(
    {
      taxonomyId: 'status',
      spokeId: 'cattle-status',
      user: {
        sub: 'test-user',
        email: 'test.user@example.com',
        firstName: 'Test',
        lastName: 'User'
      }
    },
    jwtConfig
  )

  const payload = await getHubServiceJwtPayloadFromRequest(
    {
      headers: {
        authorization: bearerToken
      }
    },
    {
      secret: jwtConfig.secret,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
      taxonomyId: 'status',
      spokeId: 'cattle-status'
    }
  )

  assert.equal(payload.sub, 'hub-service')
  assert.equal(payload.actorEmail, 'test.user@example.com')
})

test('resolveAccessMode returns the most restrictive mode', () => {
  assert.equal(
    resolveAccessMode({
      taxonomyAccessMode: 'public',
      spokeAccessMode: 'user-session'
    }),
    'user-session'
  )
  assert.equal(
    resolveAccessMode({
      taxonomyAccessMode: 'user-session',
      spokeAccessMode: 'hub-service'
    }),
    'hub-service'
  )
  assert.equal(
    resolveAccessMode({
      taxonomyAccessMode: 'hub-service',
      spokeAccessMode: 'public'
    }),
    'hub-service'
  )
})

test('getCurrentSpokeAccessMode resolves the current status spoke to hub-service', () => {
  assert.equal(getCurrentSpokeAccessMode('status-cattle'), 'hub-service')
  assert.equal(getCurrentSpokeAccessMode('move-cattle'), 'user-session')
})

test('createSpokeGuard returns a hub-service guard for status spokes', () => {
  const guard = createSpokeGuard({
    spokeId: 'cattle-status',
    hubOrigin: 'http://localhost:3000',
    cookieName: 'livestock_hub_jwt',
    cookieOptions: getHubJwtCookieOptions({
      ttlSeconds: jwtConfig.ttlSeconds,
      isSecure: false
    }),
    assetPath: '/public',
    port: 3210,
    secret: jwtConfig.secret,
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience
  })

  assert.equal(guard.plugin.name, 'hubServiceGuard')
})

test('createSpokeGuard returns a user-session guard for move spokes', () => {
  const guard = createSpokeGuard({
    spokeId: 'cattle-move',
    hubOrigin: 'http://localhost:3000',
    cookieName: 'livestock_hub_jwt',
    cookieOptions: getHubJwtCookieOptions({
      ttlSeconds: jwtConfig.ttlSeconds,
      isSecure: false
    }),
    assetPath: '/public',
    port: 3204,
    secret: jwtConfig.secret,
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience
  })

  assert.equal(guard.plugin.name, 'authGuard')
})

test('prints the effective auth guard for each spoke', () => {
  const guardByAccessMode = {
    public: 'none',
    'user-session': 'authGuard',
    'hub-service': 'hubServiceGuard'
  }

  const rows = SPOKES.map((spoke) => ({
    spokeId: spoke.id,
    taxonomyId: spoke.taxonomy.id,
    accessMode: getCurrentSpokeAccessMode(spoke.id),
    guard: guardByAccessMode[getCurrentSpokeAccessMode(spoke.id)]
  }))

  console.table(rows)

  const statusGuards = rows
    .filter(({ taxonomyId }) => taxonomyId === 'status')
    .map(({ guard }) => guard)
  const nonStatusGuards = rows
    .filter(({ taxonomyId }) => taxonomyId !== 'status')
    .map(({ guard }) => guard)

  assert.deepEqual([...new Set(statusGuards)], ['hubServiceGuard'])
  assert.deepEqual([...new Set(nonStatusGuards)], ['authGuard'])
})
