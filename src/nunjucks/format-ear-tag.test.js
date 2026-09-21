import { describe, expect, test } from 'vitest'

import { formatEarTag, formatEarTagSpoken } from './format-ear-tag.js'

describe('formatEarTag()', () => {
  test('it splits an ear tag into country code, herd mark and animal number', () => {
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

  test('it returns an ear tag with another country code as-is', () => {
    // Arrange
    const earTag = 'IE151234567890'

    // Act
    const formatted = formatEarTag(earTag)

    // Assert
    expect(formatted).toBe('IE151234567890')
  })

  test('it returns an ear tag of the wrong length as-is', () => {
    // Arrange
    const earTag = 'UK32453711323'

    // Act
    const formatted = formatEarTag(earTag)

    // Assert
    expect(formatted).toBe('UK32453711323')
  })

  test('it returns an ear tag in another format exactly as given', () => {
    // Arrange
    const earTag = 'ab 1234/x'

    // Act
    const formatted = formatEarTag(earTag)

    // Assert
    expect(formatted).toBe('ab 1234/x')
  })
})

describe('formatEarTagSpoken()', () => {
  test('it spells out an ear tag, pausing between the country code, herd mark and animal number', () => {
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

  test('it just spaces out each character of an ear tag with another country code', () => {
    // Arrange
    const earTag = 'IE151234567890'

    // Act
    const spoken = formatEarTagSpoken(earTag)

    // Assert
    expect(spoken).toBe('I E 1 5 1 2 3 4 5 6 7 8 9 0')
  })

  test('it just spaces out each character of an ear tag of the wrong length', () => {
    // Arrange
    const earTag = 'UK32453711323'

    // Act
    const spoken = formatEarTagSpoken(earTag)

    // Assert
    expect(spoken).toBe('U K 3 2 4 5 3 7 1 1 3 2 3')
  })

  test('it just spaces out each character of an ear tag in another format', () => {
    // Arrange
    const earTag = 'ab 1234/x'

    // Act
    const spoken = formatEarTagSpoken(earTag)

    // Assert
    expect(spoken).toBe('a b 1 2 3 4 / x')
  })
})
