// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest'

describe('google-tag.js', () => {
  afterEach(() => {
    delete window.dataLayer
    delete window.gtag
    vi.resetModules()
  })

  test('starts the data layer with the js command as an arguments object', async () => {
    // Act
    await import('./google-tag.js')

    // Assert
    expect(window.dataLayer).toHaveLength(1)
    expect(Object.prototype.toString.call(window.dataLayer[0])).toBe(
      '[object Arguments]'
    )
    expect(window.dataLayer[0][0]).toBe('js')
    expect(window.dataLayer[0][1]).toBeInstanceOf(Date)
  })

  test('keeps entries already in the data layer', async () => {
    // Arrange
    window.dataLayer = [{ event: 'earlier' }]

    // Act
    await import('./google-tag.js')

    // Assert
    expect(window.dataLayer).toHaveLength(2)
    expect(window.dataLayer[0]).toEqual({ event: 'earlier' })
  })

  test('leaves gtag on the window for tags to send commands with', async () => {
    // Arrange
    await import('./google-tag.js')

    // Act
    window.gtag('event', 'example')

    // Assert
    expect(Array.from(window.dataLayer[1])).toEqual(['event', 'example'])
  })
})
