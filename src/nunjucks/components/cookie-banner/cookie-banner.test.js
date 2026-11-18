import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

import nunjucks from 'nunjucks'
import { describe, expect, test } from 'vitest'

const componentRoot = path.dirname(fileURLToPath(import.meta.url))
const govukRoot = path.join(
  path.dirname(
    createRequire(import.meta.url).resolve('govuk-frontend/package.json')
  ),
  'dist'
)
const environment = new nunjucks.Environment(
  new nunjucks.FileSystemLoader([path.dirname(componentRoot), govukRoot]),
  { autoescape: true, trimBlocks: true, lstripBlocks: true }
)

function render(params) {
  return environment.renderString(
    '{% from "cookie-banner/macro.njk" import lisCookieBanner %}{{ lisCookieBanner(params) }}',
    { params }
  )
}

describe('lisCookieBanner()', () => {
  test('renders the banner region for the cookie banner script to enhance', () => {
    // Act
    const html = render({ cookiesPath: '/cookies' })

    // Assert
    expect(html).toContain(
      '<div class="govuk-cookie-banner" data-nosnippet role="region" aria-label="Cookies on Livestock Information" data-module="lis-cookie-banner">'
    )
    expect(html).toContain('Cookies on Livestock Information</h2>')
  })

  test('asks the question in a form that posts the choice to the cookies page without JavaScript', () => {
    // Act
    const html = render({ cookiesPath: '/cookies' })

    // Assert
    expect(html).toContain(
      '<form method="post" action="/cookies" class="govuk-cookie-banner__message govuk-width-container" data-cookie-banner-question>'
    )
    expect(html).toMatch(
      /<button type="submit" value="yes" name="analytics"[^>]*>\s*Accept analytics cookies\s*<\/button>/
    )
    expect(html).toMatch(
      /<button type="submit" value="no" name="analytics"[^>]*>\s*Reject analytics cookies\s*<\/button>/
    )
    expect(html).toContain(
      '<a class="govuk-link" href="/cookies">View cookies</a>'
    )
  })

  test('renders the confirmation hidden, with a link to change the choice and a button to hide it', () => {
    // Act
    const html = render({ cookiesPath: '/cookies' })

    // Assert
    expect(html).toContain(
      '<div class="govuk-cookie-banner__message govuk-width-container" role="alert" hidden data-cookie-banner-confirmation>'
    )
    expect(html).toContain('<span data-cookie-banner-decision>accepted</span>')
    expect(html).toContain(
      '<a class="govuk-link" href="/cookies">change your cookie settings</a>'
    )
    expect(html).toMatch(
      /<button type="button"[^>]*data-cookie-banner-hide[^>]*>/
    )
  })

  test('links to the cookies path it is given', () => {
    // Act
    const html = render({ cookiesPath: '/somewhere/cookies' })

    // Assert
    expect(html.split('"/somewhere/cookies"')).toHaveLength(4)
  })
})
