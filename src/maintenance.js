/** @import { Plugin, Request } from '@hapi/hapi' */
import { format, isValid, parseISO } from 'date-fns'

import { statusCodes } from './status-codes.js'

const PLUGIN_NAME = 'lis-maintenance'
const MIDDAY_HOUR = 12

function formatTime(date) {
  if (date.getMinutes() === 0) {
    if (date.getHours() === 0) {
      return 'midnight'
    }
    if (date.getHours() === MIDDAY_HOUR) {
      return 'midday'
    }
    return format(date, 'haaa')
  }

  return format(date, 'h:mmaaa')
}

/**
 * Formats a return time in the GOV.UK style, e.g. "9am on Monday 19 November
 * 2026". A value without an offset is read as wall-clock time, so the page
 * shows what was configured whatever the server's time zone.
 * @param {string} isoString
 * @returns {string}
 */
export function formatAvailableFrom(isoString) {
  const date = parseISO(isoString)

  if (!isValid(date)) {
    throw new Error(
      `maintenance.availableFrom must be an ISO 8601 date-time, got "${isoString}"`
    )
  }

  return `${formatTime(date)} on ${format(date, 'EEEE d MMMM yyyy')}`
}

/**
 * Whether the maintenance plugin answered this request, so the error handler
 * does not log every refused request as a server error.
 * @param {Request} request
 * @returns {boolean}
 */
export function isAnsweredByMaintenance(request) {
  return request?.plugins?.[PLUGIN_NAME]?.answered === true
}

function isExempt(path, { healthPath, assetPath }) {
  return path === healthPath || path.startsWith(`${assetPath}/`)
}

/**
 * Answers every request with the service unavailable page while
 * `availableFrom` is set. The health check stays up so the platform does not
 * restart the service, and assets stay up so the page is styled.
 * @param {{ availableFrom?: string, healthPath?: string, assetPath?: string }} options
 * @returns {Plugin<void>}
 */
export function createMaintenancePlugin({
  availableFrom,
  healthPath = '/health',
  assetPath = '/public'
} = {}) {
  const isActive = typeof availableFrom === 'string' && availableFrom !== ''
  const formattedAvailableFrom = isActive
    ? formatAvailableFrom(availableFrom)
    : undefined

  return {
    name: PLUGIN_NAME,
    register(server) {
      if (!isActive) {
        return
      }

      server.ext('onRequest', (request, h) => {
        if (isExempt(request.path, { healthPath, assetPath })) {
          return h.continue
        }

        request.plugins[PLUGIN_NAME] = { answered: true }

        return h
          .view('error/service-unavailable', {
            pageTitle: 'Sorry, the service is unavailable',
            availableFrom: formattedAvailableFrom
          })
          .code(statusCodes.serviceUnavailable)
          .takeover()
      })
    }
  }
}
