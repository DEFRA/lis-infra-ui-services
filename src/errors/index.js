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

  if (
    statusCode >= statusCodes.internalServerError &&
    !isAnsweredByMaintenance(request)
  ) {
    logger.error(getLogMessage(response, statusCode))
  }

  if (!('isBoom' in response)) {
    return h.continue
  }
  const { view, pageTitle } = errorPageFor(statusCode)
  return h.view(view, { pageTitle }).code(statusCode)
}
