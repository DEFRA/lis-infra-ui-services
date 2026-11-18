import { describe, expect, test } from 'vitest'

import { createNunjucksContextBuilder } from './context.js'

function createConfig() {
  const values = {
    root: '/workspace/example-app',
    assetPath: '/public',
    serviceName: 'Example service',
    isProduction: false
  }

  return {
    get(key) {
      return values[key]
    }
  }
}

describe('createNunjucksContextBuilder() gtmId', () => {
  test('gives a hub the container id it was built with', () => {
    // Arrange
    const contextBuilder = createNunjucksContextBuilder({
      config: createConfig(),
      logger: {},
      readFileSync: () => '{}',
      gtmId: 'GTM-HUB1234'
    })
    const request = { headers: {}, path: '/' }

    // Act
    const context = contextBuilder(request)

    // Assert
    expect(context.gtmId).toBe('GTM-HUB1234')
  })

  test('ignores a container id header sent to a hub', () => {
    // Arrange
    const contextBuilder = createNunjucksContextBuilder({
      config: createConfig(),
      logger: {},
      readFileSync: () => '{}'
    })
    const request = { headers: { 'x-lis-gtm-id': 'GTM-EVIL' }, path: '/' }

    // Act
    const context = contextBuilder(request)

    // Assert
    expect(context.gtmId).toBeNull()
  })

  test('gives a hub no container id when it was built with a malformed one', () => {
    // Arrange
    const contextBuilder = createNunjucksContextBuilder({
      config: createConfig(),
      logger: {},
      readFileSync: () => '{}',
      gtmId: 'GTM-HUB1234"><script>'
    })
    const request = { headers: {}, path: '/' }

    // Act
    const context = contextBuilder(request)

    // Assert
    expect(context.gtmId).toBeNull()
  })

  test('gives a spoke the container id in the header from the hub', () => {
    // Arrange
    const contextBuilder = createNunjucksContextBuilder({
      config: createConfig(),
      logger: {},
      readFileSync: () => '{}',
      moduleId: 'cattle-home'
    })
    const request = { headers: { 'x-lis-gtm-id': 'GTM-HUB1234' }, path: '/' }

    // Act
    const context = contextBuilder(request)

    // Assert
    expect(context.gtmId).toBe('GTM-HUB1234')
  })

  test.each([
    ['no header', {}],
    ['a malformed header', { 'x-lis-gtm-id': 'GTM-HUB1234"><script>' }]
  ])('gives a spoke no container id for %s', (_case, headers) => {
    // Arrange
    const contextBuilder = createNunjucksContextBuilder({
      config: createConfig(),
      logger: {},
      readFileSync: () => '{}',
      moduleId: 'cattle-home'
    })
    const request = { headers, path: '/' }

    // Act
    const context = contextBuilder(request)

    // Assert
    expect(context.gtmId).toBeNull()
  })

  test('gives no container id without a request', () => {
    // Arrange
    const contextBuilder = createNunjucksContextBuilder({
      config: createConfig(),
      logger: {},
      readFileSync: () => '{}',
      moduleId: 'cattle-home'
    })

    // Act
    const context = contextBuilder()

    // Assert
    expect(context.gtmId).toBeNull()
  })
})
