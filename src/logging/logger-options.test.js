import { beforeEach, describe, expect, test, vi } from 'vitest'

import { requestContext } from '@defra/lis-hubs-infra-core'
import { createLoggerOptions } from './logger-options.js'

vi.mock('@defra/lis-hubs-infra-core')

const mocks = {
  requestContextGet: vi.mocked(requestContext.get)
}

function createOptions(format = 'ecs') {
  return createLoggerOptions({
    logConfig: { enabled: true, level: 'info', format, redact: [] },
    serviceName: 'test-service',
    serviceVersion: '1.2.3'
  })
}

describe('createLoggerOptions()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('mixin adds trace.id from the request context correlation id', () => {
    // Arrange
    mocks.requestContextGet.mockReturnValue('correlation-123')

    // Act
    const mixinValues = createOptions().mixin()

    // Assert
    expect(mixinValues).toEqual({ trace: { id: 'correlation-123' } })
    expect(mocks.requestContextGet).toHaveBeenCalledWith('correlation_id')
  })

  test('mixin omits trace when no correlation id is available', () => {
    // Arrange
    mocks.requestContextGet.mockReturnValue(null)

    // Act
    const mixinValues = createOptions().mixin()

    // Assert
    expect(mixinValues).toEqual({})
  })

  test('ecs log formatter preserves error.cause alongside the standard ECS fields', () => {
    // Arrange
    const cause = new Error('getaddrinfo ENOTFOUND identity.example')
    const err = new Error('fetch failed')
    err.cause = cause

    // Act
    const formatted = createOptions().formatters.log({ err, msg: 'failed' })

    // Assert
    expect(formatted.error.message).toBe('fetch failed')
    expect(formatted.error.type).toBe('Error')
    expect(formatted.error.cause).toBe(cause.message)
  })

  test('ecs log formatter falls back to cause.code when cause has no message', () => {
    // Arrange
    const cause = { code: 'ENOTFOUND' }
    const err = new Error('fetch failed')
    err.cause = cause

    // Act
    const formatted = createOptions().formatters.log({ err })

    // Assert
    expect(formatted.error.cause).toBe('ENOTFOUND')
  })

  test('ecs log formatter falls back to the raw cause value when it has neither message nor code', () => {
    // Arrange
    const err = new Error('fetch failed')
    err.cause = 'ECONNREFUSED'

    // Act
    const formatted = createOptions().formatters.log({ err })

    // Assert
    expect(formatted.error.cause).toBe('ECONNREFUSED')
  })

  test('ecs log formatter is unaffected when the error has no cause', () => {
    // Arrange
    const err = new Error('plain failure')

    // Act
    const formatted = createOptions().formatters.log({ err })

    // Assert
    expect(formatted.error.message).toBe('plain failure')
    expect('cause' in formatted.error).toBe(false)
  })

  test('non-ecs log formats are unaffected by the cause-preserving wrapper', () => {
    // Arrange
    // Act
    const options = createOptions('json')

    // Assert
    expect('formatters' in options).toBe(false)
  })
})
