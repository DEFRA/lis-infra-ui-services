import assert from 'node:assert/strict'
import { test } from 'vitest'

import { createRequestLoggerPlugin } from './request-logger.js'

test('creates a request logger and ignores standard infrastructure paths', () => {
  const plugin = createRequestLoggerPlugin({ loggerOptions: { level: 'warn' } })

  assert.equal(plugin.options.level, 'warn')
  assert.equal(
    plugin.options.ignoreFunc(null, { path: '/public/app.js' }),
    true
  )
  assert.equal(plugin.options.ignoreFunc(null, { path: '/health' }), true)
  assert.equal(plugin.options.ignoreFunc(null, { path: '/favicon.ico' }), true)
  assert.equal(plugin.options.ignoreFunc(null, { path: '/profile' }), false)
})

test('accepts a custom ignore function', () => {
  const ignoreFunc = () => true
  const plugin = createRequestLoggerPlugin({ loggerOptions: {}, ignoreFunc })

  assert.equal(plugin.options.ignoreFunc, ignoreFunc)
})
