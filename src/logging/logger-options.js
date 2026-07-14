import { createRequire } from 'node:module'

import { ecsFormat } from '@elastic/ecs-pino-format'
import { getTraceId } from '@defra/hapi-tracing'

const require = createRequire(import.meta.url)
const pinoPretty = require('pino-pretty')

/**
 * @param {{ logConfig: object, serviceName: string, serviceVersion: string }} options
 * @returns {object}
 */
export function createLoggerOptions({
  logConfig,
  serviceName,
  serviceVersion
}) {
  const formatters = {
    ecs: {
      ...ecsFormat({
        serviceVersion,
        serviceName
      })
    },
    json: {},
    'pino-pretty': {
      stream: pinoPretty({
        sync: true
      })
    }
  }

  return {
    enabled: logConfig.enabled,
    ignorePaths: ['/health'],
    redact: {
      paths: logConfig.redact,
      remove: true
    },
    level: logConfig.level,
    ...formatters[logConfig.format],
    nesting: true,
    mixin() {
      const mixinValues = {}
      const traceId = getTraceId()

      if (traceId) {
        mixinValues.trace = { id: traceId }
      }

      return mixinValues
    }
  }
}
