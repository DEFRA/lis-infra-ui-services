import assert from 'node:assert/strict'
import { afterEach, expect, test, vi } from 'vitest'

import { statusCodes } from '../status-codes.js'

const { logger } = vi.hoisted(() => ({
  logger: { error: vi.fn(), warn: vi.fn() }
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

function createBoomRequest(statusCode, error = new Error('Mock error')) {
  return {
    method: 'get',
    path: '/mock-path',
    response: Object.assign(error, { isBoom: true, output: { statusCode } })
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
    assert.deepEqual(toolkit.view.mock.calls[0], [view, { pageTitle }])
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
      pageTitle: 'Sorry, there is a problem with the service'
    }
  ])
  assert.deepEqual(toolkit.code.mock.calls[0], [
    statusCodes.internalServerError
  ])
  assert.deepEqual(logger.error.mock.calls[0], [
    {
      err: request.response,
      http: {
        request: { method: 'get' },
        response: { status_code: statusCodes.internalServerError }
      },
      url: { path: '/mock-path' }
    },
    'Request failed'
  ])
  assert.equal(logger.warn.mock.calls.length, 0)
})

test.each([statusCodes.badRequest, statusCodes.unprocessableEntity])(
  'catchAll warns about a %i with the error',
  (statusCode) => {
    // Arrange
    const request = createBoomRequest(statusCode, new Error('Invalid input'))
    const toolkit = createToolkit()

    // Act
    catchAll(request, toolkit)

    // Assert
    assert.deepEqual(logger.warn.mock.calls[0], [
      {
        err: request.response,
        http: {
          request: { method: 'get' },
          response: { status_code: statusCode }
        },
        url: { path: '/mock-path' }
      },
      'Request rejected'
    ])
    assert.equal(logger.error.mock.calls.length, 0)
  }
)

test.each([
  statusCodes.notFound,
  statusCodes.unauthorized,
  statusCodes.forbidden
])('catchAll does not log a routine %i', (statusCode) => {
  // Arrange
  const request = createBoomRequest(statusCode)

  // Act
  catchAll(request, createToolkit())

  // Assert
  assert.equal(logger.error.mock.calls.length, 0)
  assert.equal(logger.warn.mock.calls.length, 0)
})

test('catchAll prefers a client-attached statusCode over a boomified 500', () => {
  // Arrange
  const request = {
    response: {
      isBoom: true,
      statusCode: statusCodes.notFound,
      output: { statusCode: statusCodes.internalServerError }
    }
  }
  const toolkit = createToolkit()

  // Act
  catchAll(request, toolkit)

  // Assert
  assert.deepEqual(toolkit.view.mock.calls[0], [
    'error/page-not-found',
    { pageTitle: 'Page not found' }
  ])
  assert.deepEqual(toolkit.code.mock.calls[0], [statusCodes.notFound])
  assert.equal(logger.error.mock.calls.length, 0)
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

test('catchAll logs the error behind plain 500 responses before continuing', () => {
  // Arrange
  const toolkit = createToolkit()
  const sourceError = new Error('Plain 500 response')
  const request = {
    method: 'post',
    path: '/plain',
    response: {
      statusCode: statusCodes.internalServerError,
      source: sourceError
    }
  }

  // Act
  const result = catchAll(request, toolkit)

  // Assert
  assert.equal(result, toolkit.continue)
  assert.deepEqual(logger.error.mock.calls[0], [
    {
      err: sourceError,
      http: {
        request: { method: 'post' },
        response: { status_code: statusCodes.internalServerError }
      },
      url: { path: '/plain' }
    },
    'Request failed'
  ])
  assert.equal(toolkit.view.mock.calls.length, 0)
})

test('catchAll falls back to a generated error when none is attached', () => {
  // Arrange
  const request = {
    method: 'get',
    path: '/x',
    response: { statusCode: statusCodes.internalServerError, source: {} }
  }

  // Act
  catchAll(request, createToolkit())

  // Assert
  expect(logger.error.mock.calls[0][0].err.message).toBe(
    'Request failed with status 500'
  )
})

test('catchAll logs the message of a plain 500 response whose source has one', () => {
  // Arrange
  const request = {
    method: 'get',
    path: '/x',
    response: {
      statusCode: statusCodes.internalServerError,
      source: { message: 'Something broke' }
    }
  }

  // Act
  catchAll(request, createToolkit())

  // Assert
  expect(logger.error.mock.calls[0][0].err.message).toBe('Something broke')
})
