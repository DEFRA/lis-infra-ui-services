// Adapted from the date picker in MoJ Frontend 12.0.0
// (https://github.com/ministryofjustice/moj-frontend), MIT licence.
// Copyright (c) 2019 Ministry of Justice

/**
 * Picks the picker's navigation for a calendar key press.
 * @param {object} picker - the date picker that owns the day
 * @param {object} event - keydown event
 * @returns {Function | undefined} the navigation, or undefined for any other key
 */
function navigationForKey(picker, event) {
  const navigations = new Map([
    ['ArrowLeft', () => picker.focusPreviousDay()],
    ['ArrowRight', () => picker.focusNextDay()],
    ['ArrowUp', () => picker.focusPreviousWeek()],
    ['ArrowDown', () => picker.focusNextWeek()],
    ['Home', () => picker.focusFirstDayOfWeek()],
    ['End', () => picker.focusLastDayOfWeek()],
    [
      'PageUp',
      () =>
        event.shiftKey
          ? picker.focusPreviousYear(event)
          : picker.focusPreviousMonth(event)
    ],
    [
      'PageDown',
      () =>
        event.shiftKey
          ? picker.focusNextYear(event)
          : picker.focusNextMonth(event)
    ]
  ])

  return navigations.get(event.key)
}

/**
 * One day button in the calendar grid.
 */
export class CalendarDay {
  /**
   * @param {object} $button - the day's button element
   * @param {number} index - position in the grid
   * @param {number} row - grid row
   * @param {number} column - grid column
   * @param {object} picker - the date picker that owns the day
   */
  constructor($button, index, row, column, picker) {
    this.index = index
    this.row = row
    this.column = column
    this.$button = $button
    this.picker = picker
    this.date = new Date()
  }

  /**
   * @param {Date} day - the Date for the calendar day
   * @param {boolean} hidden - visibility of the day
   * @param {boolean} disabled - is the day selectable or excluded
   */
  update(day, hidden, disabled) {
    const label = day.getDate()
    let accessibleLabel = this.picker.formattedDateHuman(day)

    if (disabled) {
      this.$button.setAttribute('aria-disabled', 'true')
      accessibleLabel = `Excluded date, ${accessibleLabel}`
    } else {
      this.$button.removeAttribute('aria-disabled')
    }

    this.$button.hidden = hidden
    this.$button.dataset.testid = this.picker.formattedDateFromDate(day)

    this.$button.innerHTML = `<span class="govuk-visually-hidden">${accessibleLabel}</span><span aria-hidden="true">${label}</span>`
    this.date = new Date(day)
  }

  /**
   * Called by the picker's delegated click listener on the grid.
   * @param {object} event - click event
   */
  click(event) {
    this.picker.goToDate(this.date)
    this.picker.selectDate(this.date)

    event.stopPropagation()
    event.preventDefault()
  }

  /**
   * Called by the picker's delegated keydown listener on the grid.
   * @param {object} event - keydown event
   */
  keyPress(event) {
    const navigation = navigationForKey(this.picker, event)

    if (navigation) {
      navigation()
      event.preventDefault()
      event.stopPropagation()
    }
  }
}

const DAYS_IN_WEEK = 7
const CALENDAR_WEEKS = 6

/**
 * Fills the calendar's body with six weeks of day buttons.
 * @param {object} $tbody - the calendar table's body
 * @param {object} picker - the date picker that owns the days
 * @returns {CalendarDay[]} the days, in grid order
 */
export function createCalendarDays($tbody, picker) {
  const calendarDays = []
  for (let row = 0; row < CALENDAR_WEEKS; row++) {
    const $row = $tbody.insertRow(row)

    for (let column = 0; column < DAYS_IN_WEEK; column++) {
      const $cell = document.createElement('td')
      $row.appendChild($cell)
      const $dateButton = document.createElement('button')
      $dateButton.setAttribute('type', 'button')
      $cell.appendChild($dateButton)

      calendarDays.push(
        new CalendarDay($dateButton, calendarDays.length, row, column, picker)
      )
    }
  }
  return calendarDays
}
