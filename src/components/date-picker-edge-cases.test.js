// @vitest-environment jsdom
import { getByText, screen } from '@testing-library/dom'
import { userEvent } from '@testing-library/user-event'
import { createAll } from 'govuk-frontend'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
  vi
} from 'vitest'

import { DatePicker } from './date-picker.js'

// Wednesday 12 June 2024, so every test sees the same month.
const TODAY = new Date(2024, 5, 12, 12)

function renderDatePicker(attributes = {}) {
  const dataAttributes = Object.entries(attributes)
    .map(([name, value]) => ` ${name}="${value}"`)
    .join('')

  document.body.innerHTML = `
    <form aria-label="form" action="">
      <div class="lis-date-picker" data-module="lis-date-picker"${dataAttributes}>
        <div class="govuk-form-group">
          <label class="govuk-label" for="date">Date</label>
          <div id="date-hint" class="govuk-hint">For example, 17/5/2024.</div>
          <input class="govuk-input lis-js-date-picker-input" id="date" name="date" type="text" aria-describedby="date-hint" autocomplete="off">
        </div>
      </div>
    </form>`

  return document.querySelector('[data-module="lis-date-picker"]')
}

function getCalendarButton() {
  return screen.getByRole('button', { name: /^Choose date/ })
}

function getDialog() {
  return screen.getByRole('dialog', { hidden: true })
}

describe('DatePicker edge cases', () => {
  beforeAll(() => {
    document.body.classList.add('govuk-frontend-supported')
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(TODAY)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  afterAll(() => {
    vi.useRealTimers()
  })

  test('opening again while open replaces the outside-click listener', () => {
    // Arrange
    const addEventListener = vi.spyOn(document.body, 'addEventListener')
    const datePicker = new DatePicker(renderDatePicker())
    datePicker.openDialog()

    // Act
    datePicker.openDialog()

    // Assert
    const mouseupOptions = addEventListener.mock.calls
      .filter(([type]) => type === 'mouseup')
      .map(([, , options]) => options)
    expect(mouseupOptions).toHaveLength(2)
    expect(mouseupOptions[0].signal.aborted).toBe(true)
    expect(mouseupOptions[1].signal.aborted).toBe(false)
  })

  test('month navigation never puts the tab stop on an excluded day', async () => {
    // Arrange
    const user = userEvent.setup()
    renderDatePicker()
    createAll(DatePicker, { excludedDays: 'monday' })
    await user.click(getCalendarButton())

    // Act
    await user.click(getByText(getDialog(), 'Next month'))

    // Assert
    expect(screen.getByTestId('1/7/2024').getAttribute('tabindex')).toBe('-1')
    expect(screen.getByTestId('2/7/2024').getAttribute('tabindex')).toBe('0')
  })

  test('month navigation with every day excluded leaves no tab stop', async () => {
    // Arrange
    const user = userEvent.setup()
    renderDatePicker()
    createAll(DatePicker, {
      excludedDays: 'monday tuesday wednesday thursday friday saturday sunday'
    })
    await user.click(getCalendarButton())

    // Act
    let error
    try {
      await user.click(getByText(getDialog(), 'Next month'))
    } catch (caught) {
      error = caught
    }

    // Assert
    expect(error).toBeUndefined()
    expect(getDialog().querySelector('tbody [tabindex="0"]')).toBeNull()
  })

  test('an input passed in the config outside the root gets the toggle', () => {
    // Arrange
    document.body.innerHTML = `
      <div class="lis-date-picker"></div>
      <div><input id="elsewhere" type="text"></div>`
    const root = document.querySelector('.lis-date-picker')
    const input = document.getElementById('elsewhere')

    // Act
    let datePicker, error
    try {
      datePicker = new DatePicker(root, { input: { element: input } })
    } catch (caught) {
      error = caught
    }

    // Assert
    expect(error).toBeUndefined()
    expect(datePicker.$calendarButton).toBe(
      input.parentElement.querySelector('.lis-js-date-picker-toggle')
    )
    expect(root.querySelector('button')).toBeNull()
  })

  test('sets the heading and grid ids as attributes, not markup', async () => {
    // Arrange
    const user = userEvent.setup()
    renderDatePicker()
    const input = screen.getByLabelText('Date')
    input.id = 'date" data-injected="yes'
    createAll(DatePicker)

    // Act
    await user.click(getCalendarButton())

    // Assert
    const dialog = getDialog()
    const heading = dialog.querySelector('h2')
    expect(dialog.querySelector('[data-injected]')).toBeNull()
    expect(heading.id).toBe('datepicker-title-date" data-injected="yes')
    expect(dialog.getAttribute('aria-labelledby')).toBe(heading.id)
    expect(dialog.querySelector('table').getAttribute('aria-labelledby')).toBe(
      heading.id
    )
    expect(heading.textContent).toBe('June 2024')
  })

  describe('toggle name', () => {
    test('names the date already in the input at start-up', () => {
      // Arrange
      renderDatePicker()
      screen.getByLabelText('Date').value = '19/5/2024'

      // Act
      createAll(DatePicker)

      // Assert
      expect(getCalendarButton().textContent.trim()).toBe(
        'Choose date. Selected date is Sunday 19 May 2024'
      )
    })

    test('follows a date typed after one was picked', async () => {
      // Arrange
      const user = userEvent.setup()
      renderDatePicker()
      createAll(DatePicker)
      const input = screen.getByLabelText('Date')
      await user.click(getCalendarButton())
      await user.click(screen.getByTestId('14/6/2024'))
      const nameAfterPick = getCalendarButton().textContent.trim()

      // Act
      await user.clear(input)
      await user.type(input, '3/7/2024')

      // Assert
      expect(nameAfterPick).toBe(
        'Choose date. Selected date is Friday 14 June 2024'
      )
      expect(getCalendarButton().textContent.trim()).toBe(
        'Choose date. Selected date is Wednesday 3 July 2024'
      )
    })

    test.each([
      ['empty', ''],
      ['not a real date', '31/4/2024'],
      ['not a date', 'next week']
    ])('drops the date when the input is %s', async (_, value) => {
      // Arrange
      const user = userEvent.setup()
      renderDatePicker()
      const input = screen.getByLabelText('Date')
      input.value = '19/5/2024'
      createAll(DatePicker)

      // Act
      await user.clear(input)
      if (value) {
        await user.type(input, value)
      }

      // Assert
      expect(getCalendarButton().textContent.trim()).toBe('Choose date')
    })

    test('follows a value set by script with a change event', () => {
      // Arrange
      renderDatePicker()
      createAll(DatePicker)
      const input = screen.getByLabelText('Date')

      // Act
      input.value = '1/6/2024'
      input.dispatchEvent(new Event('change', { bubbles: true }))

      // Assert
      expect(getCalendarButton().textContent.trim()).toBe(
        'Choose date. Selected date is Saturday 1 June 2024'
      )
    })
  })

  describe('focus on close', () => {
    test('clicking another field leaves focus in that field', async () => {
      // Arrange
      const user = userEvent.setup()
      renderDatePicker()
      document.body.insertAdjacentHTML(
        'beforeend',
        '<label for="other">Other</label><input id="other" type="text">'
      )
      createAll(DatePicker)
      await user.click(getCalendarButton())
      const otherField = screen.getByLabelText('Other')

      // Act
      await user.click(otherField)

      // Assert
      expect(getDialog().hidden).toBe(true)
      expect(document.activeElement).toBe(otherField)
      expect(getCalendarButton().getAttribute('aria-expanded')).toBe('false')
    })

    test.each([
      ['Escape', async (user) => user.keyboard('{Escape}')],
      [
        'the Close button',
        async (user) => user.click(getByText(getDialog(), 'Close'))
      ],
      [
        'the Select button',
        async (user) => user.click(getByText(getDialog(), 'Select'))
      ],
      [
        'picking a day',
        async (user) => user.click(screen.getByTestId('14/6/2024'))
      ]
    ])('closing with %s returns focus to the toggle', async (_, close) => {
      // Arrange
      const user = userEvent.setup()
      renderDatePicker()
      createAll(DatePicker)
      await user.click(getCalendarButton())

      // Act
      await close(user)

      // Assert
      expect(getDialog().hidden).toBe(true)
      expect(document.activeElement).toBe(getCalendarButton())
    })
  })
})
