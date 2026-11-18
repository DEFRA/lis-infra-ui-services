import Blankie from 'blankie'
import { describe, expect, test } from 'vitest'

import { contentSecurityPolicy } from './content-security-policy.js'

describe('contentSecurityPolicy', () => {
  test('is the Blankie plugin', () => {
    // Act
    const { plugin } = contentSecurityPolicy

    // Assert
    expect(plugin).toBe(Blankie)
  })

  test('allows scripts from the service, GOV.UK Frontend by its hash, and Google Tag Manager only', () => {
    // Act
    const { scriptSrc, generateNonces } = contentSecurityPolicy.options

    // Assert
    expect(scriptSrc).toEqual([
      'self',
      "'sha256-GUQ5ad8JK5KmEWmROf3LZd9ge94daqNvd8xy9YS1iDw='",
      'https://*.googletagmanager.com'
    ])
    expect(generateNonces).toBe(false)
  })

  test('allows analytics to report to Google', () => {
    // Act
    const { connectSrc, imgSrc } = contentSecurityPolicy.options

    // Assert
    expect(connectSrc).toEqual([
      'self',
      'wss',
      'data:',
      'https://*.googletagmanager.com',
      'https://*.google-analytics.com',
      'https://*.analytics.google.com'
    ])
    expect(imgSrc).toEqual([
      'self',
      'data:',
      'https://*.googletagmanager.com',
      'https://*.google-analytics.com',
      'https://*.analytics.google.com'
    ])
  })

  test('allows no inline styles, framing, plugins or form posts elsewhere', () => {
    // Act
    const { styleSrc, frameAncestors, objectSrc, formAction, defaultSrc } =
      contentSecurityPolicy.options

    // Assert
    expect(styleSrc).toEqual(['self'])
    expect(frameAncestors).toEqual(['none'])
    expect(objectSrc).toEqual(['none'])
    expect(formAction).toEqual(['self'])
    expect(defaultSrc).toEqual(['self'])
  })
})
