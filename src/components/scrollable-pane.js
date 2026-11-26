import { Component } from 'govuk-frontend'

const LABEL_ATTRIBUTES = ['aria-label', 'aria-labelledby']

/**
 * @param {string} attribute - the label attribute
 * @returns {string} the attribute that keeps the label while it is removed
 */
function originalAttribute(attribute) {
  return `data-original-${attribute}`
}

/**
 * Drops the tab stop from a scrollable region while its content fits.
 */
export class ScrollablePane extends Component {
  static moduleName = 'lis-scrollable-pane'

  /**
   * @param {object} $root - the scrollable pane element
   */
  constructor($root) {
    super($root)

    // A pane without a label is a plain wrapper: a focus stop with no
    // accessible name would fail WCAG 4.1.2, so it is left alone.
    if (!LABEL_ATTRIBUTES.some((attribute) => $root.hasAttribute(attribute))) {
      return
    }

    this.update()

    // Watches the content as well as the pane: the content can widen after
    // start-up without the window resizing, for example when the font loads.
    const resizeObserver = new globalThis.ResizeObserver(() => this.update())
    resizeObserver.observe(this.$root)
    for (const $child of this.$root.children) {
      resizeObserver.observe($child)
    }
  }

  /**
   * Applies the focusable region attributes only while the content overflows.
   */
  update() {
    if (this.$root.scrollWidth > this.$root.clientWidth) {
      this.makeFocusableRegion()
    } else {
      this.removeFocusableRegion()
    }
  }

  /**
   * Lets keyboard users reach the region to scroll it.
   */
  makeFocusableRegion() {
    for (const attribute of LABEL_ATTRIBUTES) {
      const label =
        this.$root.getAttribute(originalAttribute(attribute)) ??
        this.$root.getAttribute(attribute)

      if (label !== null) {
        this.$root.setAttribute(attribute, label)
      }
    }
    this.$root.setAttribute('tabindex', '0')
    this.$root.setAttribute('role', 'region')
  }

  /**
   * Avoids an empty tab stop on content that fits, keeping the label to restore later.
   */
  removeFocusableRegion() {
    for (const attribute of LABEL_ATTRIBUTES) {
      const label = this.$root.getAttribute(attribute)

      if (label !== null) {
        this.$root.setAttribute(originalAttribute(attribute), label)
      }
      this.$root.removeAttribute(attribute)
    }
    this.$root.removeAttribute('tabindex')
    this.$root.removeAttribute('role')
  }
}
