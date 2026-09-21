import path from 'node:path'
import { fileURLToPath } from 'node:url'

import nunjucks from 'nunjucks'
import { describe, expect, test } from 'vitest'

import { formatDate } from '../../format-date.js'

const componentRoot = path.dirname(fileURLToPath(import.meta.url))
const environment = new nunjucks.Environment(
  new nunjucks.FileSystemLoader([path.dirname(componentRoot)]),
  { autoescape: true, trimBlocks: true, lstripBlocks: true }
)
environment.addFilter('formatDate', formatDate)

describe('lisDate()', () => {
  test('it formats an ISO date string as day, short month and year', () => {
    // Arrange
    const params = { value: '2024-11-29' }

    // Act
    const html = environment.render('date/template.njk', { params })

    // Assert
    expect(html.trim()).toEqual('29 Nov 2024')
  })

  test('it does not zero-pad a single-digit day', () => {
    // Arrange
    const params = { value: '2023-02-01' }

    // Act
    const html = environment.render('date/template.njk', { params })

    // Assert
    expect(html.trim()).toEqual('1 Feb 2023')
  })

  test('it formats a Date value', () => {
    // Arrange
    const params = { value: new Date(2024, 10, 29) }

    // Act
    const html = environment.render('date/template.njk', { params })

    // Assert
    expect(html.trim()).toEqual('29 Nov 2024')
  })

  test('it renders nothing when there is no value', () => {
    // Arrange
    const params = { value: null }

    // Act
    const html = environment.render('date/template.njk', { params })

    // Assert
    expect(html.trim()).toEqual('')
  })

  test('it renders with no surrounding whitespace when called inline', () => {
    // Arrange
    const template =
      '{% from "date/macro.njk" import lisDate %}<td>{{ lisDate(value) }}</td>'

    // Act
    const html = environment.renderString(template, { value: '2024-11-29' })

    // Assert
    expect(html).toEqual('<td>29 Nov 2024</td>')
  })
})
