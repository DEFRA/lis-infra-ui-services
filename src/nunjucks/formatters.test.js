import assert from 'node:assert/strict'
import { test } from 'vitest'

import { formatCurrency } from './format-currency.js'
import { formatDate } from './format-date.js'

test('formats currency with defaults and custom options', () => {
  assert.equal(formatCurrency(1234.5), '£1,234.50')
  assert.equal(formatCurrency(1234.5, 'de-DE', 'EUR'), '1.234,50 €')
})

test('formats ISO strings and Date values', () => {
  assert.equal(formatDate('2026-08-10'), 'Mon 10th August 2026')
  assert.equal(formatDate(new Date(2026, 7, 10), 'yyyy-MM-dd'), '2026-08-10')
})
