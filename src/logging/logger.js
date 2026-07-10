/** @import { Logger } from 'pino' */
import { pino } from 'pino'

/**
 * @param {{ loggerOptions: object }} options
 * @returns {Logger}
 */
export function createLogger({ loggerOptions }) {
  return pino(loggerOptions)
}
