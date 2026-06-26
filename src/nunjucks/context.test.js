import assert from 'node:assert/strict'
import test from 'node:test'

import { createNunjucksContextBuilder } from './context.js'

function createConfig(overrides = {}) {
  const values = {
    root: '/tmp/example-app',
    assetPath: '/public',
    serviceName: 'Example service',
    isProduction: false,
    ...overrides
  }

  return {
    get(key) {
      return values[key]
    }
  }
}

test('createNunjucksContextBuilder resolves built asset paths from the Vite manifest in development', () => {
  const loggerMessages = []
  const contextBuilder = createNunjucksContextBuilder({
    config: createConfig(),
    buildNavigation: () => [],
    getRequestBasePath: () => '',
    logger: {
      error(message) {
        loggerMessages.push(message)
      }
    },
    readFileSync() {
      return JSON.stringify({
        'src/client/stylesheets/application.scss': {
          file: 'assets/application-123.css'
        }
      })
    }
  })

  const context = contextBuilder({ headers: {}, path: '/' })

  assert.equal(
    context.getAssetPath('src/client/stylesheets/application.scss'),
    '/public/assets/application-123.css'
  )
  assert.deepEqual(loggerMessages, [])
})

test('createNunjucksContextBuilder falls back to the source asset path when the Vite manifest is unavailable', () => {
  const loggerMessages = []
  const contextBuilder = createNunjucksContextBuilder({
    config: createConfig(),
    buildNavigation: () => [],
    getRequestBasePath: () => '',
    logger: {
      error(message) {
        loggerMessages.push(message)
      }
    },
    readFileSync() {
      throw new Error('manifest missing')
    }
  })

  const context = contextBuilder({ headers: {}, path: '/' })

  assert.equal(
    context.getAssetPath('src/client/stylesheets/application.scss'),
    '/public/src/client/stylesheets/application.scss'
  )
  assert.deepEqual(loggerMessages, ['Vite manifest.json not found'])
})
