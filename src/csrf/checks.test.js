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

describe('csrfPlugin checks', () => {
  afterEach(async () => {
    vi.clearAllMocks()
    await server?.stop()
    server = undefined
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

  describe('bodies and headers', () => {
    test.each([
      ['the token', 'hub-token', 200],
      ['another value', 'forged', 403],
      ['an object', { value: 'hub-token' }, 403]
    ])(
      'checks a JSON body whose _csrf is %s',
      async (_label, submitted, expectedStatus) => {
        // Arrange
        await createServer({ tokenSource: 'header', routes: [echoRoute()] })

        // Act
        const response = await server.inject({
          method: 'POST',
          url: '/submit',
          headers: {
            ...sameOrigin,
            'content-type': 'application/json',
            [CSRF_TOKEN_HEADER]: 'hub-token'
          },
          payload: JSON.stringify({
            [CSRF_FIELD_NAME]: submitted,
            name: 'Daisy'
          })
        })

        // Assert
        expect(response.statusCode).toBe(expectedStatus)
      }
    )

    test.each([
      ['carrying the token', 'hub-token', 200],
      ['carrying another value', 'forged', 403]
    ])(
      'checks a parsed multipart body %s',
      async (_label, submitted, expectedStatus) => {
        // Arrange
        await createServer({
          tokenSource: 'header',
          routes: [echoRoute({ payload: { multipart: { output: 'data' } } })]
        })
        const boundary = 'lis-boundary'
        const payload = [
          `--${boundary}`,
          `Content-Disposition: form-data; name="${CSRF_FIELD_NAME}"`,
          '',
          submitted,
          `--${boundary}--`,
          ''
        ].join('\r\n')

        // Act
        const response = await server.inject({
          method: 'POST',
          url: '/submit',
          headers: {
            ...sameOrigin,
            'content-type': `multipart/form-data; boundary=${boundary}`,
            [CSRF_TOKEN_HEADER]: 'hub-token'
          },
          payload
        })

        // Assert
        expect(response.statusCode).toBe(expectedStatus)
      }
    )

    test('refuses a post with a duplicated Sec-Fetch-Site header', async () => {
      // Arrange
      await createServer({ tokenSource: 'header', routes: [echoRoute()] })

      // Act
      const response = await server.inject({
        method: 'POST',
        url: '/submit',
        headers: {
          host: 'lis.test',
          'sec-fetch-site': ['same-origin', 'same-origin'],
          [CSRF_TOKEN_HEADER]: 'hub-token'
        },
        payload: { [CSRF_FIELD_NAME]: 'hub-token' }
      })

      // Assert
      expect(response.statusCode).toBe(403)
    })

    test('answers a cross-site post to an unknown path 404, as hapi runs no route lifecycle for it', async () => {
      // Arrange
      await createServer({ tokenSource: 'header', routes: [echoRoute()] })

      // Act
      const response = await server.inject({
        method: 'POST',
        url: '/unknown',
        headers: crossSite,
        payload: {}
      })

      // Assert
      expect(response.statusCode).toBe(404)
      expect(mocks.loggerWarn).not.toHaveBeenCalled()
    })
  })

  describe('auth: false routes in session mode', () => {
    test('accepts the stored token on a route that skips authentication', async () => {
      // Arrange
      await createServer({
        tokenSource: 'session',
        routes: [tokenRoute, echoRoute({ auth: false })]
      })
      const { token, cookie } = await signInAndGetToken()

      // Act
      const response = await server.inject({
        method: 'POST',
        url: '/submit',
        headers: { ...sameOrigin, cookie },
        payload: { [CSRF_FIELD_NAME]: token }
      })

      // Assert
      expect(response.statusCode).toBe(200)
    })

    test('refuses a post to such a route when the session holds no token', async () => {
      // Arrange
      await createServer({
        tokenSource: 'session',
        routes: [echoRoute({ auth: false })]
      })

      // Act
      const response = await server.inject({
        method: 'POST',
        url: '/submit',
        headers: sameOrigin,
        payload: { [CSRF_FIELD_NAME]: '' }
      })

      // Assert
      expect(response.statusCode).toBe(403)
    })
  })
})
