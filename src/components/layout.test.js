// @vitest-environment jsdom
import { ServiceNavigation, SkipLink } from 'govuk-frontend'
import { describe, expect, test } from 'vitest'

import { layoutComponents } from './layout.js'

describe('layoutComponents', () => {
  test('contains the layout components in order', () => {
    // Arrange
    const expected = [ServiceNavigation, SkipLink]

    // Act
    const actual = layoutComponents

    // Assert
    expect(actual).toEqual(expected)
  })
})
