import { describe, expect, test } from 'vitest'

import { trimAnswers } from './trim-answers.js'

describe('trimAnswers()', () => {
  test('it removes the spaces around every answer', () => {
    // Arrange
    const answers = {
      earTagNumber: ' UK123456301550 ',
      dateOfBirth: '1/11/2026 ',
      sex: 'female',
      breed: '  AA'
    }

    // Act
    const result = trimAnswers(answers)

    // Assert
    expect(result).toEqual({
      earTagNumber: 'UK123456301550',
      dateOfBirth: '1/11/2026',
      sex: 'female',
      breed: 'AA'
    })
  })

  test('it leaves a blank answer blank', () => {
    // Arrange
    const answers = { earTagNumber: '   ', breed: '' }

    // Act
    const result = trimAnswers(answers)

    // Assert
    expect(result).toEqual({ earTagNumber: '', breed: '' })
  })
})
