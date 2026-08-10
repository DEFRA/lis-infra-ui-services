import assert from 'node:assert/strict'
import { beforeEach, test, vi } from 'vitest'

const { logger } = vi.hoisted(() => ({
  logger: { info: vi.fn(), error: vi.fn() }
}))

vi.mock('../../logging/index.js', () => ({
  getLoggerForConfig: () => logger
}))

import { createHoldingService } from './service.js'

function createConfig(overrides = {}) {
  const values = {
    'holdingService.url': 'https://holding.example.test/holding',
    'holdingService.apiKey': 'secret-key',
    'holdingService.apiKeyHeader': 'x-api-key',
    ...overrides
  }
  return { get: (key) => values[key] }
}

beforeEach(() => {
  logger.info.mockClear()
  logger.error.mockClear()
})

test('fetches and returns a holding with API and bearer authentication', async () => {
  const responseBody = { cph: '12/345/6789', name: 'Home Farm' }
  const fetchImpl = vi.fn(async () => ({
    ok: true,
    json: async () => responseBody
  }))
  const fetchHolding = createHoldingService({
    config: createConfig(),
    fetchImpl
  })

  const result = await fetchHolding('12/345/6789', 'access-token')

  const [url, options] = fetchImpl.mock.calls[0]
  assert.equal(
    url,
    'https://holding.example.test/holding?holding=12%2F345%2F6789'
  )
  assert.deepEqual(options, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      'x-api-key': 'secret-key',
      authorization: 'Bearer access-token'
    }
  })
  assert.deepEqual(result, responseBody)
  assert.notEqual(result, responseBody)
  assert.equal(logger.info.mock.calls.length, 2)
})

test('omits optional authentication headers', async () => {
  const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => ({}) }))
  const fetchHolding = createHoldingService({
    config: createConfig({ 'holdingService.apiKey': '' }),
    fetchImpl
  })

  await fetchHolding('123')

  assert.deepEqual(fetchImpl.mock.calls[0][1].headers, {
    accept: 'application/json'
  })
})

test('logs response details and throws when a request fails', async () => {
  const fetchHolding = createHoldingService({
    config: createConfig(),
    fetchImpl: async () => ({
      ok: false,
      status: 503,
      text: async () => 'Service unavailable'
    })
  })

  await assert.rejects(
    fetchHolding('123'),
    /Holding service request failed with 503: Service unavailable/
  )
  assert.deepEqual(logger.error.mock.calls[0], [
    'Holding service request failed with 503: Service unavailable'
  ])
})

test('validates configuration and fetch dependencies', () => {
  assert.throws(
    () => createHoldingService({ config: null, fetchImpl: vi.fn() }),
    /requires a config object/
  )
  assert.throws(
    () => createHoldingService({ config: createConfig(), fetchImpl: null }),
    /requires a fetch implementation/
  )
})

test('rejects an enabled service without a URL', async () => {
  const fetchHolding = createHoldingService({
    config: createConfig({ 'holdingService.url': '' }),
    fetchImpl: vi.fn()
  })

  await assert.rejects(fetchHolding('123'), /enabled but not configured/)
})
