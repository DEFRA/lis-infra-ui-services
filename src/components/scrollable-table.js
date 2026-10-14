import { Component } from 'govuk-frontend'

const ARIA_LABEL_ATTRIBUTE = 'aria-label'
const ORIGINAL_LABEL_ATTRIBUTE = 'data-original-aria-label'

/**
 * Drops the tab stop from a scrollable region while its content fits.
 */
export class ScrollableTable extends Component {
  static moduleName = 'lis-scrollable-table'

  /**
   * @param {object} $root - the scrollable wrapper element
   */
  constructor($root) {
    super($root)

    this.update()

    // Watches the table as well as the wrapper: the table can widen after
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
    const label =
      this.$root.getAttribute(ORIGINAL_LABEL_ATTRIBUTE) ??
      this.$root.getAttribute(ARIA_LABEL_ATTRIBUTE)

    if (label !== null) {
      this.$root.setAttribute(ARIA_LABEL_ATTRIBUTE, label)
    }
    this.$root.setAttribute('tabindex', '0')
    this.$root.setAttribute('role', 'region')
  }

  /**
   * Avoids an empty tab stop on a table that fits, keeping the label to restore later.
   */
  removeFocusableRegion() {
    const label = this.$root.getAttribute(ARIA_LABEL_ATTRIBUTE)

    if (label !== null) {
      this.$root.setAttribute(ORIGINAL_LABEL_ATTRIBUTE, label)
    }
    this.$root.removeAttribute('tabindex')
    this.$root.removeAttribute('role')
    this.$root.removeAttribute(ARIA_LABEL_ATTRIBUTE)
  }
}
