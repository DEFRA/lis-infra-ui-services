import { createRequire } from 'node:module'

import { ecsFormat } from '@elastic/ecs-pino-format'
import { getTraceId } from '@defra/hapi-tracing'

const require = createRequire(import.meta.url)
const pinoPrettyTarget = require.resolve('pino-pretty')

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
    'pino-pretty': { transport: { target: pinoPrettyTarget } }
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
