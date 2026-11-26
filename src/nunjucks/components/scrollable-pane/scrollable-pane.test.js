// @vitest-environment jsdom
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import nunjucks from 'nunjucks'
import { afterEach, describe, expect, test } from 'vitest'

const componentRoot = path.dirname(fileURLToPath(import.meta.url))
const govukFrontendRoot = path.dirname(
  createRequire(import.meta.url).resolve('govuk-frontend/package.json')
)
const environment = new nunjucks.Environment(
  new nunjucks.FileSystemLoader([
    path.join(govukFrontendRoot, 'dist'),
    path.dirname(componentRoot)
  ]),
  { autoescape: true, trimBlocks: true, lstripBlocks: true }
)

function renderTemplate(template, params) {
  document.body.innerHTML = environment.renderString(
    `{% from "scrollable-pane/macro.njk" import lisScrollablePane %}${template}`,
    { params }
  )
  return document.querySelector('.lis-scrollable-pane')
}

function render(params) {
  return renderTemplate('{{ lisScrollablePane(params) }}', params)
}

describe('lisScrollablePane()', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  test('renders a focusable region named by the label', () => {
    // Act
    const pane = render({ label: 'Animals table', html: '<table></table>' })

    // Assert
    expect(pane.getAttribute('data-module')).toBe('lis-scrollable-pane')
    expect(pane.getAttribute('role')).toBe('region')
    expect(pane.getAttribute('tabindex')).toBe('0')
    expect(pane.getAttribute('aria-label')).toBe('Animals table')
    expect(pane.hasAttribute('aria-labelledby')).toBe(false)
  })

  test('renders a focusable region named by the element labelledBy points to', () => {
    // Act
    const pane = render({
      labelledBy: 'animals-heading',
      html: '<table></table>'
    })

    // Assert
    expect(pane.getAttribute('role')).toBe('region')
    expect(pane.getAttribute('tabindex')).toBe('0')
    expect(pane.getAttribute('aria-labelledby')).toBe('animals-heading')
    expect(pane.hasAttribute('aria-label')).toBe(false)
  })

  test('uses the label and ignores labelledBy when given both', () => {
    // Act
    const pane = render({
      label: 'Animals table',
      labelledBy: 'animals-heading',
      html: '<table></table>'
    })

    // Assert
    expect(pane.getAttribute('aria-label')).toBe('Animals table')
    expect(pane.hasAttribute('aria-labelledby')).toBe(false)
  })

  test('renders no region or tab stop when given no label', () => {
    // Act
    const pane = render({ html: '<table></table>' })

    // Assert
    expect(pane.getAttribute('data-module')).toBe('lis-scrollable-pane')
    expect(pane.hasAttribute('role')).toBe(false)
    expect(pane.hasAttribute('tabindex')).toBe(false)
    expect(pane.hasAttribute('aria-label')).toBe(false)
    expect(pane.hasAttribute('aria-labelledby')).toBe(false)
  })

  test('adds the given classes after its own', () => {
    // Act
    const pane = render({ label: 'Animals table', classes: 'app-pane extra' })

    // Assert
    expect(pane.className).toBe('lis-scrollable-pane app-pane extra')
  })

  test('adds the given attributes', () => {
    // Act
    const pane = render({
      label: 'Animals table',
      attributes: { id: 'animals-pane', 'data-test': 'pane' }
    })

    // Assert
    expect(pane.id).toBe('animals-pane')
    expect(pane.getAttribute('data-test')).toBe('pane')
  })

  test('renders the given html unescaped', () => {
    // Act
    const pane = render({
      label: 'Animals table',
      html: '<table class="govuk-table"></table>'
    })

    // Assert
    expect(pane.querySelector('table.govuk-table')).not.toBeNull()
  })

  test('renders the caller block in place of html', () => {
    // Act
    const pane = renderTemplate(
      '{% call lisScrollablePane(params) %}<table class="from-caller"></table>{% endcall %}',
      { label: 'Animals table', html: '<p class="from-html"></p>' }
    )

    // Assert
    expect(pane.querySelector('table.from-caller')).not.toBeNull()
    expect(pane.querySelector('.from-html')).toBeNull()
  })
})
