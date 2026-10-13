import assert from 'node:assert/strict'
import { describe, expect, test } from 'vitest'

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

describe('createNunjucksContextBuilder() hub flags', () => {
  test('marks the request as front office when the caller is the front-office hub', () => {
    // Arrange
    const contextBuilder = createNunjucksContextBuilder({
      config: createConfig(),
      getRequestBasePath: () => '',
      logger: {},
      readFileSync: () => '{}',
      moduleId: 'cattle-register'
    })
    const request = {
      headers: {},
      path: '/',
      auth: { credentials: { user: null, caller: 'lis-hubs-front-office' } }
    }

    // Act
    const context = contextBuilder(request)

    // Assert
    expect(context.isFrontOffice).toBe(true)
    expect(context.isBackOffice).toBe(false)
  })

  test('marks the request as back office when the caller is the back-office hub', () => {
    // Arrange
    const contextBuilder = createNunjucksContextBuilder({
      config: createConfig(),
      getRequestBasePath: () => '',
      logger: {},
      readFileSync: () => '{}',
      moduleId: 'cattle-register'
    })
    const request = {
      headers: {},
      path: '/',
      auth: { credentials: { user: null, caller: 'lis-hubs-back-office' } }
    }

    // Act
    const context = contextBuilder(request)

    // Assert
    expect(context.isFrontOffice).toBe(false)
    expect(context.isBackOffice).toBe(true)
  })

  test('sets neither flag on a request with no credentials', () => {
    // Arrange
    const contextBuilder = createNunjucksContextBuilder({
      config: createConfig(),
      getRequestBasePath: () => '',
      logger: {},
      readFileSync: () => '{}',
      moduleId: 'cattle-register'
    })
    const request = { headers: {}, path: '/', auth: { credentials: null } }

    // Act
    const context = contextBuilder(request)

    // Assert
    expect(context.isFrontOffice).toBe(false)
    expect(context.isBackOffice).toBe(false)
  })

  test('sets neither flag for an unrecognised caller', () => {
    // Arrange
    const contextBuilder = createNunjucksContextBuilder({
      config: createConfig(),
      getRequestBasePath: () => '',
      logger: {},
      readFileSync: () => '{}',
      moduleId: 'cattle-register'
    })
    const request = {
      headers: {},
      path: '/',
      auth: { credentials: { user: null, caller: 'lis-hubs-other' } }
    }

    // Act
    const context = contextBuilder(request)

    // Assert
    expect(context.isFrontOffice).toBe(false)
    expect(context.isBackOffice).toBe(false)
  })
})

describe('createNunjucksContextBuilder() errorPages', () => {
  test('defaults the contact link to the BCMS GOV.UK page and the other links to the root', () => {
    // Arrange
    const contextBuilder = createNunjucksContextBuilder({
      config: createConfig(),
      getRequestBasePath: () => '',
      logger: {},
      readFileSync: () => '{}'
    })
    const request = { headers: {}, path: '/', auth: { credentials: null } }

    // Act
    const context = contextBuilder(request)

    // Assert
    expect(context.errorPages).toEqual({
      contactHref:
        'https://www.gov.uk/government/organisations/british-cattle-movement-service',
      homeHref: '/',
      getStartedHref: '/'
    })
  })

  test('uses the links given in the errorPages option', () => {
    // Arrange
    const contextBuilder = createNunjucksContextBuilder({
      config: createConfig(),
      getRequestBasePath: () => '',
      logger: {},
      readFileSync: () => '{}',
      errorPages: {
        contactHref: 'https://example.com/contact',
        homeHref: '/home',
        getStartedHref: '/start'
      }
    })
    const request = { headers: {}, path: '/', auth: { credentials: null } }

    // Act
    const context = contextBuilder(request)

    // Assert
    expect(context.errorPages).toEqual({
      contactHref: 'https://example.com/contact',
      homeHref: '/home',
      getStartedHref: '/start'
    })
  })

  test('keeps the default for any link the errorPages option leaves out', () => {
    // Arrange
    const contextBuilder = createNunjucksContextBuilder({
      config: createConfig(),
      getRequestBasePath: () => '',
      logger: {},
      readFileSync: () => '{}',
      errorPages: { getStartedHref: '/start', homeHref: undefined }
    })
    const request = { headers: {}, path: '/', auth: { credentials: null } }

    // Act
    const context = contextBuilder(request)

    // Assert
    expect(context.errorPages).toEqual({
      contactHref:
        'https://www.gov.uk/government/organisations/british-cattle-movement-service',
      homeHref: '/',
      getStartedHref: '/start'
    })
  })
})

describe('createNunjucksContextBuilder() hasPermission()', () => {
  test('grants a permission the user holds on the given cph', () => {
    // Arrange
    const contextBuilder = createNunjucksContextBuilder({
      config: createConfig(),
      getRequestBasePath: () => '',
      logger: {},
      readFileSync: () => '{}'
    })
    const user = {
      statements: [
        {
          role: 'keeper',
          cphs: ['12/345/0001'],
          permissions: ['lis-perm-cattle-move-write']
        }
      ]
    }
    const request = { headers: {}, path: '/', auth: { credentials: { user } } }

    // Act
    const result = contextBuilder(request).hasPermission({
      permission: 'lis-perm-cattle-move-write',
      cph: '12/345/0001'
    })

    // Assert
    expect(result).toBe(true)
  })

  test('refuses a permission the user holds only on another cph', () => {
    // Arrange
    const contextBuilder = createNunjucksContextBuilder({
      config: createConfig(),
      getRequestBasePath: () => '',
      logger: {},
      readFileSync: () => '{}'
    })
    const user = {
      statements: [
        {
          role: 'keeper',
          cphs: ['12/345/0001'],
          permissions: ['lis-perm-cattle-move-write']
        }
      ]
    }
    const request = { headers: {}, path: '/', auth: { credentials: { user } } }

    // Act
    const result = contextBuilder(request).hasPermission({
      permission: 'lis-perm-cattle-move-write',
      cph: '98/765/0002'
    })

    // Assert
    expect(result).toBe(false)
  })

  test("grants a permission held everywhere when cph is '*'", () => {
    // Arrange
    const contextBuilder = createNunjucksContextBuilder({
      config: createConfig(),
      getRequestBasePath: () => '',
      logger: {},
      readFileSync: () => '{}'
    })
    const user = {
      statements: [
        {
          role: 'caseworker',
          cphs: '*',
          permissions: ['lis-perm-back-office']
        }
      ]
    }
    const request = { headers: {}, path: '/', auth: { credentials: { user } } }

    // Act
    const result = contextBuilder(request).hasPermission({
      permission: 'lis-perm-back-office',
      cph: '*'
    })

    // Assert
    expect(result).toBe(true)
  })

  test("refuses a permission held only on specific cphs when cph is '*'", () => {
    // Arrange
    const contextBuilder = createNunjucksContextBuilder({
      config: createConfig(),
      getRequestBasePath: () => '',
      logger: {},
      readFileSync: () => '{}'
    })
    const user = {
      statements: [
        {
          role: 'keeper',
          cphs: ['12/345/0001'],
          permissions: ['lis-perm-cattle-move-write']
        }
      ]
    }
    const request = { headers: {}, path: '/', auth: { credentials: { user } } }

    // Act
    const result = contextBuilder(request).hasPermission({
      permission: 'lis-perm-cattle-move-write',
      cph: '*'
    })

    // Assert
    expect(result).toBe(false)
  })

  test('refuses every permission when the user is signed out', () => {
    // Arrange
    const contextBuilder = createNunjucksContextBuilder({
      config: createConfig(),
      getRequestBasePath: () => '',
      logger: {},
      readFileSync: () => '{}'
    })
    const request = { headers: {}, path: '/', auth: { credentials: null } }

    // Act
    const result = contextBuilder(request).hasPermission({
      permission: 'lis-perm-cattle-move-write',
      cph: '12/345/0001'
    })

    // Assert
    expect(result).toBe(false)
  })

  test('throws when no cph is given', () => {
    // Arrange
    const contextBuilder = createNunjucksContextBuilder({
      config: createConfig(),
      getRequestBasePath: () => '',
      logger: {},
      readFileSync: () => '{}'
    })
    const request = { headers: {}, path: '/', auth: { credentials: null } }

    // Act
    let result, error
    try {
      result = contextBuilder(request).hasPermission({
        permission: 'lis-perm-cattle-move-write',
        cph: undefined
      })
    } catch (e) {
      error = e
    }

    // Assert
    expect(result).toBeUndefined()
    expect(error.message).toBe(
      "hasPermission() requires a cph - pass '*' where no holding applies"
    )
  })

  test('throws when no permission is given', () => {
    // Arrange
    const contextBuilder = createNunjucksContextBuilder({
      config: createConfig(),
      getRequestBasePath: () => '',
      logger: {},
      readFileSync: () => '{}'
    })
    const request = { headers: {}, path: '/', auth: { credentials: null } }

    // Act
    let result, error
    try {
      result = contextBuilder(request).hasPermission({
        permission: undefined,
        cph: '12/345/0001'
      })
    } catch (e) {
      error = e
    }

    // Assert
    expect(result).toBeUndefined()
    expect(error.message).toBe('hasPermission() requires a permission')
  })

  test('throws when called with no arguments', () => {
    // Arrange
    const contextBuilder = createNunjucksContextBuilder({
      config: createConfig(),
      getRequestBasePath: () => '',
      logger: {},
      readFileSync: () => '{}'
    })
    const request = { headers: {}, path: '/', auth: { credentials: null } }

    // Act
    let result, error
    try {
      result = contextBuilder(request).hasPermission()
    } catch (e) {
      error = e
    }

    // Assert
    expect(result).toBeUndefined()
    expect(error.message).toBe('hasPermission() requires a permission')
  })
})
