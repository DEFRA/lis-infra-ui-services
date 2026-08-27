/** @import { Request, ResponseToolkit, Lifecycle } from '@hapi/hapi' */
import { logger } from '@defra/lis-hubs-infra-core'

import { statusCodes } from '../status-codes.js'

function statusCodeMessage(statusCode) {
  switch (statusCode) {
    case statusCodes.notFound:
      return 'Page not found'
    case statusCodes.forbidden:
      return 'Forbidden'
    case statusCodes.unauthorized:
      return 'Unauthorized'
    case statusCodes.badRequest:
      return 'Bad Request'
    default:
      return 'Something went wrong'
  }
}

function getStatusCode(response) {
  return response?.output?.statusCode ?? response?.statusCode
}

function getLogMessage(response, statusCode) {
  return (
    response?.stack ??
    response?.message ??
    response?.source?.stack ??
    response?.source?.message ??
    `Request failed with status ${statusCode}`
  )
}

/**
 * @param {Request} request
 * @param {ResponseToolkit} h
 * @returns {Lifecycle.ReturnValue}
 */
export function catchAll(request, h) {
  const { response } = request
  const statusCode = getStatusCode(response)

  if (statusCode >= statusCodes.internalServerError) {
    logger.error(getLogMessage(response, statusCode))
  }

  if (!('isBoom' in response)) {
    return h.continue
  }
  const genericMessage = statusCodeMessage(statusCode)
  const detailedMessage =
    response?.message ?? response?.source?.message ?? genericMessage

  const message =
    process.env.NODE_ENV === 'development' ? detailedMessage : genericMessage

  return h
    .view('error/index', {
      pageTitle: genericMessage,
      heading: statusCode,
      message
    })
    .code(statusCode)
}
