import { beforeEach, describe, expect, test, vi } from 'vitest'

import { getBasePathForModule } from '@defra/lis-hubs-infra-registry'
import {
  buildAppPath,
  createBasePathHelpersForConfig,
  getAssetPaths,
  getRequestBasePath,
  getRouteVariants,
  isPrefixedRequest
} from './base-path.js'

vi.mock('@defra/lis-hubs-infra-registry')

const mocks = {
  getBasePathForModule: vi.mocked(getBasePathForModule)
}

describe('isPrefixedRequest()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('detects a forwarded prefix that matches the configured base path', () => {
    // Arrange
    const request = {
      path: '/about',
      headers: {
        'x-forwarded-prefix': '/chicken/move'
      }
    }

    // Act
    const result = isPrefixedRequest({ request, basePath: '/chicken/move' })

    // Assert
    expect(result).toBe(true)
  })

  test('ignores a forwarded prefix that does not match the configured base path', () => {
    // Arrange
    const request = {
      path: '/about',
      headers: {
        'x-forwarded-prefix': '/goat/move'
      }
    }

    // Act
    const result = isPrefixedRequest({ request, basePath: '/chicken/move' })

    // Assert
    expect(result).toBe(false)
  })
})

describe('getRequestBasePath()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('preserves direct requests to the configured base path', () => {
    // Arrange
    const request = {
      path: '/chicken/move/about',
      headers: {}
    }

    // Act
    const result = getRequestBasePath({ request, basePath: '/chicken/move' })

    // Assert
    expect(result).toBe('/chicken/move')
  })
})

describe('buildAppPath()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('uses the forwarded prefix for outbound paths when present', () => {
    // Arrange
    const request = {
      path: '/about',
      headers: {
        'x-forwarded-prefix': '/chicken/move'
      }
    }

    // Act
    const result = buildAppPath({
      request,
      routePath: '/more-info',
      basePath: '/chicken/move'
    })

    // Assert
    expect(result).toBe('/chicken/move/more-info')
  })

  test('returns just the base path for the root route', () => {
    // Arrange
    const request = {
      path: '/chicken/move',
      headers: {}
    }

    // Act
    const result = buildAppPath({
      request,
      routePath: '/',
      basePath: '/chicken/move'
    })

    // Assert
    expect(result).toBe('/chicken/move')
  })

  test('falls back to / for the root route with no base path', () => {
    // Arrange
    const request = {
      path: '/',
      headers: {}
    }

    // Act
    const result = buildAppPath({ request, routePath: '/' })

    // Assert
    expect(result).toBe('/')
  })
})

describe('getRouteVariants()', () => {
  test('only returns the internal route path', () => {
    // Arrange
    const routePath = '/about'

    // Act
    const result = getRouteVariants({ routePath, basePath: '/chicken/move' })

    // Assert
    expect(result).toEqual(['/about'])
  })
})

describe('getAssetPaths()', () => {
  test('only returns the internal asset path', () => {
    // Arrange
    const assetPath = '/public'

    // Act
    const result = getAssetPaths({ basePath: '/chicken/move', assetPath })

    // Assert
    expect(result).toEqual(['/public'])
  })
})

describe('createBasePathHelpersForConfig()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('resolves the base path from the module registry when moduleId is given', () => {
    // Arrange
    mocks.getBasePathForModule.mockReturnValue('/cattle/register')

    // Act
    const helpers = createBasePathHelpersForConfig({
      moduleId: 'cattle-register',
      assetPath: '/public'
    })

    // Assert
    expect(mocks.getBasePathForModule).toHaveBeenCalledWith('cattle-register')
    expect(helpers.getBasePath()).toBe('/cattle/register')
  })

  test('defaults to an empty base path when no moduleId is given', () => {
    // Arrange
    // Act
    const helpers = createBasePathHelpersForConfig({ assetPath: '/public' })

    // Assert
    expect(helpers.getBasePath()).toBe('')
    expect(mocks.getBasePathForModule).not.toHaveBeenCalled()
  })

  test('binds the resolved base path to isPrefixedRequest', () => {
    // Arrange
    mocks.getBasePathForModule.mockReturnValue('/cattle/register')
    const helpers = createBasePathHelpersForConfig({
      moduleId: 'cattle-register',
      assetPath: '/public'
    })
    const request = {
      path: '/cattle/register/about',
      headers: {}
    }

    // Act
    const result = helpers.isPrefixedRequest(request)

    // Assert
    expect(result).toBe(true)
  })

  test('binds the resolved base path to getRequestBasePath', () => {
    // Arrange
    mocks.getBasePathForModule.mockReturnValue('/cattle/register')
    const helpers = createBasePathHelpersForConfig({
      moduleId: 'cattle-register',
      assetPath: '/public'
    })
    const request = {
      path: '/cattle/register/about',
      headers: {}
    }

    // Act
    const result = helpers.getRequestBasePath(request)

    // Assert
    expect(result).toBe('/cattle/register')
  })

  test('binds the resolved base path to buildAppPath', () => {
    // Arrange
    mocks.getBasePathForModule.mockReturnValue('/cattle/register')
    const helpers = createBasePathHelpersForConfig({
      moduleId: 'cattle-register',
      assetPath: '/public'
    })
    const request = {
      path: '/cattle/register/about',
      headers: {}
    }

    // Act
    const result = helpers.buildAppPath(request, '/more-info')

    // Assert
    expect(result).toBe('/cattle/register/more-info')
  })

  test('binds the resolved base path to getRouteVariants', () => {
    // Arrange
    mocks.getBasePathForModule.mockReturnValue('/cattle/register')
    const helpers = createBasePathHelpersForConfig({
      moduleId: 'cattle-register',
      assetPath: '/public'
    })

    // Act
    const result = helpers.getRouteVariants('/about')

    // Assert
    expect(result).toEqual(['/about'])
  })

  test('defaults buildAppPath and getRouteVariants to the root route path', () => {
    // Arrange
    mocks.getBasePathForModule.mockReturnValue('/cattle/register')
    const helpers = createBasePathHelpersForConfig({
      moduleId: 'cattle-register',
      assetPath: '/public'
    })
    const request = {
      path: '/cattle/register',
      headers: {}
    }

    // Act
    const appPath = helpers.buildAppPath(request)
    const routeVariants = helpers.getRouteVariants()

    // Assert
    expect(appPath).toBe('/cattle/register')
    expect(routeVariants).toEqual(['/'])
  })

  test('binds the configured asset path to getAssetPaths', () => {
    // Arrange
    const helpers = createBasePathHelpersForConfig({ assetPath: '/public' })

    // Act
    const result = helpers.getAssetPaths()

    // Assert
    expect(result).toEqual(['/public'])
  })
})
