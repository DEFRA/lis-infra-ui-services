import assert from 'node:assert/strict'
import { test, vi } from 'vitest'

import { getCacheEngine, MAX_CACHE_TTL } from './cache-engine.js'

test('creates a Redis cache engine with the configured client', () => {
  const client = { connected: true }
  const buildRedisClientFn = vi.fn(() => client)
  class RedisEngine {
    constructor(options) {
      this.options = options
    }
  }
  const logger = { info: vi.fn(), error: vi.fn() }
  const config = { get: vi.fn(() => ({ host: 'redis' })) }

  const engine = getCacheEngine({
    engine: 'redis',
    config,
    logger,
    buildRedisClientFn,
    CatboxRedisClass: RedisEngine
  })

  assert.deepEqual(engine.options, { client })
  assert.deepEqual(buildRedisClientFn.mock.calls[0], [
    {
      redisConfig: { host: 'redis' },
      logger
    }
  ])
  assert.deepEqual(logger.info.mock.calls[0], ['Using Redis session cache'])
})

test('warns when an in-memory cache is used in production', () => {
  class MemoryEngine {}
  const logger = { info: vi.fn(), error: vi.fn() }
  const config = { get: vi.fn(() => true) }

  const engine = getCacheEngine({
    engine: 'memory',
    config,
    logger,
    CatboxMemoryClass: MemoryEngine
  })

  assert.ok(engine instanceof MemoryEngine)
  assert.equal(logger.error.mock.calls.length, 1)
  assert.deepEqual(logger.info.mock.calls[0], [
    'Using Catbox Memory session cache'
  ])
})

test('uses memory without warning outside production', () => {
  const logger = { info: vi.fn(), error: vi.fn() }
  const config = { get: vi.fn(() => false) }

  getCacheEngine({ engine: 'memory', config, logger })

  assert.equal(logger.error.mock.calls.length, 0)
})

test('caps the ttl of every Redis write at one week', async () => {
  const set = vi.fn()
  class RedisEngine {
    set(...args) {
      return set(...args)
    }
  }
  const logger = { info: vi.fn(), error: vi.fn() }
  const config = { get: vi.fn(() => ({ host: 'redis' })) }
  const engine = getCacheEngine({
    engine: 'redis',
    config,
    logger,
    buildRedisClientFn: vi.fn(() => ({})),
    CatboxRedisClass: RedisEngine
  })

  await engine.set({ id: 'a' }, 'value', MAX_CACHE_TTL + 1)
  await engine.set({ id: 'b' }, 'value', 1000)
  await engine.set({ id: 'c' }, 'value', undefined)

  assert.deepEqual(set.mock.calls[0], [{ id: 'a' }, 'value', MAX_CACHE_TTL])
  assert.deepEqual(set.mock.calls[1], [{ id: 'b' }, 'value', 1000])
  assert.deepEqual(set.mock.calls[2], [{ id: 'c' }, 'value', MAX_CACHE_TTL])
})

test('caps the ttl of every memory write at one week', async () => {
  const set = vi.fn()
  class MemoryEngine {
    set(...args) {
      return set(...args)
    }
  }
  const logger = { info: vi.fn(), error: vi.fn() }
  const config = { get: vi.fn(() => false) }
  const engine = getCacheEngine({
    engine: 'memory',
    config,
    logger,
    CatboxMemoryClass: MemoryEngine
  })

  await engine.set({ id: 'a' }, 'value', MAX_CACHE_TTL * 2)

  assert.deepEqual(set.mock.calls[0], [{ id: 'a' }, 'value', MAX_CACHE_TTL])
})
