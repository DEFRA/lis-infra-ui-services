import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

import hapi from '@hapi/hapi'
import hapiVision from '@hapi/vision'
import nunjucks from 'nunjucks'
import { afterEach, describe, expect, test } from 'vitest'

import {
  createCookiesPlugin,
  getReturnPath,
  isSameSiteRequest,
  toSameOriginPath
} from './index.js'
import { csrfPlugin } from '../csrf/index.js'

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
)
const govukFrontendRoot = path.dirname(
  createRequire(import.meta.url).resolve('govuk-frontend/package.json')
)
const environment = new nunjucks.Environment(
  new nunjucks.FileSystemLoader([
    path.join(govukFrontendRoot, 'dist'),
    path.join(packageRoot, 'src/nunjucks/routes'),
    path.join(packageRoot, 'test/fixtures/nunjucks/layouts/..')
  ]),
  { autoescape: true }
)

const essentialCookies = [
  {
    name: 'front-office-session',
    purpose: 'Keeps you signed in',
    expires: 'After 4 hours'
  }
]

let server

async function createServer({ withCsrf = false, gtmId = null } = {}) {
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
      context: { cookiesPath: '/cookies', gtmId }
    }
  })
  server.auth.scheme('none', () => ({
    authenticate: (_request, h) => h.unauthenticated(new Error('no session'))
  }))
  server.auth.strategy('none', 'none')
  server.auth.default('none')
  if (withCsrf) {
    await server.register({
      plugin: csrfPlugin,
      options: { tokenSource: 'header' }
    })
  }
  await server.register(createCookiesPlugin({ essentialCookies }))
  await server.initialize()

  return server
}

afterEach(async () => {
  await server?.stop()
  server = undefined
})

describe('createCookiesPlugin()', () => {
  test('throws without essential cookies to list', () => {
    // Arrange
    // Act
    const act = () => createCookiesPlugin({})

    // Assert
    expect(act).toThrow('createCookiesPlugin requires essentialCookies')
  })

  test('GET /cookies lists the essential cookies with analytics unchecked by default', async () => {
    // Arrange
    await createServer({ gtmId: 'GTM-ABC1234' })

    // Act
    const response = await server.inject({ method: 'GET', url: '/cookies' })

    // Assert
    expect(response.statusCode).toBe(200)
    expect(response.result).toContain(
      '<h1 class="govuk-heading-l">Cookies</h1>'
    )
    expect(response.result).toContain('front-office-session')
    expect(response.result).toContain('Keeps you signed in')
    expect(response.result).toMatch(/value="no"[^>]*checked/)
    expect(response.result).not.toContain('govuk-notification-banner')
  })

  test('GET /cookies has no analytics section when the hub has no Google Tag Manager container', async () => {
    // Arrange
    await createServer()

    // Act
    const response = await server.inject({ method: 'GET', url: '/cookies' })

    // Assert
    expect(response.statusCode).toBe(200)
    expect(response.result).toContain('front-office-session')
    expect(response.result).not.toContain('Analytics cookies (optional)')
    expect(response.result).not.toContain('Google Analytics')
    expect(response.result).not.toContain('_ga')
    expect(response.result).not.toContain('name="analytics"')
  })

  test('GET /cookies lists the Google Analytics cookies when the hub has a Google Tag Manager container', async () => {
    // Arrange
    await createServer({ gtmId: 'GTM-ABC1234' })

    // Act
    const response = await server.inject({ method: 'GET', url: '/cookies' })

    // Assert
    expect(response.result).toContain('We use Google Analytics to do this.')
    expect(response.result).toMatch(
      /<td class="govuk-table__cell">\s*_ga\s*<\/td>/
    )
    expect(response.result).toContain('Names starting _ga_')
    expect(response.result).toContain(
      'If you choose not to accept analytics cookies, we remove any that have already been set.'
    )
    expect(response.result).toContain('Analytics cookies (optional)')
    expect(response.result).toMatch(/value="no"[^>]*checked/)
  })

  test('GET /cookies reflects an accepted policy from the cookie', async () => {
    // Arrange
    await createServer({ gtmId: 'GTM-ABC1234' })

    // Act
    const response = await server.inject({
      method: 'GET',
      url: '/cookies',
      headers: {
        cookie:
          'cookies_policy=%7B%22essential%22%3Atrue%2C%22analytics%22%3Atrue%7D'
      }
    })

    // Assert
    expect(response.result).toMatch(/value="yes"[^>]*checked/)
  })

  test('GET /cookies?saved=true shows the confirmation with a same-origin return link', async () => {
    // Arrange
    await createServer()

    // Act
    const response = await server.inject({
      method: 'GET',
      url: '/cookies?saved=true&returnPath=%2Fcattle%2Fhome%3Fcph%3D1'
    })

    // Assert
    expect(response.result).toContain('You’ve set your cookie preferences.')
    expect(response.result).toContain('href="/cattle/home?cph=1"')
  })

  test('GET /cookies?saved=true falls back to the root for a foreign return path', async () => {
    // Arrange
    await createServer()

    // Act
    const response = await server.inject({
      method: 'GET',
      url: '/cookies?saved=true&returnPath=//evil.example/x'
    })

    // Assert
    expect(response.result).toContain('href="/"')
  })

  test('POST /cookies records acceptance and redirects to the confirmation', async () => {
    // Arrange
    await createServer()

    // Act
    const response = await server.inject({
      method: 'POST',
      url: '/cookies',
      headers: {
        host: 'lis.test',
        referer: 'https://lis.test/cattle/home',
        'sec-fetch-site': 'same-origin'
      },
      payload: { analytics: 'yes' }
    })

    // Assert
    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(
      '/cookies?saved=true&returnPath=%2Fcattle%2Fhome'
    )
    const setCookie = response.headers['set-cookie'][0]
    expect(setCookie).toContain(
      'cookies_policy=%7B%22essential%22%3Atrue%2C%22analytics%22%3Atrue%7D'
    )
    expect(setCookie).toContain('Secure')
    expect(setCookie).toContain('SameSite=Lax')
    expect(setCookie).toContain('Path=/')
    expect(setCookie).not.toContain('HttpOnly')
  })

  test('POST /cookies records refusal', async () => {
    // Arrange
    await createServer()

    // Act
    const response = await server.inject({
      method: 'POST',
      url: '/cookies',
      headers: { 'sec-fetch-site': 'same-origin' },
      payload: { analytics: 'no' }
    })

    // Assert
    expect(response.headers['set-cookie'][0]).toContain(
      'cookies_policy=%7B%22essential%22%3Atrue%2C%22analytics%22%3Afalse%7D'
    )
    expect(response.headers.location).toBe('/cookies?saved=true&returnPath=%2F')
  })

  test('POST /cookies removes the Google Analytics cookies on refusal', async () => {
    // Arrange
    await createServer()

    // Act
    const response = await server.inject({
      method: 'POST',
      url: '/cookies',
      headers: {
        'sec-fetch-site': 'same-origin',
        host: 'front-office.lis.defra',
        cookie: '_ga=GA1.1.1; _ga_ABC123=GS1.1.1; front-office-session=abc'
      },
      payload: { analytics: 'no' }
    })

    // Assert
    const expired = 'Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/'
    const setCookies = response.headers['set-cookie']
    expect(setCookies).toHaveLength(7)
    expect(setCookies).toEqual(
      expect.arrayContaining([
        expect.stringContaining('cookies_policy=%7B%22essential'),
        `_ga=; ${expired}`,
        `_ga=; ${expired}; Domain=front-office.lis.defra`,
        `_ga=; ${expired}; Domain=lis.defra`,
        `_ga_ABC123=; ${expired}`,
        `_ga_ABC123=; ${expired}; Domain=front-office.lis.defra`,
        `_ga_ABC123=; ${expired}; Domain=lis.defra`
      ])
    )
  })

  test('POST /cookies keeps the Google Analytics cookies on acceptance', async () => {
    // Arrange
    await createServer()

    // Act
    const response = await server.inject({
      method: 'POST',
      url: '/cookies',
      headers: {
        'sec-fetch-site': 'same-origin',
        host: 'front-office.lis.defra',
        cookie: '_ga=GA1.1.1'
      },
      payload: { analytics: 'yes' }
    })

    // Assert
    expect(response.headers['set-cookie']).toHaveLength(1)
    expect(response.headers['set-cookie'][0]).toContain('cookies_policy=')
  })

  test('POST /cookies with an invalid choice sets nothing and returns to the page', async () => {
    // Arrange
    await createServer()

    // Act
    const response = await server.inject({
      method: 'POST',
      url: '/cookies',
      headers: { 'sec-fetch-site': 'same-origin' },
      payload: { analytics: 'maybe' }
    })

    // Assert
    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe('/cookies')
    expect(response.headers['set-cookie']).toBeUndefined()
  })
})

describe('toSameOriginPath()', () => {
  test.each([
    ['/holdings', '/holdings'],
    ['/a?b=c', '/a?b=c'],
    ['//evil.example', '/'],
    ['/\\evil.example/x', '/'],
    ['/a/../..//evil.example', '/'],
    ['https://evil.example/', '/'],
    ['holdings', '/'],
    [undefined, '/']
  ])('maps %s to %s', (candidate, expected) => {
    // Arrange
    // Act
    const actual = toSameOriginPath(candidate)

    // Assert
    expect(actual).toBe(expected)
  })
})

describe('getReturnPath()', () => {
  test.each([
    ['no referer', {}, '/'],
    [
      'same-host referer',
      { referer: 'https://lis.test/cattle?x=1' },
      '/cattle?x=1'
    ],
    [
      'a forwarded host',
      {
        host: 'internal:3001',
        'x-forwarded-host': 'lis.test',
        referer: 'https://lis.test/cattle'
      },
      '/cattle'
    ],
    ['cross-host referer', { referer: 'https://evil.example/cattle' }, '/'],
    ['the cookies page itself', { referer: 'https://lis.test/cookies' }, '/'],
    [
      'the cookies page with a query',
      { referer: 'https://lis.test/cookies?saved=true' },
      '/'
    ],
    ['an unparseable referer', { referer: 'not a url' }, '/']
  ])('handles %s', (_label, headers, expected) => {
    // Arrange
    const request = { headers: { host: 'lis.test', ...headers } }

    // Act
    const actual = getReturnPath(request)

    // Assert
    expect(actual).toBe(expected)
  })
})

describe('isSameSiteRequest()', () => {
  test.each([
    ['sec-fetch-site same-origin', { 'sec-fetch-site': 'same-origin' }, true],
    ['sec-fetch-site same-site', { 'sec-fetch-site': 'same-site' }, false],
    ['sec-fetch-site cross-site', { 'sec-fetch-site': 'cross-site' }, false],
    ['sec-fetch-site none', { 'sec-fetch-site': 'none' }, false],
    ['no signals at all', {}, false],
    ['matching origin', { origin: 'https://lis.test' }, true],
    ['foreign origin', { origin: 'https://evil.example' }, false],
    ['unparseable origin', { origin: 'not a url' }, false],
    [
      'origin matching the forwarded host',
      {
        host: 'internal:3001',
        'x-forwarded-host': 'lis.test',
        origin: 'https://lis.test'
      },
      true
    ]
  ])('handles %s', (_label, headers, expected) => {
    // Arrange
    const request = { headers: { host: 'lis.test', ...headers } }

    // Act
    const actual = isSameSiteRequest(request)

    // Assert
    expect(actual).toBe(expected)
  })
})

describe('POST /cookies from another site', () => {
  test.each([
    ['sec-fetch-site cross-site', { 'sec-fetch-site': 'cross-site' }],
    ['sec-fetch-site same-site', { 'sec-fetch-site': 'same-site' }],
    ['a foreign origin', { origin: 'https://evil.example' }],
    ['neither sec-fetch-site nor origin', {}]
  ])('ignores a consent POST with %s', async (_label, headers) => {
    // Arrange
    await createServer()

    // Act
    const response = await server.inject({
      method: 'POST',
      url: '/cookies',
      headers,
      payload: { analytics: 'yes' }
    })

    // Assert
    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe('/cookies')
    expect(response.headers['set-cookie']).toBeUndefined()
  })
})

describe('POST /cookies with the CSRF plugin registered', () => {
  test('records a signed-out same-origin choice without a token', async () => {
    // Arrange
    await createServer({ withCsrf: true })

    // Act
    const response = await server.inject({
      method: 'POST',
      url: '/cookies',
      headers: { 'sec-fetch-site': 'same-origin' },
      payload: { analytics: 'yes' }
    })

    // Assert
    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe('/cookies?saved=true&returnPath=%2F')
  })

  test('still returns a cross-site post to the page rather than a 403', async () => {
    // Arrange
    await createServer({ withCsrf: true })

    // Act
    const response = await server.inject({
      method: 'POST',
      url: '/cookies',
      headers: { 'sec-fetch-site': 'cross-site' },
      payload: { analytics: 'yes' }
    })

    // Assert
    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe('/cookies')
    expect(response.headers['set-cookie']).toBeUndefined()
  })
})
