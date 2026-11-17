/** @import { Request, ResponseToolkit, Lifecycle, RouteOptionsAccess, ServerRoute } from '@hapi/hapi' */
import Boom from '@hapi/boom'
import { logger } from '@defra/lis-hubs-infra-core'
import { CSRF_PLUGIN_NAME } from '../csrf/constants.js'

import { isAnsweredByMaintenance } from '../maintenance.js'
import {
  notAuthorised,
  pageNotFound,
  problemWithService
} from './error-pages.js'
import { statusCodes } from '../status-codes.js'

function errorPageFor(statusCode) {
  switch (statusCode) {
    case statusCodes.notFound:
      return pageNotFound
    case statusCodes.unauthorized:
    case statusCodes.forbidden:
      return notAuthorised
    default:
      return problemWithService
  }
}

function getStatusCode(response) {
  return response?.statusCode ?? response?.output?.statusCode
}

const routineClientErrors = new Set([
  statusCodes.notFound,
  statusCodes.unauthorized,
  statusCodes.forbidden
])

function getError(response, statusCode) {
  const error = response?.source instanceof Error ? response.source : response
  if (error instanceof Error) {
    return error
  }
  if (typeof response?.source?.message === 'string') {
    return new Error(response.source.message)
  }
  return new Error(`Request failed with status ${statusCode}`)
}

function isLoggableClientError(response, statusCode) {
  return (
    response?.isBoom === true &&
    statusCode >= statusCodes.badRequest &&
    statusCode < statusCodes.internalServerError &&
    !routineClientErrors.has(statusCode)
  )
}

function logFailure(request, statusCode) {
  const { response } = request
  const isServerError =
    statusCode >= statusCodes.internalServerError &&
    !isAnsweredByMaintenance(request)

  if (!isServerError && !isLoggableClientError(response, statusCode)) {
    return
  }

  // Native ECS keys: hubs register hapi-pino on the shared logger, whose
  // req/res serialisers expect real HTTP objects (and null the status of a
  // plain one). request.path deliberately omits the query string.
  const context = {
    err: getError(response, statusCode),
    http: {
      request: { method: request.method },
      response: { status_code: statusCode }
    },
    url: { path: request.path }
  }

  if (isServerError) {
    logger.error(context, 'Request failed')
  } else {
    logger.warn(context, 'Request rejected')
  }
}

/**
 * @param {Request} request
 * @param {ResponseToolkit} h
 * @returns {Lifecycle.ReturnValue}
 */
export function catchAll(request, h) {
  const { response } = request
  const statusCode = getStatusCode(response)

  logFailure(request, statusCode)

  if (!('isBoom' in response)) {
    return h.continue
  }
  const { view, pageTitle } = errorPageFor(statusCode)
  return h.view(view, { pageTitle }).code(statusCode)
}

/**
 * A route for every path no other route matches. Without it hapi answers from
 * its built-in not-found route, which neither parses cookies nor runs auth, so
 * the page not found page shows the cookie banner and a signed-out header.
 * @param {object} [options]
 * @param {RouteOptionsAccess | false} [options.auth] - the route's auth; the
 * server default when omitted. A hub passes `{ mode: 'try' }`, so a signed-out
 * visitor sees the page rather than being sent to sign in.
 * @returns {ServerRoute}
 */
export function createNotFoundRoute({ auth } = {}) {
  return {
    method: '*',
    path: '/{unroutedPath*}',
    options: {
      ...(auth !== undefined && { auth }),
      // Left unread, so a malformed or oversized body is a 404 too.
      payload: { parse: false, output: 'stream' },
      // Nothing here changes state, and a refused check would turn the 404
      // into a 403.
      plugins: { [CSRF_PLUGIN_NAME]: false }
    },
    handler() {
      throw Boom.notFound()
    }
  }
}
