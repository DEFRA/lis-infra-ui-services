import { describe, expect, test } from 'vitest'

import {
  createCookiesPolicy,
  getCookiesPolicy,
  parseCookiesPolicy,
  serialiseCookiesPolicy
} from './cookies-policy.js'

describe('createCookiesPolicy()', () => {
  test('always keeps essential cookies on', () => {
    // Arrange
    // Act
    const policy = createCookiesPolicy(false)

    // Assert
    expect(policy).toEqual({ essential: true, analytics: false })
  })

  test('treats anything but true as refusing analytics', () => {
    // Arrange
    // Act
    const policy = createCookiesPolicy('yes')

    // Assert
    expect(policy.analytics).toBe(false)
  })
})

describe('serialiseCookiesPolicy()', () => {
  test('URL-encodes the policy as JSON', () => {
    // Arrange
    const policy = { essential: true, analytics: true }

    // Act
    const value = serialiseCookiesPolicy(policy)

    // Assert
    expect(value).toBe('%7B%22essential%22%3Atrue%2C%22analytics%22%3Atrue%7D')
  })
})

describe('parseCookiesPolicy()', () => {
  test('round-trips a serialised policy', () => {
    // Arrange
    const value = serialiseCookiesPolicy(createCookiesPolicy(true))

    // Act
    const policy = parseCookiesPolicy(value)

    // Assert
    expect(policy).toEqual({ essential: true, analytics: true })
  })

  test.each([
    ['undefined', undefined],
    ['empty', ''],
    ['not JSON', 'yes'],
    ['bad encoding', '%E0%A4%A'],
    ['missing analytics', '%7B%22essential%22%3Atrue%7D'],
    ['analytics not boolean', '%7B%22analytics%22%3A%22yes%22%7D']
  ])('returns null for a %s value', (_label, value) => {
    // Arrange
    // Act
    const policy = parseCookiesPolicy(value)

    // Assert
    expect(policy).toBeNull()
  })
})

describe('getCookiesPolicy()', () => {
  test('reads the cookies_policy cookie from request state', () => {
    // Arrange
    const request = {
      state: {
        cookies_policy: serialiseCookiesPolicy(createCookiesPolicy(false))
      }
    }

    // Act
    const policy = getCookiesPolicy(request)

    // Assert
    expect(policy).toEqual({ essential: true, analytics: false })
  })

  test('returns null without a request', () => {
    // Arrange
    // Act
    const policy = getCookiesPolicy(undefined)

    // Assert
    expect(policy).toBeNull()
  })
})
