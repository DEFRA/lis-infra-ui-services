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

const sameOrigin = { host: 'lis.test', 'sec-fetch-site': 'same-origin' }
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
})
