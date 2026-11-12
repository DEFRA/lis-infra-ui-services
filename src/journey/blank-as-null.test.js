import { describe, expect, test } from 'vitest'

import { blankAsNull } from './blank-as-null.js'

describe('blankAsNull()', () => {
  test('it gives a blank answer as null', () => {
    // Arrange
    const answers = { sireEarTagNumber: '', sireName: '' }

    // Act
    const result = blankAsNull(answers)

    // Assert
    expect(result).toEqual({ sireEarTagNumber: null, sireName: null })
  })

  test('it leaves an answer that was given as it is', () => {
    // Arrange
    const answers = { sireEarTagNumber: 'UK123456301550', sireName: '' }

    // Act
    const result = blankAsNull(answers)

    // Assert
    expect(result).toEqual({
      sireEarTagNumber: 'UK123456301550',
      sireName: null
    })
  })
})
