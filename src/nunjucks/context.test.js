import assert from 'node:assert/strict'
import { test } from 'vitest'

import { createNunjucksContextBuilder } from './context.js'

function createConfig(overrides = {}) {
  const values = {
    root: '/workspace/example-app',
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
      error(loggedError, message) {
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

test('createNunjucksContextBuilder falls back to the source asset path without logging in development', () => {
  const loggerMessages = []
  const contextBuilder = createNunjucksContextBuilder({
    config: createConfig(),
    buildNavigation: () => [],
    getRequestBasePath: () => '',
    logger: {
      error(loggedError, message) {
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
  assert.deepEqual(loggerMessages, [])
})

test('createNunjucksContextBuilder resolves sectionName from the module registry when a moduleId is given', () => {
  const loggerMessages = []
  const contextBuilder = createNunjucksContextBuilder({
    config: createConfig(),
    buildNavigation: () => [],
    getRequestBasePath: () => '',
    logger: {
      error(loggedError, message) {
        loggerMessages.push(message)
      }
    },
    readFileSync: () => '{}',
    moduleId: 'cattle-home'
  })

  const context = contextBuilder({ headers: {}, path: '/' })

  assert.equal(context.sectionName, 'Cattle')
  assert.deepEqual(loggerMessages, [])
})

test('createNunjucksContextBuilder leaves sectionName null when no moduleId is given', () => {
  const loggerMessages = []
  const contextBuilder = createNunjucksContextBuilder({
    config: createConfig(),
    buildNavigation: () => [],
    getRequestBasePath: () => '',
    logger: {
      error(loggedError, message) {
        loggerMessages.push(message)
      }
    },
    readFileSync: () => '{}'
  })

  const context = contextBuilder({ headers: {}, path: '/' })

  assert.equal(context.sectionName, null)
  assert.deepEqual(loggerMessages, [])
})

test('createNunjucksContextBuilder logs once when the Vite manifest is unavailable in production', () => {
  const loggerMessages = []
  const contextBuilder = createNunjucksContextBuilder({
    config: createConfig({ isProduction: true }),
    buildNavigation: () => [],
    getRequestBasePath: () => '',
    logger: {
      error(loggedError, message) {
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

test('createNunjucksContextBuilder always sets serviceUrl to the hub root even when rendered under a spoke base path', () => {
  const loggerMessages = []
  const contextBuilder = createNunjucksContextBuilder({
    config: createConfig(),
    buildNavigation: () => [],
    getRequestBasePath: () => '/cattle/register',
    logger: {
      error(loggedError, message) {
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

  assert.equal(context.serviceUrl, '/')
  assert.equal(context.assetPath, '/cattle/register/public/assets')
  assert.deepEqual(loggerMessages, [])
})

function createSignedInContextBuilder() {
  return createNunjucksContextBuilder({
    config: createConfig(),
    buildNavigation: () => [],
    getRequestBasePath: () => '',
    logger: { error: () => undefined },
    readFileSync: () => '{}'
  })
}

test('createNunjucksContextBuilder marks the user signed in from the auth credentials', () => {
  const context = createSignedInContextBuilder()({
    headers: {},
    path: '/',
    auth: { credentials: { user: { sub: 'user-1' } } },
    app: {}
  })

  assert.equal(context.isSignedIn, true)
})

test('createNunjucksContextBuilder ignores the legacy request.app.hubAuth', () => {
  const context = createSignedInContextBuilder()({
    headers: {},
    path: '/',
    app: { hubAuth: { sub: 'user-1' } }
  })

  assert.equal(context.isSignedIn, false)
})

test('createNunjucksContextBuilder marks the user signed out without credentials', () => {
  const context = createSignedInContextBuilder()({
    headers: {},
    path: '/',
    auth: { credentials: null },
    app: {}
  })

  assert.equal(context.isSignedIn, false)
})
