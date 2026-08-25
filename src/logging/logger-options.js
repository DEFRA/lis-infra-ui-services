import { createRequire } from 'node:module'

import { ecsFormat } from '@elastic/ecs-pino-format'
import { requestContext } from '@defra/lis-hubs-infra-core'

const require = createRequire(import.meta.url)
const pinoPretty = require('pino-pretty')

/**
 * Wraps ecs-pino-format's log formatter to also surface error.cause.
 * ECS's error.* fields (type, message, stack_trace) predate Error.cause
 * (ES2022) and have no field for it, so ecs-pino-format silently drops it -
 * this puts it back as error.cause when present.
 * @param {object} ecs - The object returned by ecsFormat().
 * @returns {Function}
 */
function createEcsLogFormatter(ecs) {
  return function log(obj) {
    const formatted = ecs.formatters.log(obj)
    const cause = obj.err?.cause

    if (cause !== undefined && formatted.error) {
      formatted.error.cause = cause?.message ?? cause?.code ?? cause
    }

    return formatted
  }
}

/**
 * @param {{ logConfig: object, serviceName: string, serviceVersion: string }} options
 * @returns {object}
 */
export function createLoggerOptions({
  logConfig,
  serviceName,
  serviceVersion
}) {
  const ecs = ecsFormat({ serviceVersion, serviceName })

  const formatters = {
    ecs: {
      ...ecs,
      formatters: {
        ...ecs.formatters,
        log: createEcsLogFormatter(ecs)
      }
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
      const correlationId = requestContext.get('correlation_id')

      if (correlationId) {
        mixinValues.trace = { id: correlationId }
      }

      return mixinValues
    }
  }
}
