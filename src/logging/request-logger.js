import hapiPino from 'hapi-pino'

const defaultIgnorePath = (_, request) =>
  request.path.startsWith('/public') ||
  request.path === '/health' ||
  request.path === '/favicon.ico'

/**
 * @param {{ loggerOptions: object, ignoreFunc?: Function }} options
 * @returns {object}
 */
export function createRequestLoggerPlugin({
  loggerOptions,
  ignoreFunc = defaultIgnorePath
}) {
  return {
    plugin: hapiPino,
    options: {
      ignoreFunc,
      ...loggerOptions
    }
  }
}
