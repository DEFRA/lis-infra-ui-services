import { beforeEach, describe, expect, test, vi } from 'vitest'

import { getMountPath } from '@defra/lis-hubs-infra-registry'
import { createAssetPathHelpers, getAssetRoot } from './asset-path.js'

vi.mock('@defra/lis-hubs-infra-registry', () => ({ getMountPath: vi.fn() }))

const mocks = {
  getMountPath: vi.mocked(getMountPath)
}

describe('getAssetRoot()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('is the assets mount of the module when a moduleId is given', () => {
    // Arrange
    mocks.getMountPath.mockReturnValue('/assets/cattle-register')

    // Act
    const result = getAssetRoot({
      moduleId: 'cattle-register',
      assetPath: '/public'
    })

    // Assert
    expect(mocks.getMountPath).toHaveBeenCalledWith('cattle-register', 'assets')
    expect(result).toBe('/assets/cattle-register')
  })

  test('is the configured asset path when no moduleId is given', () => {
    // Act
    const result = getAssetRoot({ assetPath: '/public' })

    // Assert
    expect(result).toBe('/public')
    expect(mocks.getMountPath).not.toHaveBeenCalled()
  })

  test('propagates an unknown module', () => {
    // Arrange
    mocks.getMountPath.mockImplementation(() => {
      throw new Error('No module registered with id "unknown"')
    })

    // Act
    let error
    try {
      getAssetRoot({ moduleId: 'unknown', assetPath: '/public' })
    } catch (e) {
      error = e
    }

    // Assert
    expect(error).toEqual(new Error('No module registered with id "unknown"'))
  })
})

describe('createAssetPathHelpers()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('resolves the asset root once and serves assets there', () => {
    // Arrange
    mocks.getMountPath.mockReturnValue('/assets/cattle-register')

    // Act
    const helpers = createAssetPathHelpers({
      moduleId: 'cattle-register',
      assetPath: '/public'
    })

    // Assert
    expect(helpers.getAssetRoot()).toBe('/assets/cattle-register')
    expect(helpers.getAssetPaths()).toEqual(['/assets/cattle-register'])
    expect(mocks.getMountPath).toHaveBeenCalledTimes(1)
  })

  test('serves a hub its own asset path', () => {
    // Act
    const helpers = createAssetPathHelpers({ assetPath: '/public' })

    // Assert
    expect(helpers.getAssetRoot()).toBe('/public')
    expect(helpers.getAssetPaths()).toEqual(['/public'])
  })
})
