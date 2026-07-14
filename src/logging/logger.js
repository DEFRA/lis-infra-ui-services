/** @import { Logger } from 'pino' */
import { pino } from 'pino'

/**
 * @param {{ loggerOptions: object }} options
 * @returns {Logger}
 */
export function createLogger({ loggerOptions }) {
  const { stream, ...options } = loggerOptions
  return pino(options, stream)
}
