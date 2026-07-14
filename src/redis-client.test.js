import assert from 'node:assert/strict'
import test from 'node:test'

import { buildRedisClient } from './redis-client.js'

function createRedisClientDouble() {
  return {
    on() {}
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
})
