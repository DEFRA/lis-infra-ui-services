import assert from 'node:assert/strict'
import test from 'node:test'

import { createLogConfigFromEnv, createProcessLogging } from './project.js'

test('createLogConfigFromEnv applies production defaults and parses array values', () => {
  assert.deepEqual(
    createLogConfigFromEnv({
      env: {
        NODE_ENV: 'production',
        LOG_REDACT: '["req.headers.cookie","res.headers"]'
      }
    }),
    {
      enabled: true,
      level: 'info',
      format: 'ecs',
      redact: ['req.headers.cookie', 'res.headers']
    }
  )
})

test('createLogConfigFromEnv accepts comma-separated redact paths and boolean overrides', () => {
  assert.deepEqual(
    createLogConfigFromEnv({
      env: {
        NODE_ENV: 'development',
        LOG_ENABLED: 'false',
        LOG_LEVEL: 'debug',
        LOG_FORMAT: 'pino-pretty',
        LOG_REDACT: 'req.headers.authorization, res.headers'
      }
    }),
    {
      enabled: false,
      level: 'debug',
      format: 'pino-pretty',
      redact: ['req.headers.authorization', 'res.headers']
    }
  )
})

test('createProcessLogging builds a logger and request logger from process-style env values', () => {
  const logging = createProcessLogging({
    env: {
      NODE_ENV: 'test',
      LOG_ENABLED: 'true',
      LOG_LEVEL: 'warn',
      LOG_FORMAT: 'ecs',
      SERVICE_VERSION: '1.2.3'
    },
    serviceName: 'test-service'
  })

  assert.equal(logging.loggerOptions.enabled, true)
  assert.equal(logging.loggerOptions.level, 'warn')
  assert.equal(typeof logging.logger.info, 'function')
  assert.equal(typeof logging.requestLogger.options.ignoreFunc, 'function')
})

test('createLogConfigFromEnv preserves json log format when explicitly requested', () => {
  assert.deepEqual(
    createLogConfigFromEnv({
      env: {
        NODE_ENV: 'development',
        LOG_FORMAT: 'json'
      }
    }),
    {
      enabled: true,
      level: 'info',
      format: 'json',
      redact: []
    }
  )
})
