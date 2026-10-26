import { Component } from 'govuk-frontend'

import {
  COOKIES_POLICY_COOKIE_NAME,
  createCookiesPolicy,
  serialiseCookiesPolicy
} from '../cookies/cookies-policy.js'
import { seconds } from '../duration.js'

/**
 * Progressive enhancement for the cookie banner: records the choice in the
 * consent cookie without a round trip and swaps the question for the
 * confirmation. Without JavaScript the form posts to the cookies page.
 */
export class CookieBanner extends Component {
  static moduleName = 'lis-cookie-banner'

  /**
   * @param {object} $root - the banner region
   */
  constructor($root) {
    super($root)

    this.$question = this.$root.querySelector('[data-cookie-banner-question]')
    this.$confirmation = this.$root.querySelector(
      '[data-cookie-banner-confirmation]'
    )
    this.$decision = this.$root.querySelector('[data-cookie-banner-decision]')

    this.$question?.addEventListener('submit', (event) => this.onSubmit(event))
    this.$root
      .querySelector('[data-cookie-banner-hide]')
      ?.addEventListener('click', () => this.hide())
  }

  /**
   * @param {object} event - the question form's submit event
   */
  onSubmit(event) {
    const analytics = event.submitter?.value

    if (analytics !== 'yes' && analytics !== 'no') {
      return
    }

    event.preventDefault()
    this.setCookiesPolicy(analytics === 'yes')
    this.confirm(analytics === 'yes')
  }

  /**
   * @param {boolean} analytics
   */
  setCookiesPolicy(analytics) {
    const value = serialiseCookiesPolicy(createCookiesPolicy(analytics))

    document.cookie = `${COOKIES_POLICY_COOKIE_NAME}=${value}; path=/; max-age=${seconds.oneYear}; secure; samesite=lax`
  }

  /**
   * @param {boolean} analytics
   */
  confirm(analytics) {
    if (this.$decision) {
      this.$decision.textContent = analytics ? 'accepted' : 'rejected'
    }
    this.$question?.setAttribute('hidden', '')
    if (this.$confirmation) {
      this.$confirmation.removeAttribute('hidden')
      // A div is not focusable until it has a tabindex; -1 keeps it out of
      // the tab order, matching GOV.UK's own component.
      this.$confirmation.setAttribute('tabindex', '-1')
      this.$confirmation.focus()
    }
  }

  /**
   * Removes the banner once the confirmation has been read.
   */
  hide() {
    this.$root.setAttribute('hidden', '')
  }
}
