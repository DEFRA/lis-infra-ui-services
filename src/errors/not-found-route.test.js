/** @import { Server } from '@hapi/hapi' */
import Boom from '@hapi/boom'
import hapi from '@hapi/hapi'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { csrfPlugin } from '../csrf/index.js'
import { statusCodes } from '../status-codes.js'
import { createNotFoundRoute } from './index.js'

// The shared logger's methods are getters, so it cannot be spied on.
const { logger } = vi.hoisted(() => ({
  logger: { error: vi.fn(), warn: vi.fn() }
}))

vi.mock('@defra/lis-hubs-infra-core', () => ({ logger }))

const signedIn = { 'x-test-user': 'keeper' }

let server

/**
 * A server whose default auth signs in any request carrying `x-test-user`,
 * and which reports what the request lifecycle saw on each response.
 * @returns {Server}
 */
function createServer() {
  server = hapi.server()
  server.auth.scheme('test', () => ({
    authenticate(request, h) {
      const user = request.headers['x-test-user']

      return user
        ? h.authenticated({ credentials: { user } })
        : h.unauthenticated(Boom.unauthorized(null, 'test'))
    }
  }))
  server.auth.strategy('test', 'test')
  server.auth.default('test')
  server.ext('onPreResponse', (request, h) => {
    const { response } = request

    return h
      .response({
        cookiesPolicy: request.state?.cookies_policy ?? null,
        user: request.auth.credentials?.user ?? null
      })
      .code(response.output?.statusCode ?? response.statusCode)
  })

  return server
}

describe('createNotFoundRoute()', () => {
  afterEach(async () => {
    vi.clearAllMocks()
    await server?.stop()
    server = undefined
  })

  test('answers an unrouted path with a 404 that has the cookies and the user', async () => {
    // Arrange
    createServer().route(createNotFoundRoute())
    const request = {
      method: 'GET',
      url: '/holdings/unrouted/path',
      headers: { ...signedIn, cookie: 'cookies_policy=accepted' }
    }

    // Act
    const response = await server.inject(request)

    // Assert
    expect(response.statusCode).toBe(statusCodes.notFound)
    expect(response.result).toEqual({
      cookiesPolicy: 'accepted',
      user: 'keeper'
    })
  })

  test('without the route an unrouted path has neither the cookies nor the user', async () => {
    // Arrange
    createServer()
    const request = {
      method: 'GET',
      url: '/unrouted',
      headers: { ...signedIn, cookie: 'cookies_policy=accepted' }
    }

    // Act
    const response = await server.inject(request)

    // Assert
    expect(response.statusCode).toBe(statusCodes.notFound)
    expect(response.result).toEqual({ cookiesPolicy: null, user: null })
  })

  test('leaves a routed path to its own route', async () => {
    // Arrange
    createServer().route([
      { method: 'GET', path: '/routed', handler: () => 'routed' },
      createNotFoundRoute()
    ])
    const request = { method: 'GET', url: '/routed', headers: signedIn }

    // Act
    const response = await server.inject(request)

    // Assert
    expect(response.statusCode).toBe(statusCodes.ok)
  })

  test('applies the default auth to a signed-out request when no auth is given', async () => {
    // Arrange
    createServer().route(createNotFoundRoute())
    const request = { method: 'GET', url: '/unrouted' }

    // Act
    const response = await server.inject(request)

    // Assert
    expect(response.statusCode).toBe(statusCodes.unauthorized)
  })

  test('answers a signed-out request with a 404 when auth is tried', async () => {
    // Arrange
    createServer().route(createNotFoundRoute({ auth: { mode: 'try' } }))
    const request = { method: 'GET', url: '/unrouted' }

    // Act
    const response = await server.inject(request)

    // Assert
    expect(response.statusCode).toBe(statusCodes.notFound)
    expect(response.result).toEqual({ cookiesPolicy: null, user: null })
  })

  test('signs in a request with credentials when auth is tried', async () => {
    // Arrange
    createServer().route(createNotFoundRoute({ auth: { mode: 'try' } }))
    const request = { method: 'GET', url: '/unrouted', headers: signedIn }

    // Act
    const response = await server.inject(request)

    // Assert
    expect(response.statusCode).toBe(statusCodes.notFound)
    expect(response.result).toEqual({ cookiesPolicy: null, user: 'keeper' })
  })

  test('answers an unrouted post with a 404 rather than a failed CSRF check', async () => {
    // Arrange
    createServer().route(createNotFoundRoute())
    await server.register({
      plugin: csrfPlugin,
      options: { tokenSource: 'header' }
    })
    const request = {
      method: 'POST',
      url: '/unrouted',
      headers: { ...signedIn, 'sec-fetch-site': 'cross-site' },
      payload: { field: 'value' }
    }

    // Act
    const response = await server.inject(request)

    // Assert
    expect(response.statusCode).toBe(statusCodes.notFound)
    expect(logger.warn).not.toHaveBeenCalled()
  })

  test('answers an unrouted post with a malformed body with a 404', async () => {
    // Arrange
    createServer().route(createNotFoundRoute())
    const request = {
      method: 'POST',
      url: '/unrouted',
      headers: { ...signedIn, 'content-type': 'application/json' },
      payload: '{ malformed'
    }

    // Act
    const response = await server.inject(request)

    // Assert
    expect(response.statusCode).toBe(statusCodes.notFound)
  })
})
