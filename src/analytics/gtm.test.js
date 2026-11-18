import { describe, expect, test } from 'vitest'

import { parseGtmId } from './gtm.js'

describe('parseGtmId()', () => {
  test('returns a container id unchanged', () => {
    // Arrange
    const value = 'GTM-ABC1234'

    // Act
    const gtmId = parseGtmId(value)

    // Assert
    expect(gtmId).toBe('GTM-ABC1234')
  })

  test.each([
    undefined,
    null,
    '',
    123,
    ['GTM-ABC1234'],
    'GTM-',
    'gtm-abc1234',
    'G-ABC1234',
    'GTM-ABC1234&l=evil',
    'GTM-ABC1234"><script>',
    ' GTM-ABC1234',
    'GTM-ABC1234\n'
  ])('returns null for %j', (value) => {
    // Act
    const gtmId = parseGtmId(value)

    // Assert
    expect(gtmId).toBeNull()
  })
})
