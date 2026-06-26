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

export function catchAll(request, h) {
  const { response } = request
  const statusCode = getStatusCode(response)

  if (statusCode >= statusCodes.internalServerError) {
    request.logger.error(getLogMessage(response, statusCode))
  }

  if (!('isBoom' in response)) {
    return h.continue
  }

  const errorMessage = statusCodeMessage(statusCode)

  return h
    .view('error/index', {
      pageTitle: errorMessage,
      heading: statusCode,
      message: errorMessage
    })
    .code(statusCode)
}
