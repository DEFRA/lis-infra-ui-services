/** @import { Request, ResponseToolkit, Lifecycle } from '@hapi/hapi' */
import { logger } from '@defra/lis-hubs-infra-core'

import { isAnsweredByMaintenance } from '../maintenance.js'
import {
  notAuthorised,
  pageNotFound,
  problemWithService,
  serviceUnavailable
} from './error-pages.js'
import { statusCodes } from '../status-codes.js'

function errorPageFor(statusCode) {
  switch (statusCode) {
    case statusCodes.notFound:
      return pageNotFound
    case statusCodes.unauthorized:
    case statusCodes.forbidden:
      return notAuthorised
    case statusCodes.serviceUnavailable:
      return serviceUnavailable
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
