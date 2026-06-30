import { createLogger } from './logger.js'
import { createLoggerOptions } from './logger-options.js'
import { createRequestLoggerPlugin } from './request-logger.js'

const loggingCache = new WeakMap()
const logLevels = new Set([
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
  'silent'
])
const logFormats = new Set(['ecs', 'json', 'pino-pretty'])
const productionRedactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers'
]

function parseBoolean(value, defaultValue) {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value !== 'string') {
    return defaultValue
  }

  if (value === 'true') {
    return true
  }

  if (value === 'false') {
    return false
  }

  return defaultValue
}

function parseArray(value, defaultValue) {
  if (Array.isArray(value)) {
    return value
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return defaultValue
  }

  try {
    const parsedValue = JSON.parse(value)

    if (Array.isArray(parsedValue)) {
      return parsedValue
    }
  } catch {}

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function parseEnum(value, supportedValues, defaultValue) {
  if (typeof value !== 'string') {
    return defaultValue
  }

  return supportedValues.has(value) ? value : defaultValue
}

export function createProjectLogging({
  config,
  logConfig,
  serviceName,
  serviceVersion
}) {
  if (!config && !logConfig) {
    throw new Error('createProjectLogging requires config or logConfig')
  }

  if (config) {
    const cachedLogging = loggingCache.get(config)

    if (cachedLogging) {
      return cachedLogging
    }
  }

  const resolvedLogConfig = logConfig ?? config?.get('log')
  const resolvedServiceName = serviceName ?? config?.get('serviceName')
  const resolvedServiceVersion = serviceVersion ?? config?.get('serviceVersion')
  const loggerOptions = createLoggerOptions({
    logConfig: resolvedLogConfig,
    serviceName: resolvedServiceName,
    serviceVersion: resolvedServiceVersion
  })
  const logging = {
    loggerOptions,
    logger: createLogger({ loggerOptions }),
    requestLogger: createRequestLoggerPlugin({ loggerOptions })
  }

  if (config) {
    loggingCache.set(config, logging)
  }

  return logging
}

export function createLogConfigFromEnv({ env = process.env } = {}) {
  const isProduction = env.NODE_ENV === 'production'

  return {
    enabled: parseBoolean(env.LOG_ENABLED, env.NODE_ENV !== 'test'),
    level: parseEnum(env.LOG_LEVEL, logLevels, 'info'),
    format: parseEnum(
      env.LOG_FORMAT,
      logFormats,
      isProduction ? 'ecs' : 'pino-pretty'
    ),
    redact: parseArray(
      env.LOG_REDACT,
      isProduction ? productionRedactPaths : []
    )
  }
}

export function createProcessLogging({
  env = process.env,
  serviceName,
  serviceVersion = env.SERVICE_VERSION ?? null
}) {
  return createProjectLogging({
    logConfig: createLogConfigFromEnv({ env }),
    serviceName,
    serviceVersion
  })
}

export function getLoggerOptionsForConfig(config) {
  return createProjectLogging({ config }).loggerOptions
}

export function getLoggerForConfig(config) {
  return createProjectLogging({ config }).logger
}

export function getRequestLoggerPluginForConfig(config) {
  return createProjectLogging({ config }).requestLogger
}
