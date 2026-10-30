import { describe, expect, test } from 'vitest'
import convict from 'convict'

import {
  duration,
  parseIsoDuration,
  positiveInteger,
  secret
} from './config-formats.js'

convict.addFormat(positiveInteger)
convict.addFormat(secret)

function createConfig(value) {
  return convict({
    timeout: {
      format: 'positive-integer',
      default: 5000,
      env: 'TEST_TIMEOUT'
    }
  }).load({ timeout: value })
}

describe('positiveInteger', () => {
  test('is registered as the positive-integer format', () => {
    // Assert
    expect(positiveInteger.name).toBe('positive-integer')
  })

  test.each([1, 30000])('accepts %s', (value) => {
    // Act
    let error
    try {
      createConfig(value).validate({ allowed: 'strict' })
    } catch (e) {
      error = e
    }

    // Assert
    expect(error).toBeUndefined()
  })

  test('coerces a numeric string from an environment variable', () => {
    // Arrange
    process.env.TEST_TIMEOUT = '2500'

    // Act
    let config, error
    try {
      config = convict({
        timeout: {
          format: 'positive-integer',
          default: 5000,
          env: 'TEST_TIMEOUT'
        }
      })
      config.validate({ allowed: 'strict' })
    } catch (e) {
      error = e
    } finally {
      delete process.env.TEST_TIMEOUT
    }

    // Assert
    expect(error).toBeUndefined()
    expect(config.get('timeout')).toBe(2500)
  })

  test.each([0, -1, 1.5, '0', 'abc', '', null, true, '99999999999999999999'])(
    'rejects %j naming the setting',
    (value) => {
      // Act
      let error
      try {
        createConfig(value).validate({ allowed: 'strict' })
      } catch (e) {
        error = e
      }

      // Assert
      expect(error.message).toContain('timeout: must be a positive integer')
    }
  )
})

describe('secret', () => {
  function createSecretConfig(value) {
    return convict({
      password: {
        format: 'secret',
        default: null,
        sensitive: true
      }
    }).load({ password: value })
  }

  test('is registered as the secret format', () => {
    // Assert
    expect(secret.name).toBe('secret')
  })

  test('accepts a string of at least 32 characters', () => {
    // Act
    let error
    try {
      createSecretConfig('a'.repeat(32)).validate({ allowed: 'strict' })
    } catch (e) {
      error = e
    }

    // Assert
    expect(error).toBeUndefined()
  })

  test.each([null, '', 42])('rejects %j as unset', (value) => {
    // Act
    let error
    try {
      createSecretConfig(value).validate({ allowed: 'strict' })
    } catch (e) {
      error = e
    }

    // Assert
    expect(error.message).toContain('password: must be set')
  })

  test('rejects a short secret without echoing it', () => {
    // Arrange
    const value = 'too-short-secret'

    // Act
    let error
    try {
      createSecretConfig(value).validate({ allowed: 'strict' })
    } catch (e) {
      error = e
    }

    // Assert
    expect(error.message).toContain('password: must be at least 32 characters')
    expect(error.message).not.toContain(value)
  })

  test('relies on sensitive: true to keep the value out of the error', () => {
    // Arrange
    const value = 'too-short-secret'
    const config = convict({
      password: { format: 'secret', default: null }
    }).load({ password: value })

    // Act
    let error
    try {
      config.validate({ allowed: 'strict' })
    } catch (e) {
      error = e
    }

    // Assert
    expect(error.message).toContain(value)
  })
})

describe('parseIsoDuration', () => {
  test.each([
    ['PT1S', 1000],
    ['PT1M', 60000],
    ['PT4H', 14400000],
    ['P7D', 604800000],
    ['P1DT12H30M', 131400000],
    ['PT0.5S', 500]
  ])('parses %s to %d ms', (value, expected) => {
    // Act
    const result = parseIsoDuration(value)

    // Assert
    expect(result).toBe(expected)
  })

  test.each(['', 'P', 'PT', 'P1W', 'P1M', 'P1Y', '4h', '14400000', 'abc'])(
    'returns undefined for %j',
    (value) => {
      // Act
      const result = parseIsoDuration(value)

      // Assert
      expect(result).toBeUndefined()
    }
  )
})

describe('duration', () => {
  const sessionTtl = duration({ max: 'P7D' })
  convict.addFormat(sessionTtl)
  convict.addFormat(duration())

  function createDurationConfig(value, format = sessionTtl.name) {
    return convict({
      ttl: { format, default: 1000, env: 'TEST_TTL' }
    }).load({ ttl: value })
  }

  test('names the format after its maximum', () => {
    // Assert
    expect(sessionTtl.name).toBe('duration-max-P7D')
    expect(duration({ max: ' P7D ' }).name).toBe('duration-max-P7D')
    expect(duration().name).toBe('duration')
  })

  test('rejects a max that is not an ISO 8601 duration', () => {
    // Act
    let error
    try {
      duration({ max: '7 days' })
    } catch (e) {
      error = e
    }

    // Assert
    expect(error.message).toBe('max must be an ISO 8601 duration, got 7 days')
  })

  test.each([
    ['PT4H', 14400000],
    ['P7D', 604800000],
    ['14400000', 14400000],
    [14400000, 14400000]
  ])('accepts %j as %d ms', (value, expected) => {
    // Act
    let config, error
    try {
      config = createDurationConfig(value)
      config.validate({ allowed: 'strict' })
    } catch (e) {
      error = e
    }

    // Assert
    expect(error).toBeUndefined()
    expect(config.get('ttl')).toBe(expected)
  })

  test('coerces an ISO 8601 duration from an environment variable', () => {
    // Arrange
    process.env.TEST_TTL = 'PT4H'

    // Act
    let config, error
    try {
      config = convict({
        ttl: { format: sessionTtl.name, default: 1000, env: 'TEST_TTL' }
      })
      config.validate({ allowed: 'strict' })
    } catch (e) {
      error = e
    } finally {
      delete process.env.TEST_TTL
    }

    // Assert
    expect(error).toBeUndefined()
    expect(config.get('ttl')).toBe(14400000)
  })

  test.each(['P7DT1S', 'P8D', 604800001])(
    'rejects %j as over the maximum',
    (value) => {
      // Act
      let error
      try {
        createDurationConfig(value).validate({ allowed: 'strict' })
      } catch (e) {
        error = e
      }

      // Assert
      expect(error.message).toContain('ttl: must be no more than P7D')
    }
  )

  test('accepts any length when no maximum is given', () => {
    // Act
    let error
    try {
      createDurationConfig('P400D', 'duration').validate({ allowed: 'strict' })
    } catch (e) {
      error = e
    }

    // Assert
    expect(error).toBeUndefined()
  })

  test.each([0, -1, 1.5, '0', 'P1W', '4h', 'abc', '', null, true])(
    'rejects %j naming the setting',
    (value) => {
      // Act
      let error
      try {
        createDurationConfig(value).validate({ allowed: 'strict' })
      } catch (e) {
        error = e
      }

      // Assert
      expect(error.message).toContain(
        'ttl: must be an ISO 8601 duration (e.g. PT4H) or a positive number of milliseconds'
      )
    }
  )
})
