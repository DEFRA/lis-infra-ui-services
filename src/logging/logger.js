import { pino } from 'pino'

export function createLogger({ loggerOptions }) {
  return pino(loggerOptions)
}
