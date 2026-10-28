import { describe, expect, test } from 'vitest'
import convict from 'convict'

import { positiveInteger, secret } from './config-formats.js'

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
