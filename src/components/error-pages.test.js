// @vitest-environment jsdom
import { Button } from 'govuk-frontend'
import { describe, expect, test } from 'vitest'

import { errorPageComponents } from './error-pages.js'

describe('errorPageComponents', () => {
  test('contains the error page components in order', () => {
    // Arrange
    const expected = [Button]

    // Act
    const actual = errorPageComponents

    // Assert
    expect(actual).toEqual(expected)
  })
})
