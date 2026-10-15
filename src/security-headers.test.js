import assert from 'node:assert/strict'
import hapi from '@hapi/hapi'
import { test } from 'vitest'

import { securityHeaders } from './security-headers.js'

async function buildServer() {
  const server = hapi.server()
  await server.register(securityHeaders)
  server.route({ method: 'GET', path: '/ok', handler: () => 'ok' })
  server.route({
    method: 'GET',
    path: '/boom',
    handler: () => {
      throw new Error('nope')
    }
  })
  return server
}

test('sets the hardening headers on a normal response', async () => {
  const server = await buildServer()

  const { statusCode, headers } = await server.inject('/ok')

  assert.equal(statusCode, 200)
  assert.equal(
    headers['strict-transport-security'],
    'max-age=31536000; includeSubDomains'
  )
  assert.equal(headers['x-content-type-options'], 'nosniff')
  assert.equal(headers['referrer-policy'], 'same-origin')
  assert.equal(
    headers['permissions-policy'],
    'camera=(), microphone=(), geolocation=()'
  )
})

test('sets the hardening headers on a Boom error response', async () => {
  const server = await buildServer()

  const { statusCode, headers } = await server.inject('/boom')

  assert.equal(statusCode, 500)
  assert.equal(headers['x-content-type-options'], 'nosniff')
  assert.equal(headers['referrer-policy'], 'same-origin')
  assert.equal(
    headers['strict-transport-security'],
    'max-age=31536000; includeSubDomains'
  )
})
