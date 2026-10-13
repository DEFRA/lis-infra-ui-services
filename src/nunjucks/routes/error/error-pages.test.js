import path from 'node:path'
import { fileURLToPath } from 'node:url'

import nunjucks from 'nunjucks'
import { describe, expect, test } from 'vitest'

const routesRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
)
const layoutFixtureRoot = path.resolve(
  routesRoot,
  '../../../test/fixtures/nunjucks'
)
const environment = new nunjucks.Environment(
  new nunjucks.FileSystemLoader([routesRoot, layoutFixtureRoot]),
  { autoescape: true, trimBlocks: true, lstripBlocks: true }
)

const errorPages = {
  contactHref: 'https://example.com/contact',
  homeHref: '/home',
  getStartedHref: '/start'
}

function render(view, context = {}) {
  return environment.render(view, {
    errorPages,
    ...context
  })
}

function textOf(html) {
  return html
    .replaceAll(/<[^<>]*>/g, '')
    .replaceAll(/\s+/g, ' ')
    .trim()
}

describe('error pages', () => {
  test('page not found shows the heading, the three links and the support link', () => {
    // Arrange
    const context = { pageTitle: 'Page not found' }

    // Act
    const html = render('error/page-not-found.njk', context)

    // Assert
    expect(html).toContain(
      '<title>Page not found - Livestock Information</title>'
    )
    expect(html).toContain('<h1 class="govuk-heading-l">Page not found</h1>')
    expect(textOf(html)).toContain(
      "Sorry, we could not find the page you were looking for. You might find what you're looking for by visiting: Home page Get started GOV.UK If you cannot find the information you need, contact our support team."
    )
    expect(html).toContain('<a class="govuk-link" href="/home">Home page</a>')
    expect(html).toContain(
      '<a class="govuk-link" href="/start">Get started</a>'
    )
    expect(html).toContain(
      '<a class="govuk-link" href="https://www.gov.uk">GOV.UK</a>'
    )
    expect(html).toContain(
      '<a class="govuk-link" href="https://example.com/contact">contact our support team</a>'
    )
  })

  test('not authorised offers a sign in button when signInHref is given', () => {
    // Arrange
    const context = { signInHref: '/auth/login' }

    // Act
    const html = render('error/not-authorised.njk', context)

    // Assert
    expect(html).toContain(
      '<a href="/auth/login" role="button" draggable="false" class="govuk-button" data-module="govuk-button">Sign in</a>'
    )
  })

  test('not authorised has no sign in button without signInHref', () => {
    // Arrange
    const context = {}

    // Act
    const html = render('error/not-authorised.njk', context)

    // Assert
    expect(html).not.toContain('govuk-button')
    expect(html).not.toContain('Sign in')
  })

  test('not authorised shows the heading and the support link', () => {
    // Arrange
    const context = {
      pageTitle: 'Sorry, you are not authorised to view this page'
    }

    // Act
    const html = render('error/not-authorised.njk', context)

    // Assert
    expect(html).toContain(
      '<title>Sorry, you are not authorised to view this page - Livestock Information</title>'
    )
    expect(html).toContain(
      '<h1 class="govuk-heading-l">Sorry, you are not authorised to view this page.</h1>'
    )
    expect(textOf(html)).toContain(
      'Check your details are correct and try again. If you think this is incorrect contact our support team.'
    )
    expect(html).toContain(
      '<a class="govuk-link" href="https://example.com/contact">contact our support team</a>'
    )
  })

  test('problem with the service shows the heading and the BCMS link', () => {
    // Arrange
    const context = { pageTitle: 'Sorry, there is a problem with the service' }

    // Act
    const html = render('error/problem-with-service.njk', context)

    // Assert
    expect(html).toContain(
      '<title>Sorry, there is a problem with the service - Livestock Information</title>'
    )
    expect(html).toContain(
      '<h1 class="govuk-heading-l">Sorry, there is a problem with the service</h1>'
    )
    expect(textOf(html)).toContain(
      'Try again later. Contact the British Cattle Movement Service (BCMS) if you need to speak to someone about your account.'
    )
    expect(html).toContain(
      '<a class="govuk-link" href="https://example.com/contact">British Cattle Movement Service (BCMS)</a>'
    )
  })

  test('service unavailable shows when the service will be available again', () => {
    // Arrange
    const context = {
      pageTitle: 'Sorry, the service is unavailable',
      availableFrom: '9am on Monday 19 November 2026'
    }

    // Act
    const html = render('error/service-unavailable.njk', context)

    // Assert
    expect(html).toContain(
      '<title>Sorry, the service is unavailable - Livestock Information</title>'
    )
    expect(html).toContain(
      '<h1 class="govuk-heading-l">Sorry, the service is unavailable</h1>'
    )
    expect(textOf(html)).toContain(
      'You will be able to use the service from 9am on Monday 19 November 2026. Contact the British Cattle Movement Service (BCMS) if you need to speak to someone about your account.'
    )
    expect(html).toContain(
      '<a class="govuk-link" href="https://example.com/contact">British Cattle Movement Service (BCMS)</a>'
    )
  })

  test('service unavailable says later when no return time is given', () => {
    // Arrange
    const context = { pageTitle: 'Sorry, the service is unavailable' }

    // Act
    const html = render('error/service-unavailable.njk', context)

    // Assert
    expect(textOf(html)).toContain('You will be able to use the service later.')
  })

  test.each([
    'error/page-not-found.njk',
    'error/not-authorised.njk',
    'error/problem-with-service.njk',
    'error/service-unavailable.njk'
  ])('%s shows the development message only when one is given', (view) => {
    // Arrange
    const withMessage = { developmentMessage: 'Upstream timed out' }

    // Act
    const htmlWithMessage = render(view, withMessage)
    const htmlWithoutMessage = render(view)

    // Assert
    expect(htmlWithMessage).toContain(
      '<p class="govuk-body">Upstream timed out</p>'
    )
    expect(htmlWithoutMessage).not.toContain('Upstream timed out')
  })
})
