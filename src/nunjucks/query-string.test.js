import assert from 'node:assert/strict'
import { test } from 'vitest'

import { queryString } from './query-string.js'

test('builds a query string from params', () => {
  assert.equal(
    queryString({ sort: 'ear_tag', direction: 'asc', page: 1 }),
    'sort=ear_tag&direction=asc&page=1'
  )
})

test('omits params with undefined, null or empty string values', () => {
  assert.equal(
    queryString({
      sort: 'ear_tag',
      direction: undefined,
      search: null,
      page: ''
    }),
    'sort=ear_tag'
  )
})

test('URL-encodes param values', () => {
  assert.equal(queryString({ search: 'UK 324537' }), 'search=UK+324537')
})

test('returns an empty string for no params', () => {
  assert.equal(queryString(), '')
  assert.equal(queryString({}), '')
})
