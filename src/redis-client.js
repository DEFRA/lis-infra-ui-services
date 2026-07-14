import { createRequire } from 'node:module'

import { milliseconds } from './duration.js'

const require = createRequire(import.meta.url)

/**
 * @param {{ redisConfig: object, logger?: object, ClusterClass?: Function, RedisClass?: Function }} options
 * @returns {object}
 */
export function buildRedisClient({
  redisConfig,
  logger,
  ClusterClass,
  RedisClass
}) {
  const port = redisConfig.port ?? 6379
  const db = 0
  const keyPrefix = redisConfig.keyPrefix
  const host = redisConfig.host
  const resolvedClasses = ClusterClass && RedisClass ? null : require('ioredis')
  const ResolvedClusterClass = ClusterClass ?? resolvedClasses.Cluster
  const ResolvedRedisClass = RedisClass ?? resolvedClasses.Redis

  const credentials =
    redisConfig.username === ''
      ? {}
      : {
          username: redisConfig.username,
          password: redisConfig.password
        }
  const tls = redisConfig.useTLS ? { tls: {} } : {}

  const redisClient = redisConfig.useSingleInstanceCache
    ? new ResolvedRedisClass({
        port,
        host,
        db,
        keyPrefix,
        ...credentials,
        ...tls
      })
    : new ResolvedClusterClass(
        [
          {
            host,
            port
          }
        ],
        {
          keyPrefix,
          slotsRefreshTimeout: milliseconds.tenSeconds,
          dnsLookup: (address, callback) => callback(null, address),
          redisOptions: {
            db,
            ...credentials,
            ...tls
          }
        }
      )

  redisClient.on('connect', () => {
    logger?.info?.('Connected to Redis server')
  })

  redisClient.on('error', (error) => {
    logger?.error?.(`Redis connection error ${error}`)
  })

  return redisClient
}
