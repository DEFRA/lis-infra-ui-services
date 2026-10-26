// @vitest-environment jsdom
// @vitest-environment-options { "url": "https://lis.test/" }
import { createAll } from 'govuk-frontend'
import { afterEach, beforeAll, describe, expect, test } from 'vitest'

import { CookieBanner } from './cookie-banner.js'

function renderBanner() {
  document.body.innerHTML = `
    <div class="govuk-cookie-banner" data-module="lis-cookie-banner">
      <form method="post" action="/cookies" data-cookie-banner-question>
        <button type="submit" name="analytics" value="yes">Accept</button>
        <button type="submit" name="analytics" value="no">Reject</button>
      </form>
      <div hidden data-cookie-banner-confirmation>
        <p>You’ve <span data-cookie-banner-decision>accepted</span> analytics cookies.</p>
        <button type="button" data-cookie-banner-hide>Hide</button>
      </div>
    </div>
  `
  createAll(CookieBanner)

  return {
    $root: document.querySelector('.govuk-cookie-banner'),
    $question: document.querySelector('[data-cookie-banner-question]'),
    $confirmation: document.querySelector('[data-cookie-banner-confirmation]'),
    $decision: document.querySelector('[data-cookie-banner-decision]'),
    $accept: document.querySelector('button[value="yes"]'),
    $reject: document.querySelector('button[value="no"]'),
    $hide: document.querySelector('[data-cookie-banner-hide]')
  }
}

function submitVia($button) {
  const event = new window.SubmitEvent('submit', {
    bubbles: true,
    cancelable: true,
    submitter: $button
  })
  $button.form.dispatchEvent(event)

  return event
}

describe('CookieBanner', () => {
  beforeAll(() => {
    document.body.classList.add('govuk-frontend-supported')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    document.cookie = 'cookies_policy=; max-age=0; path=/'
  })

  test('accepting sets the consent cookie and shows the confirmation', () => {
    // Arrange
    const { $question, $confirmation, $decision, $accept } = renderBanner()

    // Act
    const event = submitVia($accept)

    // Assert
    expect(event.defaultPrevented).toBe(true)
    expect(document.cookie).toContain(
      'cookies_policy=%7B%22essential%22%3Atrue%2C%22analytics%22%3Atrue%7D'
    )
    expect($question.hidden).toBe(true)
    expect($confirmation.hidden).toBe(false)
    expect($confirmation.getAttribute('tabindex')).toBe('-1')
    expect(document.activeElement).toBe($confirmation)
    expect($decision.textContent).toBe('accepted')
  })

  test('rejecting records analytics as refused', () => {
    // Arrange
    const { $decision, $reject } = renderBanner()

    // Act
    submitVia($reject)

    // Assert
    expect(document.cookie).toContain(
      'cookies_policy=%7B%22essential%22%3Atrue%2C%22analytics%22%3Afalse%7D'
    )
    expect($decision.textContent).toBe('rejected')
  })

  test('hide removes the banner', () => {
    // Arrange
    const { $root, $accept, $hide } = renderBanner()
    submitVia($accept)

    // Act
    $hide.click()

    // Assert
    expect($root.hidden).toBe(true)
  })

  test('a submit without a recognised choice is left to the browser', () => {
    // Arrange
    const { $question } = renderBanner()

    // Act
    const event = new window.SubmitEvent('submit', {
      bubbles: true,
      cancelable: true
    })
    $question.dispatchEvent(event)

    // Assert
    expect(event.defaultPrevented).toBe(false)
    expect(document.cookie).not.toContain('cookies_policy')
  })
})
