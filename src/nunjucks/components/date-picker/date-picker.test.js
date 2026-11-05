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
// The real GOV.UK templates, not the test fixtures: the macro relies on
// govukInput passing classes and attributes through, and on govukAttributes.
const environment = new nunjucks.Environment(
  new nunjucks.FileSystemLoader([
    path.join(govukFrontendRoot, 'dist'),
    path.dirname(componentRoot)
  ]),
  { autoescape: true, trimBlocks: true, lstripBlocks: true }
)

function render(params) {
  document.body.innerHTML = environment.renderString(
    '{% from "date-picker/macro.njk" import lisDatePicker %}{{ lisDatePicker(params) }}',
    { params }
  )
  return document.querySelector('.lis-date-picker')
}

describe('lisDatePicker()', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  test('renders the GOV.UK input inside the date picker module', () => {
    // Act
    const component = render({
      id: 'appointment-date',
      name: 'appointment-date',
      label: { text: 'Appointment date' },
      hint: { text: 'For example, 17/5/2024.' }
    })

    // Assert
    const input = component.querySelector('input')
    expect(component.getAttribute('data-module')).toBe('lis-date-picker')
    expect(input.id).toBe('appointment-date')
    expect(input.name).toBe('appointment-date')
    expect(input.classList.contains('lis-js-date-picker-input')).toBe(true)
    expect(input.getAttribute('autocomplete')).toBe('off')
    expect(component.querySelector('label').textContent.trim()).toBe(
      'Appointment date'
    )
    expect(component.querySelector('.govuk-hint').textContent.trim()).toBe(
      'For example, 17/5/2024.'
    )
  })

  test('leaves out the options it was not given', () => {
    // Act
    const component = render({
      id: 'appointment-date',
      name: 'appointment-date',
      label: { text: 'Appointment date' }
    })

    // Assert
    expect(component.getAttributeNames().sort()).toEqual([
      'class',
      'data-module'
    ])
  })

  test('passes the value to the input', () => {
    // Act
    const component = render({
      id: 'appointment-date',
      name: 'appointment-date',
      value: '17/5/2024',
      label: { text: 'Appointment date' }
    })

    // Assert
    expect(component.querySelector('input').value).toBe('17/5/2024')
  })

  test('renders the error message and error input class', () => {
    // Act
    const component = render({
      id: 'appointment-date',
      name: 'appointment-date',
      label: { text: 'Appointment date' },
      errorMessage: { text: 'Enter an appointment date' }
    })

    // Assert
    expect(
      component.querySelector('.govuk-error-message').textContent
    ).toContain('Enter an appointment date')
    expect(
      component.querySelector('input').classList.contains('govuk-input--error')
    ).toBe(true)
  })

  test('passes classes and attributes to the input', () => {
    // Act
    const component = render({
      id: 'appointment-date',
      name: 'appointment-date',
      classes: 'custom-date-picker-input',
      attributes: {
        'data-custom': 'custom-value',
        'aria-describedby': 'custom-hint'
      },
      label: { text: 'Appointment date' }
    })

    // Assert
    const input = component.querySelector('input')
    expect(input.classList.contains('custom-date-picker-input')).toBe(true)
    expect(input.classList.contains('lis-js-date-picker-input')).toBe(true)
    expect(input.getAttribute('data-custom')).toBe('custom-value')
    expect(input.getAttribute('aria-describedby')).toBe('custom-hint')
  })

  test('renders the date options as data attributes', () => {
    // Act
    const component = render({
      id: 'appointment-date',
      name: 'appointment-date',
      minDate: '01/01/2020',
      maxDate: '31/12/2030',
      excludedDates: '10/06/2026 15/06/2026',
      excludedDays: 'saturday sunday',
      weekStartDay: 'sunday',
      label: { text: 'Appointment date' }
    })

    // Assert
    expect({ ...component.dataset }).toEqual({
      module: 'lis-date-picker',
      minDate: '01/01/2020',
      maxDate: '31/12/2030',
      excludedDates: '10/06/2026 15/06/2026',
      excludedDays: 'saturday sunday',
      weekStartDay: 'sunday'
    })
  })

  test.each([
    [true, 'true'],
    [false, 'false']
  ])(
    'renders leadingZeros %s as data-leading-zeros="%s", not a valueless attribute',
    (leadingZeros, attributeValue) => {
      // Act
      const component = render({
        id: 'appointment-date',
        name: 'appointment-date',
        leadingZeros,
        label: { text: 'Appointment date' }
      })

      // Assert
      expect(component.getAttribute('data-leading-zeros')).toBe(attributeValue)
    }
  )

  test('escapes option values', () => {
    // Act
    const component = render({
      id: 'appointment-date',
      name: 'appointment-date',
      minDate: '"><script>alert(1)</script>',
      label: { text: 'Appointment date' }
    })

    // Assert
    expect(document.querySelector('script')).toBeNull()
    expect(component.getAttribute('data-min-date')).toBe(
      '"><script>alert(1)</script>'
    )
  })
})
