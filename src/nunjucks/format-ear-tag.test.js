import { describe, expect, test } from 'vitest'

import { formatEarTag } from './format-ear-tag.js'

describe('formatEarTag()', () => {
  test('it splits a UK ear tag into country code, herd mark and animal number', () => {
    // Arrange
    const earTag = 'UK324537113236'

    // Act
    const formatted = formatEarTag(earTag)

    // Assert
    expect(formatted).toBe('UK 324537 113236')
  })

  test('it leaves an already formatted ear tag unchanged', () => {
    // Arrange
    const earTag = 'UK 324537 113236'

    // Act
    const formatted = formatEarTag(earTag)

    // Assert
    expect(formatted).toBe('UK 324537 113236')
  })

  test('it upper-cases the country code', () => {
    // Arrange
    const earTag = 'uk324537113236'

    // Act
    const formatted = formatEarTag(earTag)

    // Assert
    expect(formatted).toBe('UK 324537 113236')
  })

  test('it returns a non-UK ear tag as-is', () => {
    // Arrange
    const earTag = 'IE151234567890'

    // Act
    const formatted = formatEarTag(earTag)

    // Assert
    expect(formatted).toBe('IE151234567890')
  })

  test('it returns a UK ear tag of the wrong length as-is', () => {
    // Arrange
    const earTag = 'UK32453711323'

    // Act
    const formatted = formatEarTag(earTag)

    // Assert
    expect(formatted).toBe('UK32453711323')
  })
})
