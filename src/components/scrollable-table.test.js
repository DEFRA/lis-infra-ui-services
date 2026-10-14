// @vitest-environment jsdom
import { createAll } from 'govuk-frontend'
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest'

import { ScrollableTable } from './scrollable-table.js'

function setWidths(element, { scrollWidth, clientWidth }) {
  Object.defineProperty(element, 'scrollWidth', {
    configurable: true,
    value: scrollWidth
  })
  Object.defineProperty(element, 'clientWidth', {
    configurable: true,
    value: clientWidth
  })
}

const resizeObservers = []

class FakeResizeObserver {
  constructor(callback) {
    this.callback = callback
    this.observed = []
    resizeObservers.push(this)
  }

  observe(element) {
    this.observed.push(element)
  }
}

function triggerResize() {
  for (const resizeObserver of resizeObservers) {
    resizeObserver.callback([])
  }
}

function renderWrapper(widths) {
  document.body.innerHTML =
    '<div data-module="lis-scrollable-table" tabindex="0" role="region" aria-label="Animals"><table></table></div>'
  const wrapper = document.querySelector('[data-module]')
  setWidths(wrapper, widths)
  return wrapper
}

describe('ScrollableTable', () => {
  beforeAll(() => {
    document.body.classList.add('govuk-frontend-supported')
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    resizeObservers.length = 0
    document.body.innerHTML = ''
  })

  test('removes the focusable region attributes when the table does not overflow', () => {
    // Arrange
    const wrapper = renderWrapper({ scrollWidth: 300, clientWidth: 300 })

    // Act
    createAll(ScrollableTable)

    // Assert
    expect(wrapper.hasAttribute('tabindex')).toBe(false)
    expect(wrapper.hasAttribute('role')).toBe(false)
    expect(wrapper.hasAttribute('aria-label')).toBe(false)
    expect(wrapper.getAttribute('data-original-aria-label')).toBe('Animals')
    expect(wrapper.hasAttribute('data-lis-scrollable-table-init')).toBe(true)
  })

  test('keeps the focusable region attributes when the table overflows', () => {
    // Arrange
    const wrapper = renderWrapper({ scrollWidth: 600, clientWidth: 300 })

    // Act
    createAll(ScrollableTable)

    // Assert
    expect(wrapper.getAttribute('tabindex')).toBe('0')
    expect(wrapper.getAttribute('role')).toBe('region')
    expect(wrapper.getAttribute('aria-label')).toBe('Animals')
  })

  test('restores the attributes, including the label, when the table starts to overflow when resized', () => {
    // Arrange
    const wrapper = renderWrapper({ scrollWidth: 300, clientWidth: 300 })
    createAll(ScrollableTable)

    // Act
    setWidths(wrapper, { scrollWidth: 600, clientWidth: 300 })
    triggerResize()

    // Assert
    expect(wrapper.getAttribute('tabindex')).toBe('0')
    expect(wrapper.getAttribute('role')).toBe('region')
    expect(wrapper.getAttribute('aria-label')).toBe('Animals')
  })

  test('removes the attributes again when the table stops overflowing when resized', () => {
    // Arrange
    const wrapper = renderWrapper({ scrollWidth: 600, clientWidth: 300 })
    createAll(ScrollableTable)

    // Act
    setWidths(wrapper, { scrollWidth: 300, clientWidth: 300 })
    triggerResize()

    // Assert
    expect(wrapper.hasAttribute('tabindex')).toBe(false)
    expect(wrapper.hasAttribute('aria-label')).toBe(false)
  })

  test('leaves a wrapper without an aria-label unlabelled when restoring', () => {
    // Arrange
    const wrapper = renderWrapper({ scrollWidth: 300, clientWidth: 300 })
    wrapper.removeAttribute('aria-label')
    createAll(ScrollableTable)

    // Act
    setWidths(wrapper, { scrollWidth: 600, clientWidth: 300 })
    triggerResize()

    // Assert
    expect(wrapper.getAttribute('role')).toBe('region')
    expect(wrapper.hasAttribute('aria-label')).toBe(false)
  })

  test('watches both the wrapper and the table for size changes', () => {
    // Arrange
    const wrapper = renderWrapper({ scrollWidth: 300, clientWidth: 300 })

    // Act
    createAll(ScrollableTable)

    // Assert
    expect(resizeObservers[0].observed).toEqual([
      wrapper,
      wrapper.querySelector('table')
    ])
  })

  test('throws when constructed twice on the same element', () => {
    // Arrange
    const wrapper = renderWrapper({ scrollWidth: 300, clientWidth: 300 })
    const first = new ScrollableTable(wrapper)

    // Act
    let second, error
    try {
      second = new ScrollableTable(wrapper)
    } catch (e) {
      error = e
    }

    // Assert
    expect(first).toBeInstanceOf(ScrollableTable)
    expect(second).toBeUndefined()
    expect(error).toBeDefined()
    expect(error.name).toBe('InitError')
    expect(resizeObservers).toHaveLength(1)
  })

  test('does not double-apply when createAll runs twice on the same document', () => {
    // Arrange
    renderWrapper({ scrollWidth: 300, clientWidth: 300 })
    const log = vi.spyOn(console, 'log').mockReturnValueOnce(undefined)
    createAll(ScrollableTable)

    // Act
    createAll(ScrollableTable)

    // Assert
    expect(resizeObservers).toHaveLength(1)
    expect(log).toHaveBeenCalledTimes(1)
  })
})
