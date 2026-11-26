// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { ScrollablePane } from './scrollable-pane.js'
import { ScrollableTable } from './scrollable-table.js'

describe('ScrollableTable', () => {
  test('is the scrollable pane, so it starts the pane module', () => {
    // Arrange
    const alias = ScrollableTable

    // Act
    const moduleName = alias.moduleName

    // Assert
    expect(alias).toBe(ScrollablePane)
    expect(moduleName).toBe('lis-scrollable-pane')
  })
})
