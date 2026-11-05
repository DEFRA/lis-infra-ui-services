import { randomBytes } from 'node:crypto'

import Boom from '@hapi/boom'
import hapi from '@hapi/hapi'
import yar from '@hapi/yar'
import Joi from 'joi'
import { afterEach, describe, expect, test, vi } from 'vitest'

import {
  CSRF_FIELD_NAME,
  CSRF_PLUGIN_NAME,
  CSRF_TOKEN_HEADER,
  clearCsrfToken,
  csrfPlugin
} from './index.js'

// The shared logger's methods are getters, so it cannot be spied on.
const { logger } = vi.hoisted(() => ({ logger: { warn: vi.fn() } }))

vi.mock('@defra/lis-hubs-infra-core', () => ({ logger }))

const mocks = {
  loggerWarn: logger.warn
}

const sameOrigin = { host: 'lis.test', 'sec-fetch-site': 'same-origin' }
const formEncoded = { 'content-type': 'application/x-www-form-urlencoded' }
const crossSite = { host: 'lis.test', 'sec-fetch-site': 'cross-site' }
const signedIn = { 'x-test-user': 'keeper' }

const tokenRoute = {
  method: 'GET',
  path: '/token',
  handler: (request) => ({
    token: request.plugins[CSRF_PLUGIN_NAME].token ?? null
  })
}

function echoRoute(options = {}) {
  return {
    method: 'POST',
    path: '/submit',
    options,
    handler: (request) => request.payload ?? { streamed: true }
  }
}

let server

async function createServer({ tokenSource, routes }) {
  server = hapi.server()
  server.validator(Joi)
  await server.register({
    plugin: yar,
    options: {
      storeBlank: false,
      maxCookieSize: 0,
      cookieOptions: {
        password: randomBytes(32).toString('hex'),
        isSecure: false
      }
    }
  })
  server.auth.scheme('test', () => ({
    authenticate: (request, h) =>
      request.headers['x-test-user']
        ? h.authenticated({ credentials: { user: { id: 'keeper' } } })
        : h.unauthenticated(Boom.unauthorized())
  }))
  server.auth.strategy('test', 'test')
  server.auth.default({ strategy: 'test', mode: 'try' })
  await server.register({ plugin: csrfPlugin, options: { tokenSource } })
  server.route(routes)
  await server.initialize()
}

async function signInAndGetToken() {
  const response = await server.inject({
    method: 'GET',
    url: '/token',
    headers: signedIn
  })

  return {
    token: response.result.token,
    cookie: response.headers['set-cookie'][0].split(';')[0]
  }
}

describe('csrfPlugin', () => {
  afterEach(async () => {
    vi.clearAllMocks()
    await server?.stop()
    server = undefined
  })

  describe('registration', () => {
    test.each([undefined, 'cookie', 'constructor'])(
      'refuses tokenSource %s',
      async (tokenSource) => {
        // Arrange
        let error

        // Act
        try {
          await createServer({ tokenSource, routes: [tokenRoute] })
        } catch (e) {
          error = e
        }

        // Assert
        expect(error.message).toBe(
          "lis-csrf tokenSource must be 'session' or 'header'"
        )
      }
    )

    test('requires yar in session mode', async () => {
      // Arrange
      server = hapi.server()
      await server.register({
        plugin: csrfPlugin,
        options: { tokenSource: 'session' }
      })
      let error

      // Act
      try {
        await server.initialize()
      } catch (e) {
        error = e
      }

      // Assert
      expect(error.message).toContain('@hapi/yar')
    })
  })

  describe('session token', () => {
    test('issues a 32-byte base64url token to a signed-in session', async () => {
      // Arrange
      await createServer({ tokenSource: 'session', routes: [tokenRoute] })

      // Act
      const response = await server.inject({
        method: 'GET',
        url: '/token',
        headers: signedIn
      })

      // Assert
      expect(response.result.token).toMatch(/^[\w-]{43}$/)
      expect(response.headers['set-cookie']).toBeDefined()
    })

    test('reuses the session token on later requests', async () => {
      // Arrange
      await createServer({ tokenSource: 'session', routes: [tokenRoute] })
      const { token, cookie } = await signInAndGetToken()

      // Act
      const response = await server.inject({
        method: 'GET',
        url: '/token',
        headers: { ...signedIn, cookie }
      })

      // Assert
      expect(response.result.token).toBe(token)
    })

    test('gives an anonymous visitor no token and no session', async () => {
      // Arrange
      await createServer({ tokenSource: 'session', routes: [tokenRoute] })

      // Act
      const response = await server.inject({ method: 'GET', url: '/token' })

      // Assert
      expect(response.result.token).toBeNull()
      expect(response.headers['set-cookie']).toBeUndefined()
    })

    test('accepts a same-origin post carrying the session token', async () => {
      // Arrange
      await createServer({
        tokenSource: 'session',
        routes: [tokenRoute, echoRoute()]
      })
      const { token, cookie } = await signInAndGetToken()

      // Act
      const response = await server.inject({
        method: 'POST',
        url: '/submit',
        headers: { ...signedIn, ...sameOrigin, cookie },
        payload: { [CSRF_FIELD_NAME]: token, name: 'Daisy' }
      })

      // Assert
      expect(response.statusCode).toBe(200)
      expect(response.result).toEqual({ name: 'Daisy' })
    })

    test('issues a new token once the old one is cleared', async () => {
      // Arrange
      await createServer({
        tokenSource: 'session',
        routes: [
          tokenRoute,
          {
            method: 'GET',
            path: '/clear',
            handler(request) {
              clearCsrfToken(request)
              return { token: request.plugins[CSRF_PLUGIN_NAME].token ?? null }
            }
          }
        ]
      })
      const { token, cookie } = await signInAndGetToken()

      // Act
      const cleared = await server.inject({
        method: 'GET',
        url: '/clear',
        headers: { ...signedIn, cookie }
      })
      const reissued = await server.inject({
        method: 'GET',
        url: '/token',
        headers: { ...signedIn, cookie }
      })

      // Assert
      expect(cleared.result.token).toBeNull()
      expect(reissued.result.token).toMatch(/^[\w-]{43}$/)
      expect(reissued.result.token).not.toBe(token)
    })
  })

  describe('header token', () => {
    test('publishes the token from the hub header', async () => {
      // Arrange
      await createServer({ tokenSource: 'header', routes: [tokenRoute] })

      // Act
      const response = await server.inject({
        method: 'GET',
        url: '/token',
        headers: { [CSRF_TOKEN_HEADER]: 'hub-token' }
      })

      // Assert
      expect(response.result.token).toBe('hub-token')
    })

    test.each([
      ['a matching token', 'hub-token', 'hub-token', 200],
      ['a different token of the same length', 'hub-token', 'bad-token', 403],
      ['a shorter token', 'hub-token', 'hub', 403],
      ['a longer token', 'hub-token', 'hub-token-and-more', 403],
      ['no submitted token', 'hub-token', undefined, 403],
      ['two submitted tokens', 'hub-token', ['hub-token', 'hub-token'], 403],
      ['no hub token', undefined, 'hub-token', 403],
      ['two empty tokens', '', '', 403]
    ])(
      'answers a same-origin post with %s',
      async (_label, headerToken, submitted, expectedStatus) => {
        // Arrange
        await createServer({ tokenSource: 'header', routes: [echoRoute()] })
        const headers = {
          ...sameOrigin,
          ...(headerToken !== undefined && { [CSRF_TOKEN_HEADER]: headerToken })
        }

        // Act
        const response = await server.inject({
          method: 'POST',
          url: '/submit',
          headers,
          payload: { [CSRF_FIELD_NAME]: submitted, name: 'Daisy' }
        })

        // Assert
        expect(response.statusCode).toBe(expectedStatus)
      }
    )
  })

  describe('rejection', () => {
    test('refuses a cross-site post with a 403 and logs the origin check', async () => {
      // Arrange
      await createServer({ tokenSource: 'header', routes: [echoRoute()] })

      // Act
      const response = await server.inject({
        method: 'POST',
        url: '/submit',
        headers: { ...crossSite, [CSRF_TOKEN_HEADER]: 'hub-token' },
        payload: { [CSRF_FIELD_NAME]: 'hub-token' }
      })

      // Assert
      expect(response.statusCode).toBe(403)
      expect(mocks.loggerWarn).toHaveBeenCalledWith(
        {
          http: { request: { method: 'post' } },
          url: { path: '/submit' },
          event: { reason: 'csrf-origin' }
        },
        'CSRF origin check failed'
      )
    })

    test('logs the token check without either token value', async () => {
      // Arrange
      await createServer({ tokenSource: 'header', routes: [echoRoute()] })

      // Act
      const response = await server.inject({
        method: 'POST',
        url: '/submit',
        headers: { ...sameOrigin, [CSRF_TOKEN_HEADER]: 'hub-token' },
        payload: { [CSRF_FIELD_NAME]: 'forged-token' }
      })

      // Assert
      expect(response.statusCode).toBe(403)
      const logged = JSON.stringify(mocks.loggerWarn.mock.calls)
      expect(logged).toContain('CSRF token check failed')
      expect(logged).not.toContain('hub-token')
      expect(logged).not.toContain('forged-token')
    })

    test.each(['PUT', 'PATCH', 'DELETE'])(
      'checks a %s request',
      async (method) => {
        // Arrange
        await createServer({
          tokenSource: 'header',
          routes: [{ method, path: '/submit', handler: () => 'done' }]
        })

        // Act
        const response = await server.inject({
          method,
          url: '/submit',
          headers: crossSite
        })

        // Assert
        expect(response.statusCode).toBe(403)
      }
    )

    test.each([
      ['GET', 'GET'],
      ['HEAD', 'GET'],
      ['OPTIONS', 'OPTIONS']
    ])('lets a cross-site %s through', async (method, routeMethod) => {
      // Arrange
      await createServer({
        tokenSource: 'header',
        routes: [{ method: routeMethod, path: '/page', handler: () => 'page' }]
      })

      // Act
      const response = await server.inject({
        method,
        url: '/page',
        headers: crossSite
      })

      // Assert
      expect(response.statusCode).toBe(200)
    })
  })

  describe('payload handling', () => {
    test('strips the token before Joi payload validation and the handler', async () => {
      // Arrange
      await createServer({
        tokenSource: 'header',
        routes: [
          echoRoute({
            validate: {
              payload: Joi.object({ name: Joi.string().required() })
            }
          })
        ]
      })

      // Act
      const response = await server.inject({
        method: 'POST',
        url: '/submit',
        headers: {
          ...sameOrigin,
          ...formEncoded,
          [CSRF_TOKEN_HEADER]: 'hub-token'
        },
        payload: `${CSRF_FIELD_NAME}=hub-token&name=Daisy`
      })

      // Assert
      expect(response.statusCode).toBe(200)
      expect(response.result).toEqual({ name: 'Daisy' })
    })

    test('refuses a streamed body unless the route opts out of the token check', async () => {
      // Arrange
      await createServer({
        tokenSource: 'header',
        routes: [echoRoute({ payload: { output: 'stream', parse: false } })]
      })

      // Act
      const response = await server.inject({
        method: 'POST',
        url: '/submit',
        headers: {
          ...sameOrigin,
          ...formEncoded,
          [CSRF_TOKEN_HEADER]: 'hub-token'
        },
        payload: `${CSRF_FIELD_NAME}=hub-token`
      })

      // Assert
      expect(response.statusCode).toBe(403)
    })
  })

  describe('route opt-outs', () => {
    test.each([
      ['false', false],
      ['enabled: false', { enabled: false }]
    ])('skips every check for %s', async (_label, setting) => {
      // Arrange
      await createServer({
        tokenSource: 'header',
        routes: [echoRoute({ plugins: { [CSRF_PLUGIN_NAME]: setting } })]
      })

      // Act
      const response = await server.inject({
        method: 'POST',
        url: '/submit',
        headers: crossSite,
        payload: { name: 'Daisy' }
      })

      // Assert
      expect(response.statusCode).toBe(200)
    })

    test.each([
      ['a same-origin parsed body', sameOrigin, {}, 200],
      ['a cross-site parsed body', crossSite, {}, 403],
      [
        'a same-origin streamed body',
        sameOrigin,
        { payload: { output: 'stream', parse: false } },
        200
      ],
      [
        'a cross-site streamed body',
        crossSite,
        { payload: { output: 'stream', parse: false } },
        403
      ]
    ])(
      'keeps only the origin check for token: false, given %s',
      async (_label, headers, routeOptions, expectedStatus) => {
        // Arrange
        await createServer({
          tokenSource: 'header',
          routes: [
            echoRoute({
              ...routeOptions,
              plugins: { [CSRF_PLUGIN_NAME]: { token: false } }
            })
          ]
        })

        // Act
        const response = await server.inject({
          method: 'POST',
          url: '/submit',
          headers: { ...headers, ...formEncoded },
          payload: 'name=Daisy'
        })

        // Assert
        expect(response.statusCode).toBe(expectedStatus)
      }
    )
  })
})
