import hapiPino from 'hapi-pino'

const defaultIgnorePath = (_, request) =>
  request.path.startsWith('/public') ||
  request.path === '/health' ||
  request.path === '/favicon.ico'

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
