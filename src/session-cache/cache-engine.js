import { Engine as CatboxRedis } from '@hapi/catbox-redis'
import { Engine as CatboxMemory } from '@hapi/catbox-memory'

import { buildRedisClient } from '../redis-client.js'

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
    return new CatboxRedisClass({ client: redisClient })
  }

  if (config.get('isProduction')) {
    logger.error(
      'Catbox Memory is for local development only, it should not be used in production!'
    )
  }

  logger.info('Using Catbox Memory session cache')
  return new CatboxMemoryClass()
}
