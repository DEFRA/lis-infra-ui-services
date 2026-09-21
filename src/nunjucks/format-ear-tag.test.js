import { describe, expect, test } from 'vitest'

import { formatEarTag, formatEarTagSpoken } from './format-ear-tag.js'

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

describe('formatEarTagSpoken()', () => {
  test('it spells out a UK ear tag, pausing between the country code, herd mark and animal number', () => {
    // Arrange
    const earTag = 'UK324537113236'

    // Act
    const spoken = formatEarTagSpoken(earTag)

    // Assert
    expect(spoken).toBe('U K, 3 2 4 5 3 7, 1 1 3 2 3 6')
  })

  test('it spells out an already formatted ear tag the same way', () => {
    // Arrange
    const earTag = 'UK 324537 113236'

    // Act
    const spoken = formatEarTagSpoken(earTag)

    // Assert
    expect(spoken).toBe('U K, 3 2 4 5 3 7, 1 1 3 2 3 6')
  })

  test('it spells out a non-UK ear tag as a single group', () => {
    // Arrange
    const earTag = 'IE151234567890'

    // Act
    const spoken = formatEarTagSpoken(earTag)

    // Assert
    expect(spoken).toBe('I E 1 5 1 2 3 4 5 6 7 8 9 0')
  })
})
