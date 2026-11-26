// @vitest-environment jsdom
import { createAll } from 'govuk-frontend'
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest'

import { ScrollablePane } from './scrollable-pane.js'

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

function renderWrapper(widths, labelAttributes = 'aria-label="Animals"') {
  document.body.innerHTML = `<div data-module="lis-scrollable-pane" tabindex="0" role="region" ${labelAttributes}><table></table></div>`
  const wrapper = document.querySelector('[data-module]')
  setWidths(wrapper, widths)
  return wrapper
}

describe('ScrollablePane', () => {
  beforeAll(() => {
    document.body.classList.add('govuk-frontend-supported')
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    resizeObservers.length = 0
    document.body.innerHTML = ''
  })

  test('removes the focusable region attributes when the content does not overflow', () => {
    // Arrange
    const wrapper = renderWrapper({ scrollWidth: 300, clientWidth: 300 })

    // Act
    createAll(ScrollablePane)

    // Assert
    expect(wrapper.hasAttribute('tabindex')).toBe(false)
    expect(wrapper.hasAttribute('role')).toBe(false)
    expect(wrapper.hasAttribute('aria-label')).toBe(false)
    expect(wrapper.getAttribute('data-original-aria-label')).toBe('Animals')
    expect(wrapper.hasAttribute('data-lis-scrollable-pane-init')).toBe(true)
  })

  test('keeps the focusable region attributes when the content overflows', () => {
    // Arrange
    const wrapper = renderWrapper({ scrollWidth: 600, clientWidth: 300 })

    // Act
    createAll(ScrollablePane)

    // Assert
    expect(wrapper.getAttribute('tabindex')).toBe('0')
    expect(wrapper.getAttribute('role')).toBe('region')
    expect(wrapper.getAttribute('aria-label')).toBe('Animals')
  })

  test('restores the attributes, including the label, when the content starts to overflow when resized', () => {
    // Arrange
    const wrapper = renderWrapper({ scrollWidth: 300, clientWidth: 300 })
    createAll(ScrollablePane)

    // Act
    setWidths(wrapper, { scrollWidth: 600, clientWidth: 300 })
    triggerResize()

    // Assert
    expect(wrapper.getAttribute('tabindex')).toBe('0')
    expect(wrapper.getAttribute('role')).toBe('region')
    expect(wrapper.getAttribute('aria-label')).toBe('Animals')
  })

  test('removes the attributes again when the content stops overflowing when resized', () => {
    // Arrange
    const wrapper = renderWrapper({ scrollWidth: 600, clientWidth: 300 })
    createAll(ScrollablePane)

    // Act
    setWidths(wrapper, { scrollWidth: 300, clientWidth: 300 })
    triggerResize()

    // Assert
    expect(wrapper.hasAttribute('tabindex')).toBe(false)
    expect(wrapper.hasAttribute('aria-label')).toBe(false)
  })

  test('adds no role or tabindex to a pane without a label when the content overflows', () => {
    // Arrange
    document.body.innerHTML =
      '<div data-module="lis-scrollable-pane"><table></table></div>'
    const wrapper = document.querySelector('[data-module]')
    setWidths(wrapper, { scrollWidth: 600, clientWidth: 300 })

    // Act
    createAll(ScrollablePane)
    triggerResize()

    // Assert
    expect(wrapper.hasAttribute('role')).toBe(false)
    expect(wrapper.hasAttribute('tabindex')).toBe(false)
  })

  test('leaves a pane without a label unchanged when the content fits', () => {
    // Arrange
    document.body.innerHTML =
      '<div data-module="lis-scrollable-pane"><table></table></div>'
    const wrapper = document.querySelector('[data-module]')
    setWidths(wrapper, { scrollWidth: 300, clientWidth: 300 })

    // Act
    createAll(ScrollablePane)
    triggerResize()

    // Assert
    expect(wrapper.hasAttribute('role')).toBe(false)
    expect(wrapper.hasAttribute('tabindex')).toBe(false)
    expect(wrapper.getAttributeNames()).toEqual([
      'data-module',
      'data-lis-scrollable-pane-init'
    ])
  })

  test('keeps an aria-labelledby to restore when the content does not overflow', () => {
    // Arrange
    const wrapper = renderWrapper(
      { scrollWidth: 300, clientWidth: 300 },
      'aria-labelledby="animals-heading"'
    )

    // Act
    createAll(ScrollablePane)

    // Assert
    expect(wrapper.hasAttribute('aria-labelledby')).toBe(false)
    expect(wrapper.getAttribute('data-original-aria-labelledby')).toBe(
      'animals-heading'
    )
    expect(wrapper.hasAttribute('data-original-aria-label')).toBe(false)
  })

  test('keeps an aria-labelledby when the content overflows', () => {
    // Arrange
    const wrapper = renderWrapper(
      { scrollWidth: 600, clientWidth: 300 },
      'aria-labelledby="animals-heading"'
    )

    // Act
    createAll(ScrollablePane)

    // Assert
    expect(wrapper.getAttribute('role')).toBe('region')
    expect(wrapper.getAttribute('aria-labelledby')).toBe('animals-heading')
    expect(wrapper.hasAttribute('aria-label')).toBe(false)
  })

  test('restores the aria-labelledby when the content starts to overflow when resized', () => {
    // Arrange
    const wrapper = renderWrapper(
      { scrollWidth: 300, clientWidth: 300 },
      'aria-labelledby="animals-heading"'
    )
    createAll(ScrollablePane)

    // Act
    setWidths(wrapper, { scrollWidth: 600, clientWidth: 300 })
    triggerResize()

    // Assert
    expect(wrapper.getAttribute('tabindex')).toBe('0')
    expect(wrapper.getAttribute('role')).toBe('region')
    expect(wrapper.getAttribute('aria-labelledby')).toBe('animals-heading')
    expect(wrapper.hasAttribute('aria-label')).toBe(false)
  })

  test('watches both the pane and its content for size changes', () => {
    // Arrange
    const wrapper = renderWrapper({ scrollWidth: 300, clientWidth: 300 })

    // Act
    createAll(ScrollablePane)

    // Assert
    expect(resizeObservers[0].observed).toEqual([
      wrapper,
      wrapper.querySelector('table')
    ])
  })

  test('throws when constructed twice on the same element', () => {
    // Arrange
    const wrapper = renderWrapper({ scrollWidth: 300, clientWidth: 300 })
    const first = new ScrollablePane(wrapper)

    // Act
    let second, error
    try {
      second = new ScrollablePane(wrapper)
    } catch (e) {
      error = e
    }

    // Assert
    expect(first).toBeInstanceOf(ScrollablePane)
    expect(second).toBeUndefined()
    expect(error).toBeDefined()
    expect(error.name).toBe('InitError')
    expect(resizeObservers).toHaveLength(1)
  })

  test('does not double-apply when createAll runs twice on the same document', () => {
    // Arrange
    renderWrapper({ scrollWidth: 300, clientWidth: 300 })
    const log = vi.spyOn(console, 'log').mockReturnValueOnce(undefined)
    createAll(ScrollablePane)

    // Act
    createAll(ScrollablePane)

    // Assert
    expect(resizeObservers).toHaveLength(1)
    expect(log).toHaveBeenCalledTimes(1)
  })
})
