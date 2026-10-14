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

  test('links the hint to the input so it is read out with the label', () => {
    // Act
    const html = render({ label: 'Search', hint: 'Search by ear tag' })

    // Assert
    expect(html).toContain(
      '<div class="govuk-hint" id="search-hint">Search by ear tag</div>'
    )
    expect(html).toContain('aria-describedby="search-hint"')
  })

  test('makes the form the search landmark, labelled by the label text', () => {
    // Act
    const html = render({ label: 'Search animals', hint: 'Search by ear tag' })

    // Assert
    expect(html).toContain(
      '<form method="GET" class="lis-search-form" role="search" aria-label="Search animals">'
    )
  })

  test('wraps the label, hint and input in the form', () => {
    // Act
    const html = render({ label: 'Search animals', hint: 'Search by ear tag' })

    // Assert
    expect(html.indexOf('<form')).toBeLessThan(html.indexOf('govuk-form-group'))
    expect(html.indexOf('govuk-hint')).toBeLessThan(html.indexOf('</form>'))
    expect(html.indexOf('</form>')).toBeGreaterThan(
      html.indexOf('type="search"')
    )
  })

  test('renders the inset text outside the form', () => {
    // Act
    const html = render({ label: 'Search', insetText: 'Up to 24 hours' })

    // Assert
    expect(html.indexOf('govuk-inset-text')).toBeGreaterThan(
      html.indexOf('</form>')
    )
  })

  test('does not describe the input by a hint when none is given', () => {
    // Act
    const html = render({ label: 'Search' })

    // Assert
    expect(html).not.toContain('aria-describedby')
  })

  test('carries hidden fields inside the form so they survive a submit', () => {
    // Act
    const html = render({
      label: 'Search',
      hiddenFields: [{ name: 'referrer', value: 'abc-123' }]
    })

    // Assert
    expect(html).toContain(
      '<input type="hidden" name="referrer" value="abc-123">'
    )
    expect(html.indexOf('<form')).toBeLessThan(html.indexOf('type="hidden"'))
  })

  test('renders no hidden fields when none are given', () => {
    // Act
    const html = render({ label: 'Search' })

    // Assert
    expect(html).not.toContain('type="hidden"')
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
    const html = render({
      label: 'Search',
      value: '"><script>alert(1)</script>'
    })

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

  test('renders the error message with a visually hidden prefix', () => {
    // Act
    const html = render({ label: 'Search', errorMessage: 'Too long' })

    // Assert
    expect(html).toContain(
      '<p id="search-error" class="govuk-error-message"><span class="govuk-visually-hidden">Error:</span> Too long</p>'
    )
    expect(html.indexOf('govuk-error-message')).toBeLessThan(
      html.indexOf('lis-search-form__wrapper')
    )
  })

  test('adds the error classes to the form group and input', () => {
    // Act
    const html = render({ label: 'Search', errorMessage: 'Too long' })

    // Assert
    expect(html).toContain('govuk-form-group govuk-form-group--error')
    expect(html).toContain('lis-search-form__input govuk-input--error')
  })

  test('describes the input by the hint then the error when both are given', () => {
    // Act
    const html = render({
      label: 'Search',
      hint: 'Search by ear tag',
      errorMessage: 'Too long'
    })

    // Assert
    expect(html).toContain('aria-describedby="search-hint search-error"')
  })

  test('describes the input by the error alone when there is no hint', () => {
    // Act
    const html = render({ label: 'Search', errorMessage: 'Too long' })

    // Assert
    expect(html).toContain('aria-describedby="search-error"')
  })

  test('renders no error markup when no error message is given', () => {
    // Act
    const html = render({ label: 'Search', hint: 'Search by ear tag' })

    // Assert
    expect(html).not.toContain('govuk-error-message')
    expect(html).not.toContain('--error')
    expect(html).not.toContain('search-error')
  })
})
