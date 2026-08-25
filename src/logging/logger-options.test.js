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
    mocks.requestContextGet.mockReturnValue('correlation-123')

    const mixinValues = createOptions().mixin()

    expect(mixinValues).toEqual({ trace: { id: 'correlation-123' } })
    expect(mocks.requestContextGet).toHaveBeenCalledWith('correlation_id')
  })

  test('mixin omits trace when no correlation id is available', () => {
    mocks.requestContextGet.mockReturnValue(null)

    const mixinValues = createOptions().mixin()

    expect(mixinValues).toEqual({})
  })

  test('ecs log formatter preserves error.cause alongside the standard ECS fields', () => {
    const cause = new Error('getaddrinfo ENOTFOUND identity.example')
    const err = new Error('fetch failed')
    err.cause = cause

    const formatted = createOptions().formatters.log({ err, msg: 'failed' })

    expect(formatted.error.message).toBe('fetch failed')
    expect(formatted.error.type).toBe('Error')
    expect(formatted.error.cause).toBe(cause.message)
  })

  test('ecs log formatter is unaffected when the error has no cause', () => {
    const err = new Error('plain failure')

    const formatted = createOptions().formatters.log({ err })

    expect(formatted.error.message).toBe('plain failure')
    expect('cause' in formatted.error).toBe(false)
  })

  test('non-ecs log formats are unaffected by the cause-preserving wrapper', () => {
    const options = createOptions('json')

    expect('formatters' in options).toBe(false)
  })
})
