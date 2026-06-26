import assert from 'node:assert/strict'
import test from 'node:test'
import { mock } from 'node:test'

import { statusCodes } from '../status-codes.js'
import { catchAll } from './index.js'

function createToolkit() {
  const view = mock.fn(() => toolkit)
  const code = mock.fn(() => toolkit)
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
    },
    logger: {
      error: mock.fn()
    }
  }
}

test('catchAll continues when the response is not Boom', () => {
  const toolkit = createToolkit()
  const result = catchAll({ response: {} }, toolkit)

  assert.equal(result, toolkit.continue)
  assert.equal(toolkit.view.mock.calls.length, 0)
})

test('catchAll renders the expected not found page', () => {
  const request = createBoomRequest(statusCodes.notFound)
  const toolkit = createToolkit()

  catchAll(request, toolkit)

  assert.deepEqual(toolkit.view.mock.calls[0].arguments, [
    'error/index',
    {
      pageTitle: 'Page not found',
      heading: statusCodes.notFound,
      message: 'Page not found'
    }
  ])
  assert.deepEqual(toolkit.code.mock.calls[0].arguments, [statusCodes.notFound])
  assert.equal(request.logger.error.mock.calls.length, 0)
})

test('catchAll logs and renders generic content for server errors', () => {
  const request = createBoomRequest(statusCodes.internalServerError)
  const toolkit = createToolkit()

  catchAll(request, toolkit)

  assert.deepEqual(toolkit.view.mock.calls[0].arguments, [
    'error/index',
    {
      pageTitle: 'Something went wrong',
      heading: statusCodes.internalServerError,
      message: 'Something went wrong'
    }
  ])
  assert.deepEqual(toolkit.code.mock.calls[0].arguments, [
    statusCodes.internalServerError
  ])
  assert.deepEqual(request.logger.error.mock.calls[0].arguments, [
    'Mock error stack'
  ])
})

test('catchAll logs plain 500 responses before continuing', () => {
  const toolkit = createToolkit()
  const request = {
    response: {
      statusCode: statusCodes.internalServerError,
      source: {
        message: 'Plain 500 response'
      }
    },
    logger: {
      error: mock.fn()
    }
  }

  const result = catchAll(request, toolkit)

  assert.equal(result, toolkit.continue)
  assert.deepEqual(request.logger.error.mock.calls[0].arguments, [
    'Plain 500 response'
  ])
  assert.equal(toolkit.view.mock.calls.length, 0)
})
