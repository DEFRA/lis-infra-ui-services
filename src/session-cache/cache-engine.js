import { Engine as CatboxRedis } from '@hapi/catbox-redis'
import { Engine as CatboxMemory } from '@hapi/catbox-memory'

import { buildRedisClient } from '../redis-client.js'
import { milliseconds } from '../duration.js'

/**
 * The longest any key may live in the session store. CDP requires session
 * data to expire within 7 days; this is enforced on every write so that no
 * cache policy, however configured, can exceed it.
 */
export const MAX_CACHE_TTL = milliseconds.oneWeek

/**
 * Wraps a catbox engine so that every write's ttl is capped at `maxTtl`.
 *
 * @template {new (...args: any[]) => { set: (key: object, value: unknown, ttl: number) => Promise<void> }} T
 * @param {T} EngineClass
 * @param {number} maxTtl milliseconds
 * @returns {T}
 */
export function withMaxTtl(EngineClass, maxTtl) {
  return class extends EngineClass {
    /**
     * @param {object} key
     * @param {unknown} value
     * @param {number} ttl milliseconds; a missing ttl gets the maximum
     * @returns {Promise<void>}
     */
    set(key, value, ttl) {
      const cappedTtl = typeof ttl === 'number' ? Math.min(ttl, maxTtl) : maxTtl
      return super.set(key, value, cappedTtl)
    }
  }
}

/**
 * @param {{ engine: string, config: object, logger: object, buildRedisClientFn?: Function, CatboxRedisClass?: Function, CatboxMemoryClass?: Function }} options
 * @returns {CatboxRedis | CatboxMemory}
 */
export function getCacheEngine({
  engine,
  config,
  logger,
  buildRedisClientFn = buildRedisClient,
  CatboxRedisClass = CatboxRedis,
  CatboxMemoryClass = CatboxMemory
}) {
  if (engine === 'redis') {
    logger.info('Using Redis session cache')
    const redisClient = buildRedisClientFn({
      redisConfig: config.get('redis'),
      logger
    })
    const CappedRedis = withMaxTtl(CatboxRedisClass, MAX_CACHE_TTL)
    return new CappedRedis({ client: redisClient })
  }

  if (config.get('isProduction')) {
    logger.error(
      'Catbox Memory is for local development only, it should not be used in production!'
    )
  }

  logger.info('Using Catbox Memory session cache')
  const CappedMemory = withMaxTtl(CatboxMemoryClass, MAX_CACHE_TTL)
  return new CappedMemory()
}
