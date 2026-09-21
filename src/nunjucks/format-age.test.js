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

  test('it shows 0 years for an animal under a year old', () => {
    // Arrange
    const dateOfBirth = '2026-06-01'
    const now = new Date('2026-09-10')

    // Act
    const age = formatAge(dateOfBirth, now)

    // Assert
    expect(age).toBe('0 years, 3 months')
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
})
