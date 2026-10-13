/** @import { Request, ResponseToolkit, Lifecycle } from '@hapi/hapi' */
import { logger } from '@defra/lis-hubs-infra-core'

import { isAnsweredByMaintenance } from '../maintenance.js'
import { statusCodes } from '../status-codes.js'

const pageNotFound = {
  view: 'error/page-not-found',
  pageTitle: 'Page not found'
}
const notAuthorised = {
  view: 'error/not-authorised',
  pageTitle: 'Sorry, you are not authorised to view this page'
}
const serviceUnavailable = {
  view: 'error/service-unavailable',
  pageTitle: 'Sorry, the service is unavailable'
}
const problemWithService = {
  view: 'error/problem-with-service',
  pageTitle: 'Sorry, there is a problem with the service'
}

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
  const developmentMessage =
    process.env.NODE_ENV === 'development'
      ? (response?.message ?? response?.source?.message)
      : undefined

  return h.view(view, { pageTitle, developmentMessage }).code(statusCode)
}
