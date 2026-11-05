import Boom from '@hapi/boom'
import hapi from '@hapi/hapi'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { CSRF_FIELD_NAME, CSRF_TOKEN_HEADER, csrfPlugin } from './index.js'

// The shared logger's methods are getters, so it cannot be spied on.
const { logger } = vi.hoisted(() => ({ logger: { warn: vi.fn() } }))

vi.mock('@defra/lis-hubs-infra-core', () => ({ logger }))

const mocks = {
  loggerWarn: logger.warn
}

const sameOrigin = { host: 'lis.test', 'sec-fetch-site': 'same-origin' }
const crossSite = { host: 'lis.test', 'sec-fetch-site': 'cross-site' }

let server

async function createServer(failAction) {
  server = hapi.server()
  await server.register({
    plugin: csrfPlugin,
    options: { tokenSource: 'header' }
  })
  server.route({
    method: 'POST',
    path: '/submit',
    options: { plugins: { 'lis-csrf': { failAction } } },
    handler: () => 'handled'
  })
  await server.initialize()
}

describe('csrfPlugin failAction', () => {
  afterEach(async () => {
    vi.clearAllMocks()
    await server?.stop()
    server = undefined
  })

  test('answers a failed origin check with the route failAction after logging it', async () => {
    // Arrange
    const failAction = vi.fn((_request, h) => h.redirect('/'))
    await createServer(failAction)

    // Act
    const response = await server.inject({
      method: 'POST',
      url: '/submit',
      headers: { ...crossSite, [CSRF_TOKEN_HEADER]: 'hub-token' },
      payload: { [CSRF_FIELD_NAME]: 'hub-token' }
    })

    // Assert
    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe('/')
    expect(failAction).toHaveBeenCalledTimes(1)
    expect(mocks.loggerWarn).toHaveBeenCalledWith(
      expect.objectContaining({ event: { reason: 'csrf-origin' } }),
      'CSRF origin check failed'
    )
  })

  test('answers a failed token check with the route failAction after logging it', async () => {
    // Arrange
    const failAction = vi.fn((_request, h) => h.redirect('/'))
    await createServer(failAction)

    // Act
    const response = await server.inject({
      method: 'POST',
      url: '/submit',
      headers: sameOrigin,
      payload: { [CSRF_FIELD_NAME]: 'forged' }
    })

    // Assert
    expect(response.statusCode).toBe(302)
    expect(response.payload).not.toBe('handled')
    expect(mocks.loggerWarn).toHaveBeenCalledWith(
      expect.objectContaining({ event: { reason: 'csrf-token' } }),
      'CSRF token check failed'
    )
  })

  test('passes on an error the failAction returns', async () => {
    // Arrange
    await createServer(() => Boom.badRequest())

    // Act
    const response = await server.inject({
      method: 'POST',
      url: '/submit',
      headers: crossSite,
      payload: {}
    })

    // Assert
    expect(response.statusCode).toBe(400)
  })

  test('still refuses with a 403 when the failAction continues', async () => {
    // Arrange
    await createServer((_request, h) => h.continue)

    // Act
    const response = await server.inject({
      method: 'POST',
      url: '/submit',
      headers: crossSite,
      payload: {}
    })

    // Assert
    expect(response.statusCode).toBe(403)
    expect(response.payload).not.toBe('handled')
  })

  test('does not call the failAction when the checks pass', async () => {
    // Arrange
    const failAction = vi.fn()
    await createServer(failAction)

    // Act
    const response = await server.inject({
      method: 'POST',
      url: '/submit',
      headers: { ...sameOrigin, [CSRF_TOKEN_HEADER]: 'hub-token' },
      payload: { [CSRF_FIELD_NAME]: 'hub-token' }
    })

    // Assert
    expect(response.statusCode).toBe(200)
    expect(response.payload).toBe('handled')
    expect(failAction).not.toHaveBeenCalled()
  })

  test('refuses with a 403 when failAction is not a function', async () => {
    // Arrange
    await createServer('/')

    // Act
    const response = await server.inject({
      method: 'POST',
      url: '/submit',
      headers: crossSite,
      payload: {}
    })

    // Assert
    expect(response.statusCode).toBe(403)
  })
})
