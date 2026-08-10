import assert from 'node:assert/strict'
import { test, vi } from 'vitest'

import { createStaticFilesPlugin } from './static-files.js'

test('creates favicon and asset routes with cache settings', () => {
  const plugin = createStaticFilesPlugin({
    assetPaths: ['/public', '/assets'],
    staticCacheTimeout: 60000,
    noContentStatusCode: 204
  })
  const route = vi.fn()

  plugin.plugin.register({ route })

  const routes = route.mock.calls[0][0]
  assert.equal(plugin.plugin.name, 'staticFiles')
  assert.equal(routes.length, 3)
  assert.deepEqual(
    routes.slice(1).map(({ path }) => path),
    ['/public/{param*}', '/assets/{param*}']
  )
  assert.deepEqual(routes[1].handler.directory, {
    path: '.',
    redirectToSlash: true
  })
  assert.deepEqual(routes[1].options.cache, {
    expiresIn: 60000,
    privacy: 'private'
  })
})

test('favicon handler returns an empty icon response', () => {
  const plugin = createStaticFilesPlugin({
    assetPaths: [],
    staticCacheTimeout: 1000,
    noContentStatusCode: 204
  })
  let routes
  plugin.plugin.register({ route: (value) => (routes = value) })
  const response = { code: vi.fn(), type: vi.fn() }
  response.code.mockReturnValue(response)
  response.type.mockReturnValue(response)

  assert.equal(routes[0].handler({}, { response: () => response }), response)
  assert.deepEqual(response.code.mock.calls[0], [204])
  assert.deepEqual(response.type.mock.calls[0], ['image/x-icon'])
})
