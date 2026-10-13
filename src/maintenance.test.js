import path from 'node:path'
import { fileURLToPath } from 'node:url'

import hapi from '@hapi/hapi'
import hapiVision from '@hapi/vision'
import nunjucks from 'nunjucks'
import { afterEach, describe, expect, test } from 'vitest'

import {
  createMaintenancePlugin,
  formatAvailableFrom,
  isAnsweredByMaintenance
} from './maintenance.js'
import { statusCodes } from './status-codes.js'

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
)
const environment = new nunjucks.Environment(
  new nunjucks.FileSystemLoader([
    path.join(packageRoot, 'src/nunjucks/routes'),
    path.join(packageRoot, 'test/fixtures/nunjucks')
  ]),
  { autoescape: true }
)

let server

async function createServer(maintenanceOptions) {
  server = hapi.server()
  await server.register({
    plugin: hapiVision,
    options: {
      engines: {
        njk: {
          compile(src) {
            const template = nunjucks.compile(src, environment)
            return (context) => template.render(context)
          }
        }
      },
      path: path.join(packageRoot, 'src/nunjucks/routes'),
      context: {
        errorPages: { contactHref: 'https://example.com/contact' }
      }
    }
  })
  await server.register(createMaintenancePlugin(maintenanceOptions))
  server.route([
    { method: 'GET', path: '/health', handler: () => ({ message: 'success' }) },
    { method: 'GET', path: '/holdings', handler: () => 'Holdings' },
    { method: 'GET', path: '/public/app.css', handler: () => 'body {}' }
  ])
  await server.initialize()

  return server
}

afterEach(async () => {
  await server?.stop()
  server = undefined
})

describe('formatAvailableFrom()', () => {
  test.each([
    ['2026-11-19T09:00', '9am on Thursday 19 November 2026'],
    ['2026-11-16T09:30', '9:30am on Monday 16 November 2026'],
    ['2026-11-16T17:05:00', '5:05pm on Monday 16 November 2026'],
    ['2026-11-16T12:00', 'midday on Monday 16 November 2026'],
    ['2026-11-16T00:00', 'midnight on Monday 16 November 2026']
  ])('formats %s as "%s"', (isoString, expected) => {
    // Arrange
    // Act
    const formatted = formatAvailableFrom(isoString)

    // Assert
    expect(formatted).toBe(expected)
  })

  test('throws on a value that is not an ISO 8601 date-time', () => {
    // Arrange
    const isoString = 'next Tuesday'

    // Act
    const act = () => formatAvailableFrom(isoString)

    // Assert
    expect(act).toThrow(
      'maintenance.availableFrom must be an ISO 8601 date-time, got "next Tuesday"'
    )
  })
})

describe('createMaintenancePlugin()', () => {
  test('answers a page request with the service unavailable page and a 503', async () => {
    // Arrange
    await createServer({ availableFrom: '2026-11-16T09:00' })

    // Act
    const response = await server.inject({ method: 'GET', url: '/holdings' })

    // Assert
    expect(response.statusCode).toBe(statusCodes.serviceUnavailable)
    expect(response.payload).toContain(
      '<title>Sorry, the service is unavailable - Livestock Information</title>'
    )
    expect(response.payload).toContain(
      'You will be able to use the service from 9am on Monday 16 November 2026.'
    )
    expect(isAnsweredByMaintenance(response.request)).toBe(true)
  })

  test('leaves the health check untouched', async () => {
    // Arrange
    await createServer({ availableFrom: '2026-11-16T09:00' })

    // Act
    const response = await server.inject({ method: 'GET', url: '/health' })

    // Assert
    expect(response.statusCode).toBe(statusCodes.ok)
    expect(response.result).toEqual({ message: 'success' })
    expect(isAnsweredByMaintenance(response.request)).toBe(false)
  })

  test('honours a custom health path', async () => {
    // Arrange
    await createServer({
      availableFrom: '2026-11-16T09:00',
      healthPath: '/holdings'
    })

    // Act
    const response = await server.inject({ method: 'GET', url: '/holdings' })

    // Assert
    expect(response.statusCode).toBe(statusCodes.ok)
  })

  test('leaves static assets untouched so the page is styled', async () => {
    // Arrange
    await createServer({ availableFrom: '2026-11-16T09:00' })

    // Act
    const response = await server.inject({
      method: 'GET',
      url: '/public/app.css'
    })

    // Assert
    expect(response.statusCode).toBe(statusCodes.ok)
  })

  test.each([[''], [undefined]])(
    'does nothing when availableFrom is %j',
    async (availableFrom) => {
      // Arrange
      await createServer({ availableFrom })

      // Act
      const response = await server.inject({ method: 'GET', url: '/holdings' })

      // Assert
      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.payload).toBe('Holdings')
    }
  )

  test('fails at start-up when availableFrom is not a date-time', () => {
    // Arrange
    const options = { availableFrom: 'soon' }

    // Act
    const act = () => createMaintenancePlugin(options)

    // Assert
    expect(act).toThrow('maintenance.availableFrom must be an ISO 8601')
  })
})
