/** @import { Plugin, Request } from '@hapi/hapi' */
import { format, isValid, parseISO } from 'date-fns'

import { serviceUnavailable } from './errors/error-pages.js'
import { statusCodes } from './status-codes.js'

const PLUGIN_NAME = 'lis-maintenance'
const MIDDAY_HOUR = 12
const LOCAL_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/

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
 * Only a local date-time is accepted: it is read as wall-clock time, so the
 * page shows what was configured whatever the server's time zone, whereas an
 * offset would be converted to the server's zone.
 * @param {string} isoString
 * @returns {Date}
 */
function parseAvailableFrom(isoString) {
  const date = LOCAL_DATE_TIME.test(isoString) ? parseISO(isoString) : null

  if (!date || !isValid(date)) {
    throw new Error(
      `maintenance.availableFrom must be the UK local date-time without an offset, e.g. 2026-11-19T09:00, got "${isoString}"`
    )
  }

  return date
}

/**
 * Formats a return time in the GOV.UK style, e.g. "9am on Monday 19 November
 * 2026".
 * @param {string} isoString - a local date-time without an offset
 * @returns {string}
 */
export function formatAvailableFrom(isoString) {
  const date = parseAvailableFrom(isoString)

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

function withoutTrailingSlashes(path) {
  let trimmed = path

  while (trimmed.endsWith('/')) {
    trimmed = trimmed.slice(0, -1)
  }

  return trimmed
}

function isExempt(path, { healthPath, assetPrefix }) {
  return path === healthPath || path.startsWith(assetPrefix)
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
  const retryAfter = isActive
    ? parseAvailableFrom(availableFrom).toUTCString()
    : undefined
  const assetPrefix = `${withoutTrailingSlashes(assetPath)}/`

  return {
    name: PLUGIN_NAME,
    register(server) {
      if (!isActive) {
        return
      }

      server.ext('onRequest', (request, h) => {
        if (isExempt(request.path, { healthPath, assetPrefix })) {
          return h.continue
        }

        request.plugins[PLUGIN_NAME] = { answered: true }

        return h
          .view(serviceUnavailable.view, {
            pageTitle: serviceUnavailable.pageTitle,
            availableFrom: formattedAvailableFrom
          })
          .code(statusCodes.serviceUnavailable)
          .header('Retry-After', retryAfter)
          .takeover()
      })
    }
  }
}
