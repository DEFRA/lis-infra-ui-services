import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import nunjucks from 'nunjucks'
import assign from 'lodash/assign.js'
import { test } from 'vitest'

import { queryString } from '../../query-string.js'

const componentRoot = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(componentRoot, '../../../..')
const environment = new nunjucks.Environment(
  new nunjucks.FileSystemLoader([
    path.join(projectRoot, 'test/fixtures/nunjucks'),
    path.dirname(componentRoot)
  ]),
  { autoescape: true, trimBlocks: true, lstripBlocks: true }
)
environment.addFilter('assign', assign)
environment.addFilter('queryString', queryString)

function render(params) {
  return environment.render('sortable-paginated-table/template.njk', {
    params
  })
}

const columns = [
  { text: 'Ear tag number', sortKey: 'ear_tag' },
  { text: 'Age' },
  { text: 'Breed', sortKey: 'breed' }
]

const rows = [
  [{ text: 'UK 324537 113234' }, { text: '3 years, 6 months' }, { text: 'HO' }]
]

test('renders a plain header for a column with no sortKey', () => {
  const html = render({
    caption: 'Animals',
    columns,
    rows,
    baseHref: '/animals'
  })

  assert.match(html, /<th scope="col" class="govuk-table__header">Age<\/th>/)
})

test('renders a sortable header as a link carrying the next sort state', () => {
  const html = render({
    caption: 'Animals',
    columns,
    rows,
    baseHref: '/animals',
    sort: 'ear_tag',
    direction: 'asc'
  })

  assert.match(html, /aria-sort="ascending"/)
  assert.match(
    html,
    /href="\/animals\?sort=ear_tag&(?:amp;)?direction=desc&(?:amp;)?page=1"/
  )
})

test('toggles back to ascending when the active column is already descending', () => {
  const html = render({
    caption: 'Animals',
    columns,
    rows,
    baseHref: '/animals',
    sort: 'ear_tag',
    direction: 'desc'
  })

  assert.match(html, /aria-sort="descending"/)
  assert.match(
    html,
    /href="\/animals\?sort=ear_tag&(?:amp;)?direction=asc&(?:amp;)?page=1"/
  )
})

test('an inactive sortable column defaults to ascending and aria-sort none', () => {
  const html = render({
    caption: 'Animals',
    columns,
    rows,
    baseHref: '/animals',
    sort: 'ear_tag',
    direction: 'asc'
  })

  assert.match(html, /aria-sort="none"/)
  assert.match(
    html,
    /href="\/animals\?sort=breed&(?:amp;)?direction=asc&(?:amp;)?page=1"/
  )
})

test('preserves extra query params on sort links', () => {
  const html = render({
    caption: 'Animals',
    columns,
    rows,
    baseHref: '/animals',
    sort: 'ear_tag',
    direction: 'asc',
    query: { search: 'UK 324537' }
  })

  assert.match(html, /search=UK\+324537/)
})

test('passes rows straight through to the table', () => {
  const html = render({
    caption: 'Animals',
    columns,
    rows,
    baseHref: '/animals'
  })

  assert.match(html, /<td class="govuk-table__cell">UK 324537 113234<\/td>/)
})

test('tells screen reader users that the column headers are sortable', () => {
  const html = render({
    caption: 'Animals',
    columns,
    rows,
    baseHref: '/animals'
  })

  assert.match(
    html,
    /<caption class="govuk-table__caption govuk-visually-hidden">\s*Animals<span class="govuk-visually-hidden"> \(column headers with links are sortable\)\.<\/span>\s*<\/caption>/
  )
})

test('omits the sortable hint when no column has a sortKey', () => {
  const html = render({
    caption: 'Animals',
    columns: [{ text: 'Ear tag number' }, { text: 'Age' }, { text: 'Breed' }],
    rows,
    baseHref: '/animals'
  })

  assert.doesNotMatch(html, /are sortable/)
})

test('renders no caption, and a generic region label, when no caption is given', () => {
  const html = render({
    columns,
    rows,
    baseHref: '/animals'
  })

  assert.doesNotMatch(html, /<caption/)
  assert.match(html, /role="region" aria-label="Table">/)
})

test('wraps the table in a focusable, labelled region so it can be scrolled by keyboard', () => {
  const html = render({
    caption: 'Animals',
    columns,
    rows,
    baseHref: '/animals'
  })

  assert.match(
    html,
    /<div class="lis-sortable-table__wrapper" data-module="lis-scrollable-table" tabindex="0" role="region" aria-label="Animals table">\s*<table/
  )
})

test('marks the wrapper as a lis-scrollable-table module', () => {
  const html = render({
    caption: 'Animals',
    columns,
    rows,
    baseHref: '/animals'
  })

  assert.match(
    html,
    /<div class="lis-sortable-table__wrapper" data-module="lis-scrollable-table"/
  )
})

test('renders the results summary but no pagination nav when there is only one page', () => {
  const html = render({
    caption: 'Animals',
    columns,
    rows,
    baseHref: '/animals',
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 7,
      itemsPerPage: 25
    }
  })

  assert.match(html, /Showing 7 results/)
  assert.doesNotMatch(html, /govuk-pagination/)
})

test('renders a singular "result" when there is exactly one', () => {
  const html = render({
    caption: 'Animals',
    columns,
    rows,
    baseHref: '/animals',
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 1,
      itemsPerPage: 25
    }
  })

  assert.match(html, /Showing 1 result[^s]/)
})

test('shows the results range for the current page', () => {
  const html = render({
    caption: 'Animals',
    columns,
    rows,
    baseHref: '/animals',
    pagination: {
      currentPage: 2,
      totalPages: 2,
      totalItems: 7,
      itemsPerPage: 5
    }
  })

  assert.match(html, /Showing 6 to 7 of 7 results/)
})

test('renders the summary above the pagination by default', () => {
  const html = render({
    caption: 'Animals',
    columns,
    rows,
    baseHref: '/animals',
    pagination: {
      currentPage: 1,
      totalPages: 2,
      totalItems: 7,
      itemsPerPage: 5
    }
  })

  assert.ok(
    html.indexOf('Showing 1 to 5 of 7') < html.indexOf('govuk-pagination')
  )
  assert.doesNotMatch(html, /govuk-grid-row/)
})

test('renders the summary text the caller supplies instead of the results count', () => {
  const html = render({
    caption: 'Animals',
    columns,
    rows,
    baseHref: '/animals',
    summary: { text: 'Showing 1 to 7 of 7 <cattle>' },
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 7,
      itemsPerPage: 25
    }
  })

  assert.match(html, /Showing 1 to 7 of 7 &lt;cattle&gt;</)
  assert.doesNotMatch(html, /results/)
})

test('renders summary html the caller supplies unescaped', () => {
  const html = render({
    caption: 'Animals',
    columns,
    rows,
    baseHref: '/animals',
    summary: { html: 'Showing <strong>7</strong> cattle' },
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 7,
      itemsPerPage: 25
    }
  })

  assert.match(html, /Showing <strong>7<\/strong> cattle</)
})

test('puts the summary beside the pagination, below the table, when positioned below', () => {
  const html = render({
    caption: 'Animals',
    columns,
    rows,
    baseHref: '/animals',
    summary: { position: 'below' },
    pagination: {
      currentPage: 1,
      totalPages: 2,
      totalItems: 7,
      itemsPerPage: 5
    }
  })

  assert.ok(html.indexOf('</table>') < html.indexOf('govuk-pagination'))
  assert.ok(
    html.indexOf('govuk-pagination') < html.indexOf('Showing 1 to 5 of 7')
  )
  assert.match(
    html,
    /govuk-grid-column-one-third govuk-!-text-align-right">\s*<p class="govuk-body govuk-!-margin-top-2">Showing 1 to 5 of 7 results<\/p>/
  )
})

test('puts the summary alone below the table when positioned below with a single page', () => {
  const html = render({
    caption: 'Animals',
    columns,
    rows,
    baseHref: '/animals',
    summary: { position: 'below' },
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 7,
      itemsPerPage: 25
    }
  })

  assert.ok(html.indexOf('</table>') < html.indexOf('Showing 7 results'))
  assert.doesNotMatch(html, /govuk-grid-row/)
  assert.doesNotMatch(html, /govuk-pagination/)
})

test('renders pagination items and next but no previous on the first page', () => {
  const html = render({
    caption: 'Animals',
    columns,
    rows,
    baseHref: '/animals',
    sort: 'ear_tag',
    direction: 'asc',
    pagination: {
      currentPage: 1,
      totalPages: 2,
      totalItems: 7,
      itemsPerPage: 5
    }
  })

  assert.match(html, /govuk-pagination__item--current/)
  assert.match(html, /rel="next"/)
  assert.doesNotMatch(html, /rel="prev"/)
  assert.match(
    html,
    /href="\/animals\?sort=ear_tag&(?:amp;)?direction=asc&(?:amp;)?page=2"/
  )
})

test('renders previous but no next on the last page', () => {
  const html = render({
    caption: 'Animals',
    columns,
    rows,
    baseHref: '/animals',
    pagination: {
      currentPage: 2,
      totalPages: 2,
      totalItems: 7,
      itemsPerPage: 5
    }
  })

  assert.match(html, /rel="prev"/)
  assert.doesNotMatch(html, /rel="next"/)
})
