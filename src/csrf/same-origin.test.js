import { describe, expect, test } from 'vitest'

import { getRequestHost, isSameOriginRequest } from './same-origin.js'

describe('isSameOriginRequest()', () => {
  test.each([
    ['sec-fetch-site same-origin', { 'sec-fetch-site': 'same-origin' }, true],
    ['sec-fetch-site same-site', { 'sec-fetch-site': 'same-site' }, false],
    ['sec-fetch-site cross-site', { 'sec-fetch-site': 'cross-site' }, false],
    ['sec-fetch-site none', { 'sec-fetch-site': 'none' }, false],
    [
      'sec-fetch-site same-site with a matching origin',
      { 'sec-fetch-site': 'same-site', origin: 'https://lis.test' },
      false
    ],
    ['no signals at all', {}, false],
    ['an empty origin', { origin: '' }, false],
    ['matching origin', { origin: 'https://lis.test' }, true],
    ['foreign origin', { origin: 'https://evil.example' }, false],
    ['sibling subdomain origin', { origin: 'https://other.lis.test' }, false],
    ['opaque origin', { origin: 'null' }, false],
    ['unparseable origin', { origin: 'not a url' }, false],
    [
      'origin matching the forwarded host',
      {
        host: 'internal:3001',
        'x-forwarded-host': 'lis.test',
        origin: 'https://lis.test'
      },
      true
    ],
    [
      'origin matching only the internal host behind a proxy',
      {
        host: 'internal:3001',
        'x-forwarded-host': 'lis.test',
        origin: 'https://internal:3001'
      },
      false
    ]
  ])('handles %s', (_label, headers, expected) => {
    // Arrange
    const request = { headers: { host: 'lis.test', ...headers } }

    // Act
    const actual = isSameOriginRequest(request)

    // Assert
    expect(actual).toBe(expected)
  })
})

describe('getRequestHost()', () => {
  test.each([
    ['the host header', { host: 'lis.test' }, 'lis.test'],
    [
      'the first forwarded host',
      { host: 'internal:3001', 'x-forwarded-host': 'lis.test, proxy.test' },
      'lis.test'
    ],
    ['nothing when neither is sent', {}, '']
  ])('returns %s', (_label, headers, expected) => {
    // Arrange
    const request = { headers }

    // Act
    const actual = getRequestHost(request)

    // Assert
    expect(actual).toBe(expected)
  })
})
