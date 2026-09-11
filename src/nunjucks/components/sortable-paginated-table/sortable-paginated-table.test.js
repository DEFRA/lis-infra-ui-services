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
