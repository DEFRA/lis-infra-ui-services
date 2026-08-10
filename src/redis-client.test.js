import assert from 'node:assert/strict'
import { test, vi } from 'vitest'

import { buildRedisClient } from './redis-client.js'

function createRedisClientDouble(handlers = {}) {
  return {
    on(event, handler) {
      handlers[event] = handler
      return this
    }
  }
}

test('buildRedisClient uses the configured Redis port for a single-instance cache', () => {
  const calls = []
  class RedisClass {
    constructor(options) {
      calls.push(options)
      return createRedisClientDouble()
    }
  }

  buildRedisClient({
    redisConfig: {
      host: 'redis.internal',
      port: 6385,
      keyPrefix: 'front-office:',
      useSingleInstanceCache: true,
      useTLS: false,
      username: '',
      password: ''
    },
    RedisClass,
    ClusterClass: class {}
  })

  assert.deepEqual(calls, [
    {
      db: 0,
      host: 'redis.internal',
      keyPrefix: 'front-office:',
      port: 6385
    }
  ])
})

test('buildRedisClient uses the configured Redis port for a cluster cache', () => {
  const calls = []
  class ClusterClass {
    constructor(nodes, options) {
      calls.push({ nodes, options })
      return createRedisClientDouble()
    }
  }

  buildRedisClient({
    redisConfig: {
      host: 'redis.internal',
      port: 6386,
      keyPrefix: 'back-office:',
      useSingleInstanceCache: false,
      useTLS: true,
      username: 'user',
      password: 'pass'
    },
    RedisClass: class {},
    ClusterClass
  })

  assert.deepEqual(calls, [
    {
      nodes: [{ host: 'redis.internal', port: 6386 }],
      options: {
        dnsLookup: calls[0]?.options?.dnsLookup,
        keyPrefix: 'back-office:',
        redisOptions: {
          db: 0,
          password: 'pass',
          tls: {},
          username: 'user'
        },
        slotsRefreshTimeout: 10000
      }
    }
  ])

  const callback = vi.fn()
  calls[0].options.dnsLookup('redis.internal', callback)
  assert.deepEqual(callback.mock.calls[0], [null, 'redis.internal'])
})

test('buildRedisClient uses the default port and logs client events', () => {
  const handlers = {}
  const logger = {
    info: vi.fn(),
    error: vi.fn()
  }
  let options
  class RedisClass {
    constructor(redisOptions) {
      options = redisOptions
      return createRedisClientDouble(handlers)
    }
  }

  const client = buildRedisClient({
    redisConfig: {
      host: 'redis.internal',
      keyPrefix: 'sessions:',
      useSingleInstanceCache: true,
      useTLS: true,
      username: 'user',
      password: 'pass'
    },
    logger,
    RedisClass,
    ClusterClass: class {}
  })

  assert.equal(client.on instanceof Function, true)
  assert.deepEqual(options, {
    db: 0,
    host: 'redis.internal',
    keyPrefix: 'sessions:',
    password: 'pass',
    port: 6379,
    tls: {},
    username: 'user'
  })

  handlers.connect()
  handlers.error(new Error('connection lost'))

  assert.deepEqual(logger.info.mock.calls[0], ['Connected to Redis server'])
  assert.deepEqual(logger.error.mock.calls[0], [
    'Redis connection error Error: connection lost'
  ])
})

test('client events are safe when no logger is supplied', () => {
  const handlers = {}
  class RedisClass {
    constructor() {
      return createRedisClientDouble(handlers)
    }
  }

  buildRedisClient({
    redisConfig: {
      host: 'redis.internal',
      useSingleInstanceCache: true,
      useTLS: false,
      username: ''
    },
    RedisClass,
    ClusterClass: class {}
  })

  assert.doesNotThrow(() => handlers.connect())
  assert.doesNotThrow(() => handlers.error(new Error('ignored')))
})
