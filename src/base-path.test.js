import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
  buildAppPath,
  createBasePathHelpersForConfig,
  getAssetPaths,
  getRequestBasePath,
  getRouteVariants,
  isPrefixedRequest
} from './base-path.js'

test('isPrefixedRequest detects a forwarded prefix that matches the configured base path', () => {
  assert.equal(
    isPrefixedRequest({
      request: {
        path: '/about',
        headers: {
          'x-forwarded-prefix': '/chicken/move'
        }
      },
      basePath: '/chicken/move'
    }),
    true
  )
})

test('isPrefixedRequest ignores a forwarded prefix that does not match the configured base path', () => {
  assert.equal(
    isPrefixedRequest({
      request: {
        path: '/about',
        headers: {
          'x-forwarded-prefix': '/goat/move'
        }
      },
      basePath: '/chicken/move'
    }),
    false
  )
})

test('getRequestBasePath preserves direct requests to the configured base path', () => {
  assert.equal(
    getRequestBasePath({
      request: {
        path: '/chicken/move/about',
        headers: {}
      },
      basePath: '/chicken/move'
    }),
    '/chicken/move'
  )
})

test('buildAppPath uses the forwarded prefix for outbound paths when present', () => {
  assert.equal(
    buildAppPath({
      request: {
        path: '/about',
        headers: {
          'x-forwarded-prefix': '/chicken/move'
        }
      },
      routePath: '/more-info',
      basePath: '/chicken/move'
    }),
    '/chicken/move/more-info'
  )
})

test('getRouteVariants only returns the internal route path', () => {
  assert.deepEqual(
    getRouteVariants({
      routePath: '/about',
      basePath: '/chicken/move'
    }),
    ['/about']
  )
})

test('getAssetPaths only returns the internal asset path', () => {
  assert.deepEqual(
    getAssetPaths({
      basePath: '/chicken/move',
      assetPath: '/public'
    }),
    ['/public']
  )
})

test('createBasePathHelpersForConfig binds config for request and asset helpers', () => {
  const calls = []
  const config = {
    get(key) {
      calls.push(key)

      if (key === 'basePath') {
        return '/chicken/move'
      }

      if (key === 'assetPath') {
        return '/public'
      }
    }
  }
  const helpers = createBasePathHelpersForConfig(config)

  assert.equal(
    helpers.getRequestBasePath({
      path: '/about',
      headers: {
        'x-forwarded-prefix': '/chicken/move'
      }
    }),
    '/chicken/move'
  )
  assert.deepEqual(helpers.getAssetPaths(), ['/public'])
  assert.deepEqual(calls, ['basePath', 'basePath', 'assetPath'])
})
