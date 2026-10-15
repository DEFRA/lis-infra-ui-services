import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

import nunjucks from 'nunjucks'
import { describe, expect, test } from 'vitest'

const require = createRequire(import.meta.url)
const govukRoot = path.join(
  path.dirname(require.resolve('govuk-frontend/package.json')),
  'dist'
)
const layoutsRoot = path.dirname(fileURLToPath(import.meta.url))
const templatesRoot = path.dirname(layoutsRoot)
const componentsRoot = path.join(path.dirname(templatesRoot), 'components')
const environment = new nunjucks.Environment(
  new nunjucks.FileSystemLoader([templatesRoot, componentsRoot, govukRoot]),
  { autoescape: true, trimBlocks: true, lstripBlocks: true }
)
environment.addGlobal('getAssetPath', (asset) => `/${asset}`)

function render(context = {}) {
  return environment.render('layouts/base.njk', {
    isSignedIn: true,
    logoutUrl: '/sign-out',
    navigation: [{ href: '/one', text: 'One' }],
    ...context
  })
}

function countOf(html, fragment) {
  return html.split(fragment).length - 1
}

describe('base layout', () => {
  test('renders one header landmark wrapping the header and service navigation', () => {
    // Act
    const html = render()
    const headerStart = html.indexOf('<header class="govuk-template__header')
    const headerEnd = html.indexOf('</header>', headerStart)
    const headerHtml = html.slice(headerStart, headerEnd)

    // Assert
    expect(countOf(html, '<header class="govuk-template__header')).toBe(1)
    expect(headerHtml).toContain('govuk-header')
    expect(headerHtml).toContain('govuk-service-navigation')
    expect(headerHtml).toContain('govuk-phase-banner')
  })

  test('renders the alpha phase banner', () => {
    // Act
    const html = render()

    // Assert
    expect(html).toMatch(
      /<strong class="govuk-tag govuk-phase-banner__content__tag">\s*Alpha\s*<\/strong>/
    )
    expect(html).toContain(
      'This is a new service – your feedback will help us to improve it.'
    )
    expect(html).not.toContain('Steel Thread')
  })

  test('renders one footer landmark wrapping the footer', () => {
    // Act
    const html = render()
    const footerStart = html.indexOf('<footer class="govuk-template__footer')
    const footerEnd = html.indexOf('</footer>', footerStart)

    // Assert
    expect(countOf(html, '<footer class="govuk-template__footer')).toBe(1)
    expect(html.slice(footerStart, footerEnd)).toContain('govuk-footer')
  })

  test('renders the sign out link when signed in', () => {
    // Act
    const html = render()

    // Assert
    expect(html).toContain('href="/sign-out"')
  })

  test('does not render the sign out link when signed out', () => {
    // Act
    const html = render({ isSignedIn: false })

    // Assert
    expect(html).not.toContain('Sign out')
  })
})
