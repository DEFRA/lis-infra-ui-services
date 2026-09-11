import path from 'node:path'
import { fileURLToPath } from 'node:url'

import nunjucks from 'nunjucks'
import { describe, expect, test } from 'vitest'

const componentRoot = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(componentRoot, '../../../..')
const environment = new nunjucks.Environment(
  new nunjucks.FileSystemLoader([
    path.join(projectRoot, 'test/fixtures/nunjucks'),
    path.dirname(componentRoot)
  ]),
  { autoescape: true, trimBlocks: true, lstripBlocks: true }
)

function render(params) {
  return environment.render('search-form/template.njk', { params })
}

describe('searchForm()', () => {
  test('renders the label, hint and a GET form with the search input', () => {
    // Act
    const html = render({
      label: 'Search animals on your holding',
      hint: 'You can use all or part of the animal ear tag number, or search by sex or breed.'
    })

    // Assert
    expect(html).toContain('Search animals on your holding')
    expect(html).toContain(
      'You can use all or part of the animal ear tag number, or search by sex or breed.'
    )
    expect(html).toContain('method="GET"')
    expect(html).toContain('type="search"')
    expect(html).toContain('name="search"')
  })

  test('defaults the input name and id to "search"', () => {
    // Act
    const html = render({ label: 'Search' })

    // Assert
    expect(html).toContain('id="search"')
    expect(html).toContain('name="search"')
    expect(html).toContain('for="search"')
  })

  test('uses a custom name and id when given', () => {
    // Act
    const html = render({ label: 'Search', id: 'my-search', name: 'q' })

    // Assert
    expect(html).toContain('id="my-search"')
    expect(html).toContain('name="q"')
    expect(html).toContain('for="my-search"')
  })

  test('carries the current search term into the input value', () => {
    // Act
    const html = render({ label: 'Search', value: 'holstein' })

    // Assert
    expect(html).toContain('value="holstein"')
  })

  test('escapes a search term containing markup', () => {
    // Act
    const html = render({ label: 'Search', value: '"><script>alert(1)</script>' })

    // Assert
    expect(html).not.toContain('<script>alert(1)</script>')
  })

  test('does not render inset text when none is given', () => {
    // Act
    const html = render({ label: 'Search' })

    // Assert
    expect(html).not.toContain('govuk-inset-text')
  })

  test('renders inset text when given', () => {
    // Act
    const html = render({
      label: 'Search',
      insetText:
        'Recent changes such as new registrations may take up to 24 hours to appear in your list.'
    })

    // Assert
    expect(html).toContain('govuk-inset-text')
    expect(html).toContain(
      'Recent changes such as new registrations may take up to 24 hours to appear in your list.'
    )
  })
})
