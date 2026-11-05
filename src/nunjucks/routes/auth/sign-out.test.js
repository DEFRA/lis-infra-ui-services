import path from 'node:path'
import { createRequire } from 'node:module'
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
const componentsRoot = path.resolve(routesRoot, '../components')
// The form component imports govuk-frontend's attributes macro.
const govukRoot = path.join(
  path.dirname(
    createRequire(import.meta.url).resolve('govuk-frontend/package.json')
  ),
  'dist'
)
const environment = new nunjucks.Environment(
  new nunjucks.FileSystemLoader([
    routesRoot,
    layoutFixtureRoot,
    componentsRoot,
    govukRoot
  ]),
  { autoescape: true, trimBlocks: true, lstripBlocks: true }
)

describe('sign out page', () => {
  test('asks the user to confirm with a form posting the CSRF token, or cancel', () => {
    // Arrange
    const context = {
      pageTitle: 'Are you sure you want to sign out?',
      signOutHref: '/signout',
      csrfToken: 'csrf-token'
    }

    // Act
    const html = environment.render('auth/sign-out.njk', context)

    // Assert
    expect(html).toContain(
      '<title>Are you sure you want to sign out? - Livestock Information</title>'
    )
    expect(html).toContain(
      '<h1 class="govuk-heading-l">Are you sure you want to sign out?</h1>'
    )
    expect(html).toContain('<form action="/signout" method="post" novalidate>')
    expect(html).toContain(
      '<input type="hidden" name="_csrf" value="csrf-token">'
    )
    expect(html).toContain(
      '<button type="submit" class="govuk-button" data-module="govuk-button">Sign out</button>'
    )
    expect(html).toContain('<a class="govuk-link" href="/">Cancel</a>')
  })
})
