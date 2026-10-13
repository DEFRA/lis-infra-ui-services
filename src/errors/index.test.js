import assert from 'node:assert/strict'
import { afterEach, test, vi } from 'vitest'

import { statusCodes } from '../status-codes.js'

const { logger } = vi.hoisted(() => ({
  logger: { error: vi.fn() }
}))

vi.mock('@defra/lis-hubs-infra-core', () => ({ logger }))

import { catchAll } from './index.js'

function createToolkit() {
  const view = vi.fn(() => toolkit)
  const code = vi.fn(() => toolkit)
  const toolkit = {
    continue: Symbol('continue'),
    view,
    code
  }

  return toolkit
}

function createBoomRequest(statusCode) {
  return {
    response: {
      isBoom: true,
      stack: 'Mock error stack',
      output: { statusCode }
    }
  }
}

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
})

test('catchAll continues when the response is not Boom', () => {
  // Arrange
  const toolkit = createToolkit()

  // Act
  const result = catchAll({ response: {} }, toolkit)

  // Assert
  assert.equal(result, toolkit.continue)
  assert.equal(toolkit.view.mock.calls.length, 0)
})

test.each([
  [statusCodes.notFound, 'error/page-not-found', 'Page not found'],
  [
    statusCodes.unauthorized,
    'error/not-authorised',
    'Sorry, you are not authorised to view this page'
  ],
  [
    statusCodes.forbidden,
    'error/not-authorised',
    'Sorry, you are not authorised to view this page'
  ],
  [
    statusCodes.badRequest,
    'error/problem-with-service',
    'Sorry, there is a problem with the service'
  ],
  [
    statusCodes.serviceUnavailable,
    'error/service-unavailable',
    'Sorry, the service is unavailable'
  ]
])(
  'catchAll renders a %i as the %s page titled "%s"',
  (statusCode, view, pageTitle) => {
    // Arrange
    const request = createBoomRequest(statusCode)
    const toolkit = createToolkit()

    // Act
    catchAll(request, toolkit)

    // Assert
    assert.deepEqual(toolkit.view.mock.calls[0], [
      view,
      { pageTitle, developmentMessage: undefined }
    ])
    assert.deepEqual(toolkit.code.mock.calls[0], [statusCode])
  }
)

test('catchAll logs server errors and renders the problem with the service page', () => {
  // Arrange
  const request = createBoomRequest(statusCodes.internalServerError)
  const toolkit = createToolkit()

  // Act
  catchAll(request, toolkit)

  // Assert
  assert.deepEqual(toolkit.view.mock.calls[0], [
    'error/problem-with-service',
    {
      pageTitle: 'Sorry, there is a problem with the service',
      developmentMessage: undefined
    }
  ])
  assert.deepEqual(toolkit.code.mock.calls[0], [
    statusCodes.internalServerError
  ])
  assert.deepEqual(logger.error.mock.calls[0], ['Mock error stack'])
})

test('catchAll does not log client errors', () => {
  // Arrange
  const request = createBoomRequest(statusCodes.notFound)
  const toolkit = createToolkit()

  // Act
  catchAll(request, toolkit)

  // Assert
  assert.equal(logger.error.mock.calls.length, 0)
})

test('catchAll prefers a client-attached statusCode over a boomified 500', () => {
  // Arrange
  const request = {
    response: {
      isBoom: true,
      statusCode: statusCodes.notFound,
      stack: 'Mock error stack',
      output: { statusCode: statusCodes.internalServerError }
    }
  }
  const toolkit = createToolkit()

  // Act
  catchAll(request, toolkit)

  // Assert
  assert.deepEqual(toolkit.view.mock.calls[0], [
    'error/page-not-found',
    { pageTitle: 'Page not found', developmentMessage: undefined }
  ])
  assert.deepEqual(toolkit.code.mock.calls[0], [statusCodes.notFound])
  assert.equal(logger.error.mock.calls.length, 0)
})

test("catchAll passes the error's own message to the page in development", () => {
  // Arrange
  vi.stubEnv('NODE_ENV', 'development')
  const request = createBoomRequest(statusCodes.internalServerError)
  request.response.message = 'Upstream timed out'
  const toolkit = createToolkit()

  // Act
  catchAll(request, toolkit)

  // Assert
  assert.equal(
    toolkit.view.mock.calls[0][1].developmentMessage,
    'Upstream timed out'
  )
})

test("catchAll leaves out the error's own message outside development", () => {
  // Arrange
  vi.stubEnv('NODE_ENV', 'production')
  const request = createBoomRequest(statusCodes.internalServerError)
  request.response.message = 'Upstream timed out'
  const toolkit = createToolkit()

  // Act
  catchAll(request, toolkit)

  // Assert
  assert.equal(toolkit.view.mock.calls[0][1].developmentMessage, undefined)
})

test('catchAll does not log the 503 the maintenance plugin answered with', () => {
  // Arrange
  const toolkit = createToolkit()
  const request = {
    plugins: { 'lis-maintenance': { answered: true } },
    response: { statusCode: statusCodes.serviceUnavailable, source: {} }
  }

  // Act
  const result = catchAll(request, toolkit)

  // Assert
  assert.equal(result, toolkit.continue)
  assert.equal(logger.error.mock.calls.length, 0)
})

test('catchAll logs plain 500 responses before continuing', () => {
  // Arrange
  const toolkit = createToolkit()
  const request = {
    response: {
      statusCode: statusCodes.internalServerError,
      source: {
        message: 'Plain 500 response'
      }
    }
  }

  // Act
  const result = catchAll(request, toolkit)

  // Assert
  assert.equal(result, toolkit.continue)
  assert.deepEqual(logger.error.mock.calls[0], ['Plain 500 response'])
  assert.equal(toolkit.view.mock.calls.length, 0)
})
