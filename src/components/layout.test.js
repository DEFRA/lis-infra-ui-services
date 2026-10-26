// @vitest-environment jsdom
import { NotificationBanner, ServiceNavigation, SkipLink } from 'govuk-frontend'
import { describe, expect, test } from 'vitest'

import { CookieBanner } from './cookie-banner.js'
import { layoutComponents } from './layout.js'

describe('layoutComponents', () => {
  test('contains the layout components in order', () => {
    // Arrange
    const expected = [
      ServiceNavigation,
      SkipLink,
      NotificationBanner,
      CookieBanner
    ]

    // Act
    const actual = layoutComponents

    // Assert
    expect(actual).toEqual(expected)
  })
})
