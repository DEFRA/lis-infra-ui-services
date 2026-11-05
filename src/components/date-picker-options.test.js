// @vitest-environment jsdom
import { getAllByRole, getByRole, screen } from '@testing-library/dom'
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
const JUNE_2024_DAYS = 30
const JUNE_2024_SUNDAYS = [2, 9, 16, 23, 30]

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

function dayButtonsFor(days) {
  return days.map((day) => screen.getByTestId(`${day}/6/2024`))
}

function expectDisabledDays(days) {
  for (const dayButton of dayButtonsFor(days)) {
    expect(dayButton.getAttribute('aria-disabled')).toBe('true')
  }
}

function juneDays() {
  return Array.from({ length: JUNE_2024_DAYS }, (_, index) => index + 1)
}

describe('DatePicker options', () => {
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

  describe('config', () => {
    test('defaults to no leading zeros and weeks starting on Monday', () => {
      // Act
      const datePicker = new DatePicker(renderDatePicker())

      // Assert
      expect(datePicker.config).toStrictEqual({
        leadingZeros: false,
        weekStartDay: 'monday',
        input: { selector: '.lis-js-date-picker-input' }
      })
      expect(datePicker.dayLabels[0]).toBe('Monday')
    })

    test('starts weeks on Sunday when asked, in any case', () => {
      // Act
      const datePicker = new DatePicker(renderDatePicker(), {
        weekStartDay: 'Sunday'
      })

      // Assert
      expect(datePicker.config.weekStartDay).toBe('sunday')
      expect(datePicker.dayLabels[0]).toBe('Sunday')
    })

    test('starts weeks on Monday for any other day', () => {
      // Act
      const datePicker = new DatePicker(renderDatePicker(), {
        weekStartDay: 'friday'
      })

      // Assert
      expect(datePicker.config.weekStartDay).toBe('monday')
    })

    test('reads a past min date without moving the current date', () => {
      // Act
      const datePicker = new DatePicker(renderDatePicker(), {
        minDate: '5/6/2024'
      })

      // Assert
      expect(datePicker.minDate).toStrictEqual(new Date(2024, 5, 5))
      expect(datePicker.currentDate).toStrictEqual(new Date(2024, 5, 12))
    })

    test('moves the current date up to a future min date', () => {
      // Act
      const datePicker = new DatePicker(renderDatePicker(), {
        minDate: '12/06/2025'
      })

      // Assert
      expect(datePicker.minDate).toStrictEqual(new Date(2025, 5, 12))
      expect(datePicker.currentDate).toStrictEqual(new Date(2025, 5, 12))
    })

    test('reads a future max date without moving the current date', () => {
      // Act
      const datePicker = new DatePicker(renderDatePicker(), {
        maxDate: '19/6/2024'
      })

      // Assert
      expect(datePicker.maxDate).toStrictEqual(new Date(2024, 5, 19))
      expect(datePicker.currentDate).toStrictEqual(new Date(2024, 5, 12))
    })

    test('moves the current date back to a past max date', () => {
      // Act
      const datePicker = new DatePicker(renderDatePicker(), {
        maxDate: '5/6/2024'
      })

      // Assert
      expect(datePicker.currentDate).toStrictEqual(new Date(2024, 5, 5))
    })

    test('ignores a min date that is not a date', () => {
      // Act
      const datePicker = new DatePicker(renderDatePicker(), {
        minDate: 'yesterday'
      })

      // Assert
      expect(datePicker.minDate).toBeNull()
      expect(datePicker.isExcludedDate(new Date(2000, 0, 1))).toBe(false)
    })

    test('reads excluded days of the week as Date.getDay() indexes', () => {
      // Act
      const datePicker = new DatePicker(renderDatePicker(), {
        excludedDays: 'sunday Thursday someday'
      })

      // Assert
      expect(datePicker.excludedDays).toEqual([0, 4])
    })

    test('names days in full whatever day the week starts on', () => {
      // Arrange
      const datePicker = new DatePicker(renderDatePicker(), {
        weekStartDay: 'sunday'
      })

      // Act
      const label = datePicker.formattedDateHuman(new Date(2024, 5, 12))

      // Assert
      expect(label).toBe('Wednesday 12 June 2024')
    })

    test('reads excluded days of the week with weeks starting on Sunday', () => {
      // Act
      const datePicker = new DatePicker(renderDatePicker(), {
        excludedDays: 'saturday',
        weekStartDay: 'sunday'
      })

      // Assert
      expect(datePicker.excludedDays).toEqual([6])
    })

    test('reads excluded dates, date ranges and both together', () => {
      // Act
      const datePicker = new DatePicker(renderDatePicker(), {
        excludedDates: '18/6/2024-20/06/2024 22/6/2024 25/6/2024'
      })

      // Assert
      expect(datePicker.excludedDates).toStrictEqual([
        new Date(2024, 5, 18),
        new Date(2024, 5, 19),
        new Date(2024, 5, 20),
        new Date(2024, 5, 22),
        new Date(2024, 5, 25)
      ])
    })

    test('ignores a date range with an end that is not a date', () => {
      // Act
      const datePicker = new DatePicker(renderDatePicker(), {
        excludedDates: '18/6/2024-soon 22/6/2024'
      })

      // Assert
      expect(datePicker.excludedDates).toStrictEqual([new Date(2024, 5, 22)])
    })
  })

  describe('constraints in the calendar', () => {
    async function openCalendar(config) {
      const user = userEvent.setup()
      renderDatePicker()
      createAll(DatePicker, config)
      await user.click(getCalendarButton())
      return user
    }

    function expectDisabled(days) {
      for (const dayButton of dayButtonsFor(days)) {
        expect(dayButton.getAttribute('aria-disabled')).toBe('true')
        expect(
          dayButton.querySelector('.govuk-visually-hidden').textContent
        ).toMatch(/^Excluded date, /)
      }
    }

    function expectEnabled(days) {
      for (const dayButton of dayButtonsFor(days)) {
        expect(dayButton.hasAttribute('aria-disabled')).toBe(false)
      }
    }

    test.each([
      ['without leading zeros', false, '9/6/2024'],
      ['with leading zeros', true, '09/06/2024']
    ])('puts a clicked day in the input %s', async (_, leadingZeros, value) => {
      // Arrange
      const user = await openCalendar({ leadingZeros })

      // Act
      await user.click(screen.getByTestId(value))

      // Assert
      expect(screen.getByLabelText('Date').value).toBe(value)
    })

    test.each(['3/6/2024', '03/06/2024'])(
      'disables the days before a min date of %s',
      async (minDate) => {
        // Act
        await openCalendar({ minDate })

        // Assert
        expectDisabled([1, 2])
        expectEnabled(juneDays().slice(2))
      }
    )

    test('disables the days after a max date', async () => {
      // Act
      await openCalendar({ maxDate: '21/06/2024' })

      // Assert
      expectDisabled(juneDays().slice(21))
      expectEnabled(juneDays().slice(0, 21))
    })

    test('disables excluded dates and ranges', async () => {
      // Act
      await openCalendar({ excludedDates: '3/6/2024 18/6/2024-20/6/2024' })

      // Assert
      expectDisabled([3, 18, 19, 20])
      expectEnabled(juneDays().filter((day) => ![3, 18, 19, 20].includes(day)))
    })

    test('disables excluded days of the week', async () => {
      // Act
      await openCalendar({ excludedDays: 'sunday' })

      // Assert
      expectDisabled(JUNE_2024_SUNDAYS)
      expectEnabled(
        juneDays().filter((day) => !JUNE_2024_SUNDAYS.includes(day))
      )
    })

    test('clicking an excluded day leaves the dialog open and the input empty', async () => {
      // Arrange
      const user = await openCalendar({ excludedDays: 'sunday' })

      // Act
      await user.click(screen.getByTestId('9/6/2024'))

      // Assert
      expect(getDialog().hidden).toBe(false)
      expect(screen.getByLabelText('Date').value).toBe('')
    })

    test('opens on the min date when the input date is before it', async () => {
      // Arrange
      const user = userEvent.setup()
      renderDatePicker()
      createAll(DatePicker, { minDate: '1/7/2024' })
      await user.type(screen.getByLabelText('Date'), '1/1/2024')

      // Act
      await user.click(getCalendarButton())

      // Assert
      expect(getByRole(getDialog(), 'button', { current: 'date' })).toBe(
        screen.getByTestId('1/7/2024')
      )
    })

    test('opens on the max date when the input date is after it', async () => {
      // Arrange
      const user = userEvent.setup()
      renderDatePicker()
      createAll(DatePicker, { maxDate: '1/5/2024' })
      await user.type(screen.getByLabelText('Date'), '1/1/2025')

      // Act
      await user.click(getCalendarButton())

      // Assert
      expect(getByRole(getDialog(), 'button', { current: 'date' })).toBe(
        screen.getByTestId('1/5/2024')
      )
    })

    test('logs an error when the min date is after the max date', async () => {
      // Arrange
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementationOnce(() => undefined)

      // Act
      await openCalendar({ minDate: '20/6/2024', maxDate: '10/6/2024' })

      // Assert
      expect(consoleError).toHaveBeenCalledWith(
        'min date is after max date. No dates will be selectable'
      )
    })

    test.each([
      [undefined, 'Monday'],
      ['sunday', 'Sunday']
    ])(
      'with weekStartDay %s, the first column is %s',
      async (weekStartDay, firstDay) => {
        // Act
        await openCalendar({ weekStartDay })

        // Assert
        const headers = getAllByRole(getDialog(), 'columnheader')
        expect(headers[0].textContent).toBe(
          `${firstDay.slice(0, 3)}${firstDay}`
        )
      }
    )
  })

  describe('data attributes', () => {
    async function openFromAttributes(attributes) {
      const user = userEvent.setup()
      renderDatePicker(attributes)
      createAll(DatePicker)
      await user.click(getCalendarButton())
      return user
    }

    test.each([
      ['false', '9/6/2024'],
      ['true', '09/06/2024']
    ])(
      'data-leading-zeros="%s" formats a clicked day as %s',
      async (leadingZeros, value) => {
        // Arrange
        const user = await openFromAttributes({
          'data-leading-zeros': leadingZeros
        })

        // Act
        await user.click(screen.getByTestId(value))

        // Assert
        expect(screen.getByLabelText('Date').value).toBe(value)
      }
    )

    test('a valueless data-leading-zeros attribute is read as false', async () => {
      // Arrange
      const user = await openFromAttributes({ 'data-leading-zeros': '' })

      // Act
      await user.click(screen.getByTestId('9/6/2024'))

      // Assert
      expect(screen.getByLabelText('Date').value).toBe('9/6/2024')
    })

    test('data-min-date and data-max-date limit the selectable days', async () => {
      // Act
      await openFromAttributes({
        'data-min-date': '03/06/2024',
        'data-max-date': '21/06/2024'
      })

      // Assert
      expectDisabledDays([1, 2, ...juneDays().slice(21)])
      expect(screen.getByTestId('3/6/2024').hasAttribute('aria-disabled')).toBe(
        false
      )
      expect(
        screen.getByTestId('21/6/2024').hasAttribute('aria-disabled')
      ).toBe(false)
    })

    test('data-excluded-dates and data-excluded-days disable those days', async () => {
      // Act
      await openFromAttributes({
        'data-excluded-dates': '4/6/2024-5/6/2024',
        'data-excluded-days': 'sunday'
      })

      // Assert
      expectDisabledDays([4, 5, ...JUNE_2024_SUNDAYS])
      expect(screen.getByTestId('6/6/2024').hasAttribute('aria-disabled')).toBe(
        false
      )
    })

    test('data-week-start-day starts the calendar on Sunday', async () => {
      // Act
      await openFromAttributes({ 'data-week-start-day': 'sunday' })

      // Assert
      const headers = getAllByRole(getDialog(), 'columnheader')
      expect(headers[0].textContent).toBe('SunSunday')
    })
  })
})
