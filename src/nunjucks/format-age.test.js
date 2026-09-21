import { describe, expect, test } from 'vitest'

import { formatAge } from './format-age.js'

describe('formatAge()', () => {
  test('it computes whole years and months', () => {
    // Arrange
    const dateOfBirth = '2023-03-10'
    const now = new Date('2026-09-10')

    // Act
    const age = formatAge(dateOfBirth, now)

    // Assert
    expect(age).toBe('3 years, 6 months')
  })

  test('it uses singular units for exactly 1 year and 1 month', () => {
    // Arrange
    const dateOfBirth = '2025-08-10'
    const now = new Date('2026-09-10')

    // Act
    const age = formatAge(dateOfBirth, now)

    // Assert
    expect(age).toBe('1 year, 1 month')
  })

  test('it omits the months when the age is a whole number of years', () => {
    // Arrange
    const dateOfBirth = '2023-08-19'
    const now = new Date('2026-09-11')

    // Act
    const age = formatAge(dateOfBirth, now)

    // Assert
    expect(age).toBe('3 years')
  })

  test('it uses the singular "year" for a whole number of exactly 1 year', () => {
    // Arrange
    const dateOfBirth = '2025-08-19'
    const now = new Date('2026-09-11')

    // Act
    const age = formatAge(dateOfBirth, now)

    // Assert
    expect(age).toBe('1 year')
  })

  test('it shows only the months for an animal under a year old', () => {
    // Arrange
    const dateOfBirth = '2026-03-10'
    const now = new Date('2026-09-10')

    // Act
    const age = formatAge(dateOfBirth, now)

    // Assert
    expect(age).toBe('6 months')
  })

  test('it uses the singular "month" for an animal exactly 1 month old', () => {
    // Arrange
    const dateOfBirth = '2026-08-10'
    const now = new Date('2026-09-10')

    // Act
    const age = formatAge(dateOfBirth, now)

    // Assert
    expect(age).toBe('1 month')
  })

  test('it shows "Less than 1 month" for an animal under a month old', () => {
    // Arrange
    const dateOfBirth = '2026-09-01'
    const now = new Date('2026-09-10')

    // Act
    const age = formatAge(dateOfBirth, now)

    // Assert
    expect(age).toBe('Less than 1 month')
  })

  test('it accepts a Date value', () => {
    // Arrange
    const dateOfBirth = new Date('2023-03-10')
    const now = new Date('2026-09-10')

    // Act
    const age = formatAge(dateOfBirth, now)

    // Assert
    expect(age).toBe('3 years, 6 months')
  })

  test('it returns an empty string when there is no date of birth', () => {
    // Arrange
    const dateOfBirth = null
    const now = new Date('2026-09-10')

    // Act
    const age = formatAge(dateOfBirth, now)

    // Assert
    expect(age).toBe('')
  })

  test('it returns an empty string for an unparseable date of birth', () => {
    // Arrange
    const dateOfBirth = 'not-a-date'
    const now = new Date('2026-09-10')

    // Act
    const age = formatAge(dateOfBirth, now)

    // Assert
    expect(age).toBe('')
  })

  test('it returns an empty string for a date of birth in the future', () => {
    // Arrange
    const dateOfBirth = '2028-01-01'
    const now = new Date('2026-09-10')

    // Act
    const age = formatAge(dateOfBirth, now)

    // Assert
    expect(age).toBe('')
  })
})
