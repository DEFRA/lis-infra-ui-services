import { describe, expect, test } from 'vitest'

import { expireAnalyticsCookies } from './analytics-cookies.js'

const EXPIRED = 'Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/'

describe('expireAnalyticsCookies()', () => {
  test('expires each Google Analytics cookie for the host and every parent domain', () => {
    // Arrange
    const request = {
      headers: { host: 'front-office.lis.defra' },
      state: { _ga: 'GA1.1.1', _ga_ABC123: 'GS1.1.1' }
    }

    // Act
    const headers = expireAnalyticsCookies(request)

    // Assert
    expect(headers).toEqual([
      `_ga=; ${EXPIRED}`,
      `_ga=; ${EXPIRED}; Domain=front-office.lis.defra`,
      `_ga=; ${EXPIRED}; Domain=lis.defra`,
      `_ga_ABC123=; ${EXPIRED}`,
      `_ga_ABC123=; ${EXPIRED}; Domain=front-office.lis.defra`,
      `_ga_ABC123=; ${EXPIRED}; Domain=lis.defra`
    ])
  })

  test.each(['_gid', '_gat', '_gat_UA123'])(
    'expires the older %s cookie',
    (name) => {
      // Arrange
      const request = {
        headers: { host: 'lis.defra' },
        state: { [name]: '1' }
      }

      // Act
      const headers = expireAnalyticsCookies(request)

      // Assert
      expect(headers).toEqual([
        `${name}=; ${EXPIRED}`,
        `${name}=; ${EXPIRED}; Domain=lis.defra`
      ])
    }
  )

  test('leaves every other cookie alone', () => {
    // Arrange
    const request = {
      headers: { host: 'front-office.lis.defra' },
      state: {
        'front-office-session': 'abc',
        cookies_policy: 'policy',
        _gax: '1',
        my_ga: '1',
        '_ga; Domain=evil.test': '1'
      }
    }

    // Act
    const headers = expireAnalyticsCookies(request)

    // Assert
    expect(headers).toEqual([])
  })

  test('uses the host the hub was called on, without its port', () => {
    // Arrange
    const request = {
      headers: {
        'x-forwarded-host': 'Front-Office.lis.defra:8443, proxy.internal',
        host: 'internal:3000'
      },
      state: { _ga: 'GA1.1.1' }
    }

    // Act
    const headers = expireAnalyticsCookies(request)

    // Assert
    expect(headers).toEqual([
      `_ga=; ${EXPIRED}`,
      `_ga=; ${EXPIRED}; Domain=front-office.lis.defra`,
      `_ga=; ${EXPIRED}; Domain=lis.defra`
    ])
  })

  test.each([
    ['a single-label host', { host: 'localhost:3000' }],
    ['no host', {}],
    ['a host that is not a hostname', { host: 'evil.test\r\nx: y' }]
  ])('expires the cookie for the host alone given %s', (_case, headers) => {
    // Arrange
    const request = { headers, state: { _ga: 'GA1.1.1' } }

    // Act
    const actual = expireAnalyticsCookies(request)

    // Assert
    expect(actual).toEqual([`_ga=; ${EXPIRED}`])
  })

  test('returns nothing when the request carries no cookies', () => {
    // Arrange
    const request = { headers: { host: 'front-office.lis.defra' } }

    // Act
    const headers = expireAnalyticsCookies(request)

    // Assert
    expect(headers).toEqual([])
  })
})
