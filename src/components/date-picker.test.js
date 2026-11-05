// @vitest-environment jsdom
import { getByRole, getByText, screen } from '@testing-library/dom'
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

const SELECTED_CLASS = 'lis-date-picker__button--selected'
const CURRENT_CLASS = 'lis-date-picker__button--current'
const TODAY_CLASS = 'lis-date-picker__button--today'

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

describe('DatePicker', () => {
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

  describe('start-up', () => {
    test('adds a collapsed toggle button but no dialog until first opened', () => {
      // Arrange
      const root = renderDatePicker()

      // Act
      createAll(DatePicker)

      // Assert
      expect(root.contains(getCalendarButton())).toBe(true)
      expect(screen.queryByRole('dialog', { hidden: true })).toBeNull()
      expect(root.querySelectorAll('button')).toHaveLength(1)
      expect(getCalendarButton().getAttribute('aria-expanded')).toBe('false')
      expect(getCalendarButton().getAttribute('aria-haspopup')).toBe('dialog')
      expect(getCalendarButton().hasAttribute('aria-controls')).toBe(false)
      expect(root.hasAttribute('data-lis-date-picker-init')).toBe(true)
    })

    test('builds the dialog on first open and points the toggle at it', async () => {
      // Arrange
      const user = userEvent.setup()
      const root = renderDatePicker()
      createAll(DatePicker)

      // Act
      await user.click(getCalendarButton())

      // Assert
      const dialog = getDialog()
      expect(root.contains(dialog)).toBe(true)
      expect(dialog.hidden).toBe(false)
      expect(getCalendarButton().getAttribute('aria-controls')).toBe(dialog.id)
      expect(
        document.getElementById(dialog.getAttribute('aria-labelledby'))
      ).not.toBeNull()
      expect(dialog.querySelectorAll('tbody button')).toHaveLength(42)
    })

    test('reuses the same dialog on later opens', async () => {
      // Arrange
      const user = userEvent.setup()
      renderDatePicker()
      createAll(DatePicker)
      await user.click(getCalendarButton())
      const firstDialog = getDialog()
      const firstDayButton = screen.getByTestId('12/6/2024')
      await user.click(getCalendarButton())

      // Act
      await user.click(getCalendarButton())

      // Assert
      expect(getDialog()).toBe(firstDialog)
      expect(screen.getAllByRole('dialog', { hidden: true })).toHaveLength(1)
      expect(screen.getByTestId('12/6/2024')).toBe(firstDayButton)
      expect(firstDialog.querySelectorAll('tbody button')).toHaveLength(42)
    })

    test('listens for outside clicks only while the dialog is open', async () => {
      // Arrange
      const user = userEvent.setup()
      const addEventListener = vi.spyOn(document.body, 'addEventListener')
      renderDatePicker()
      createAll(DatePicker)
      const mouseupCalls = () =>
        addEventListener.mock.calls.filter(([type]) => type === 'mouseup')
      const callsBeforeOpen = mouseupCalls().length

      // Act
      await user.click(getCalendarButton())
      const [[, , options]] = mouseupCalls()
      const abortedWhileOpen = options.signal.aborted
      await user.click(getByText(getDialog(), 'Close'))

      // Assert
      expect(callsBeforeOpen).toBe(0)
      expect(mouseupCalls()).toHaveLength(1)
      expect(abortedWhileOpen).toBe(false)
      expect(options.signal.aborted).toBe(true)
    })

    test('an outside click after closing is not handled', async () => {
      // Arrange
      const user = userEvent.setup()
      renderDatePicker()
      createAll(DatePicker)
      await user.click(getCalendarButton())
      await user.click(getByText(getDialog(), 'Close'))
      const backgroundClick = vi.spyOn(DatePicker.prototype, 'backgroundClick')

      // Act
      await user.click(screen.getByText('For example, 17/5/2024.'))

      // Assert
      expect(backgroundClick).not.toHaveBeenCalled()
      expect(getDialog().hidden).toBe(true)
    })

    test('hides the days outside the month with the hidden attribute', async () => {
      // Arrange
      const user = userEvent.setup()
      renderDatePicker()
      createAll(DatePicker)

      // Act
      await user.click(getCalendarButton())

      // Assert
      const lastDayOfMay = screen.getByTestId('31/5/2024')
      const firstDayOfJune = screen.getByTestId('1/6/2024')
      const firstDayOfJuly = screen.getByTestId('1/7/2024')
      expect(lastDayOfMay.hidden).toBe(true)
      expect(firstDayOfJuly.hidden).toBe(true)
      expect(firstDayOfJune.hidden).toBe(false)
      expect(lastDayOfMay.hasAttribute('style')).toBe(false)
      expect(firstDayOfJune.hasAttribute('style')).toBe(false)
    })

    test('adds nothing when the component has no input', () => {
      // Arrange
      document.body.innerHTML =
        '<div class="lis-date-picker" data-module="lis-date-picker"></div>'
      const root = document.querySelector('[data-module]')

      // Act
      const datePicker = new DatePicker(root)

      // Assert
      expect(root.querySelector('button')).toBeNull()
      expect(datePicker.$input).toBeUndefined()
    })

    test('uses the input element passed in the config', () => {
      // Arrange
      const root = renderDatePicker()
      const input = root.querySelector('input')
      input.classList.remove('lis-js-date-picker-input')

      // Act
      const datePicker = new DatePicker(root, { input: { element: input } })

      // Assert
      expect(datePicker.$input).toBe(input)
      expect(root.querySelector('.lis-js-date-picker-toggle')).not.toBeNull()
    })
  })

  describe('dialog', () => {
    test('the toggle button opens and closes the dialog', async () => {
      // Arrange
      const user = userEvent.setup()
      renderDatePicker()
      createAll(DatePicker)

      // Act
      await user.click(getCalendarButton())
      const hiddenWhenOpened = getDialog().hidden
      const expandedWhenOpened =
        getCalendarButton().getAttribute('aria-expanded')
      await user.click(getCalendarButton())

      // Assert
      expect(hiddenWhenOpened).toBe(false)
      expect(expandedWhenOpened).toBe('true')
      expect(getDialog().hidden).toBe(true)
      expect(getCalendarButton().getAttribute('aria-expanded')).toBe('false')
    })

    test('has the select, close and month and year navigation buttons', async () => {
      // Arrange
      const user = userEvent.setup()
      renderDatePicker()
      createAll(DatePicker)

      // Act
      await user.click(getCalendarButton())

      // Assert
      for (const name of [
        'Select',
        'Close',
        'Previous month',
        'Previous year',
        'Next month',
        'Next year'
      ]) {
        expect(getByRole(getDialog(), 'button', { name })).not.toBeNull()
      }
    })

    test('opens on the current month with today focused and marked', async () => {
      // Arrange
      const user = userEvent.setup()
      renderDatePicker()
      createAll(DatePicker)

      // Act
      await user.click(getCalendarButton())

      // Assert
      const todayButton = getByRole(getDialog(), 'button', { current: 'date' })
      expect(getByRole(getDialog(), 'heading', { level: 2 }).textContent).toBe(
        'June 2024'
      )
      expect(document.activeElement).toBe(todayButton)
      expect(todayButton.classList.contains(SELECTED_CLASS)).toBe(true)
      expect(todayButton.classList.contains(CURRENT_CLASS)).toBe(true)
      expect(todayButton.classList.contains(TODAY_CLASS)).toBe(true)
      expect(
        todayButton.querySelector('[aria-hidden="true"]').textContent
      ).toBe('12')
      expect(
        todayButton.querySelector('.govuk-visually-hidden').textContent
      ).toBe('Wednesday 12 June 2024')
    })

    test('the previous month and year buttons move back in time', async () => {
      // Arrange
      const user = userEvent.setup()
      renderDatePicker()
      createAll(DatePicker)
      await user.click(getCalendarButton())
      const title = getByRole(getDialog(), 'heading', { level: 2 })

      // Act
      await user.click(getByText(getDialog(), 'Previous month'))
      const titleAfterMonth = title.textContent
      await user.click(getByText(getDialog(), 'Previous year'))

      // Assert
      expect(titleAfterMonth).toBe('May 2024')
      expect(title.textContent).toBe('May 2023')
    })

    test('the next month and year buttons move forward in time', async () => {
      // Arrange
      const user = userEvent.setup()
      renderDatePicker()
      createAll(DatePicker)
      await user.click(getCalendarButton())
      const title = getByRole(getDialog(), 'heading', { level: 2 })

      // Act
      await user.click(getByText(getDialog(), 'Next month'))
      const titleAfterMonth = title.textContent
      await user.click(getByText(getDialog(), 'Next year'))

      // Assert
      expect(titleAfterMonth).toBe('July 2024')
      expect(title.textContent).toBe('July 2025')
    })

    test('month navigation by button makes the first enabled day the tab stop', async () => {
      // Arrange
      const user = userEvent.setup()
      renderDatePicker()
      createAll(DatePicker)
      await user.click(getCalendarButton())

      // Act
      await user.click(getByText(getDialog(), 'Next month'))

      // Assert
      expect(screen.getByTestId('1/7/2024').getAttribute('tabindex')).toBe('0')
      expect(document.activeElement).toBe(
        getByRole(getDialog(), 'button', { name: 'Next month' })
      )
    })

    test('the close button closes the dialog and focuses the toggle', async () => {
      // Arrange
      const user = userEvent.setup()
      renderDatePicker()
      createAll(DatePicker)
      await user.click(getCalendarButton())

      // Act
      await user.click(getByText(getDialog(), 'Close'))

      // Assert
      expect(getDialog().hidden).toBe(true)
      expect(document.activeElement).toBe(getCalendarButton())
    })

    test('clicking outside the dialog closes it', async () => {
      // Arrange
      const user = userEvent.setup()
      renderDatePicker()
      createAll(DatePicker)
      await user.click(getCalendarButton())

      // Act
      await user.click(screen.getByText('For example, 17/5/2024.'))

      // Assert
      expect(getDialog().hidden).toBe(true)
    })

    test('clicking inside the dialog keeps it open', async () => {
      // Arrange
      const user = userEvent.setup()
      renderDatePicker()
      createAll(DatePicker)
      await user.click(getCalendarButton())

      // Act
      await user.click(getByRole(getDialog(), 'heading', { level: 2 }))

      // Assert
      expect(getDialog().hidden).toBe(false)
    })
  })

  describe('with a date in the input', () => {
    test('opens on the input date, focused and marked current but not today', async () => {
      // Arrange
      const user = userEvent.setup()
      renderDatePicker()
      createAll(DatePicker)
      await user.type(screen.getByLabelText('Date'), '19/05/2024')

      // Act
      await user.click(getCalendarButton())

      // Assert
      const inputDateButton = getByRole(getDialog(), 'button', {
        current: 'date'
      })
      expect(inputDateButton).toBe(screen.getByTestId('19/5/2024'))
      expect(document.activeElement).toBe(inputDateButton)
      expect(inputDateButton.classList.contains(SELECTED_CLASS)).toBe(true)
      expect(inputDateButton.classList.contains(CURRENT_CLASS)).toBe(true)
      expect(inputDateButton.classList.contains(TODAY_CLASS)).toBe(false)
    })

    test('clicking a day puts it in the input, closes the dialog and focuses the toggle', async () => {
      // Arrange
      const user = userEvent.setup()
      renderDatePicker()
      createAll(DatePicker)
      const input = screen.getByLabelText('Date')
      const changeListener = vi.fn()
      input.addEventListener('change', changeListener)
      await user.type(input, '19/05/2024')
      await user.click(getCalendarButton())

      // Act
      await user.click(screen.getByTestId('14/5/2024'))

      // Assert
      expect(getDialog().hidden).toBe(true)
      expect(input.value).toBe('14/5/2024')
      expect(changeListener).toHaveBeenCalled()
      expect(document.activeElement).toBe(getCalendarButton())
      expect(getCalendarButton().textContent.trim()).toBe(
        'Choose date. Selected date is Tuesday 14 May 2024'
      )
    })

    test('the select button puts the focused day in the input and closes the dialog', async () => {
      // Arrange
      const user = userEvent.setup()
      renderDatePicker()
      createAll(DatePicker)
      const input = screen.getByLabelText('Date')
      await user.type(input, '19/05/2024')
      await user.click(getCalendarButton())
      await user.keyboard('[ArrowRight]')

      // Act
      await user.click(getByText(getDialog(), 'Select'))

      // Assert
      expect(getDialog().hidden).toBe(true)
      expect(input.value).toBe('20/5/2024')
      expect(document.activeElement).toBe(getCalendarButton())
    })
  })

  describe('keyboard', () => {
    async function openOn(user, value, config) {
      renderDatePicker()
      createAll(DatePicker, config)
      await user.type(screen.getByLabelText('Date'), value)
      await user.click(getCalendarButton())
    }

    function expectFocusedDay(testId) {
      const dayButton = screen.getByTestId(testId)
      expect(document.activeElement).toBe(dayButton)
      expect(dayButton.classList.contains(SELECTED_CLASS)).toBe(true)
    }

    test('Escape closes the dialog and focuses the toggle', async () => {
      // Arrange
      const user = userEvent.setup()
      renderDatePicker()
      createAll(DatePicker)
      await user.type(screen.getByLabelText('Date'), '19/5/2024')
      await user.tab()
      await user.keyboard('{Enter}')
      const hiddenWhenOpened = getDialog().hidden

      // Act
      await user.keyboard('{Escape}')

      // Assert
      expect(hiddenWhenOpened).toBe(false)
      expect(getDialog().hidden).toBe(true)
      expect(document.activeElement).toBe(getCalendarButton())
    })

    test('Tab is trapped inside the dialog', async () => {
      // Arrange
      const user = userEvent.setup()
      await openOn(user, '19/5/2024')
      const dialog = getDialog()
      const expectedOrder = [
        getByRole(dialog, 'button', { name: 'Select' }),
        getByRole(dialog, 'button', { name: 'Close' }),
        getByRole(dialog, 'button', { name: 'Previous year' }),
        getByRole(dialog, 'button', { name: 'Previous month' }),
        getByRole(dialog, 'button', { name: 'Next month' }),
        getByRole(dialog, 'button', { name: 'Next year' }),
        screen.getByTestId('19/5/2024')
      ]

      // Act
      const focused = []
      for (let step = 0; step < expectedOrder.length; step++) {
        await user.tab()
        focused.push(document.activeElement)
      }

      // Assert
      expect(focused).toEqual(expectedOrder)
    })

    test('Shift+Tab on the first dialog button wraps to the last', async () => {
      // Arrange
      const user = userEvent.setup()
      await openOn(user, '19/5/2024')
      getByRole(getDialog(), 'button', { name: 'Previous year' }).focus()

      // Act
      await user.tab({ shift: true })

      // Assert
      expect(document.activeElement).toBe(
        getByRole(getDialog(), 'button', { name: 'Close' })
      )
    })

    test('ArrowRight moves to the next day', async () => {
      // Arrange
      const user = userEvent.setup()
      await openOn(user, '19/5/2024')

      // Act
      await user.keyboard('[ArrowRight]')

      // Assert
      expectFocusedDay('20/5/2024')
    })

    test('ArrowLeft moves to the previous day', async () => {
      // Arrange
      const user = userEvent.setup()
      await openOn(user, '19/5/2024')

      // Act
      await user.keyboard('[ArrowLeft]')

      // Assert
      expectFocusedDay('18/5/2024')
    })

    test('ArrowUp moves to the same day last week', async () => {
      // Arrange
      const user = userEvent.setup()
      await openOn(user, '19/5/2024')

      // Act
      await user.keyboard('[ArrowUp]')

      // Assert
      expectFocusedDay('12/5/2024')
    })

    test('ArrowDown moves to the same day next week', async () => {
      // Arrange
      const user = userEvent.setup()
      await openOn(user, '19/5/2024')

      // Act
      await user.keyboard('[ArrowDown]')

      // Assert
      expectFocusedDay('26/5/2024')
    })

    test('ArrowRight past the end of the month moves into the next month', async () => {
      // Arrange
      const user = userEvent.setup()
      await openOn(user, '31/5/2024')

      // Act
      await user.keyboard('[ArrowRight]')

      // Assert
      expectFocusedDay('1/6/2024')
      expect(getByRole(getDialog(), 'heading', { level: 2 }).textContent).toBe(
        'June 2024'
      )
    })

    test.each([
      ['monday', '[Home]', '13/5/2024'],
      ['monday', '[End]', '19/5/2024'],
      ['sunday', '[Home]', '12/5/2024'],
      ['sunday', '[End]', '18/5/2024']
    ])(
      'with the week starting on %s, %s moves within the week',
      async (weekStartDay, key, expectedDay) => {
        // Arrange
        const user = userEvent.setup()
        await openOn(user, '15/5/2024', { weekStartDay })

        // Act
        await user.keyboard(key)

        // Assert
        expectFocusedDay(expectedDay)
      }
    )

    test.each([
      ['monday', '[Home]', '13/5/2024'],
      ['sunday', '[End]', '25/5/2024']
    ])(
      'with the week starting on %s, %s from a Sunday moves within the week',
      async (weekStartDay, key, expectedDay) => {
        // Arrange
        const user = userEvent.setup()
        await openOn(user, '19/5/2024', { weekStartDay })

        // Act
        await user.keyboard(key)

        // Assert
        expectFocusedDay(expectedDay)
      }
    )

    test('PageUp moves back a month and Shift+PageUp back a year', async () => {
      // Arrange
      const user = userEvent.setup()
      await openOn(user, '19/5/2024')
      const title = getByRole(getDialog(), 'heading', { level: 2 })

      // Act
      await user.keyboard('{PageUp}')
      const titleAfterMonth = title.textContent
      await user.keyboard('{Shift>}{PageUp}{/Shift}')

      // Assert
      expect(titleAfterMonth).toBe('April 2024')
      expect(title.textContent).toBe('April 2023')
      expectFocusedDay('1/4/2023')
    })

    test('PageDown moves on a month and Shift+PageDown on a year', async () => {
      // Arrange
      const user = userEvent.setup()
      await openOn(user, '19/5/2024')
      const title = getByRole(getDialog(), 'heading', { level: 2 })

      // Act
      await user.keyboard('{PageDown}')
      const titleAfterMonth = title.textContent
      await user.keyboard('{Shift>}{PageDown}{/Shift}')

      // Assert
      expect(titleAfterMonth).toBe('June 2024')
      expect(title.textContent).toBe('June 2025')
      expectFocusedDay('1/6/2025')
    })

    test.each(['[Enter]', '[Space]'])(
      '%s selects the focused day and closes the dialog',
      async (key) => {
        // Arrange
        const user = userEvent.setup()
        await openOn(user, '19/5/2024')
        await user.keyboard('[ArrowRight]')

        // Act
        await user.keyboard(key)

        // Assert
        expect(getDialog().hidden).toBe(true)
        expect(screen.getByLabelText('Date').value).toBe('20/5/2024')
        expect(document.activeElement).toBe(getCalendarButton())
      }
    )

    test('Enter on the select button selects the focused day', async () => {
      // Arrange
      const user = userEvent.setup()
      await openOn(user, '19/5/2024')
      await user.keyboard('[ArrowRight]')
      await user.tab()

      // Act
      await user.keyboard('[Enter]')

      // Assert
      expect(getDialog().hidden).toBe(true)
      expect(screen.getByLabelText('Date').value).toBe('20/5/2024')
    })

    test('Enter on the close button closes without changing the input', async () => {
      // Arrange
      const user = userEvent.setup()
      await openOn(user, '19/5/2024')
      await user.keyboard('[ArrowRight]')
      await user.tab()
      await user.tab()

      // Act
      await user.keyboard('[Enter]')

      // Assert
      expect(getDialog().hidden).toBe(true)
      expect(screen.getByLabelText('Date').value).toBe('19/5/2024')
      expect(document.activeElement).toBe(getCalendarButton())
    })

    test('other keys on a day are left to the browser', async () => {
      // Arrange
      const user = userEvent.setup()
      await openOn(user, '19/5/2024')

      // Act
      await user.keyboard('[KeyA]')

      // Assert
      expectFocusedDay('19/5/2024')
      expect(getDialog().hidden).toBe(false)
    })

    test('Enter in the input still submits the form', async () => {
      // Arrange
      const user = userEvent.setup()
      renderDatePicker()
      createAll(DatePicker)
      const submitListener = vi.fn((event) => event.preventDefault())
      screen.getByRole('form').addEventListener('submit', submitListener)
      await user.click(screen.getByLabelText('Date'))

      // Act
      await user.keyboard('[Enter]')

      // Assert
      expect(submitListener).toHaveBeenCalledTimes(1)
    })
  })
})
