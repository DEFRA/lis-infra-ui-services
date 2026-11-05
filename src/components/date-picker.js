// Adapted from the date picker in MoJ Frontend 12.0.0
// (https://github.com/ministryofjustice/moj-frontend), MIT licence.
// Copyright (c) 2019 Ministry of Justice
import { ConfigurableComponent } from 'govuk-frontend'

import { createCalendarDays } from './date-picker-calendar-day.js'
import {
  formatDate,
  parseDate,
  parseExcludedDates,
  parseExcludedDays
} from './date-picker-dates.js'
import { createDialogElement, toggleTemplate } from './date-picker-templates.js'

const DAYS_IN_WEEK = 7
const LAST_DAY_OF_WEEK_OFFSET = DAYS_IN_WEEK - 1
const DAY_ABBREVIATION_LENGTH = 3
const DIALOG_OFFSET_PX = 3
const OPEN_DIALOG_CLASS = 'lis-date-picker__dialog--open'

const DAY_LABELS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
]

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]

/**
 * Adds a calendar dialog to a text input, for picking a date.
 */
export class DatePicker extends ConfigurableComponent {
  /**
   * @param {object} $root - the date picker wrapper element
   * @param {DatePickerConfig} [config] - date picker config
   */
  constructor($root, config = {}) {
    super($root, config)

    const $input =
      this.config.input.element ??
      this.$root.querySelector(this.config.input.selector)

    if (!$input || !($input instanceof globalThis.HTMLInputElement)) {
      return
    }

    this.$input = $input

    this.dayLabels = [...DAY_LABELS]
    this.monthLabels = MONTH_LABELS

    this.currentDate = new Date()
    this.currentDate.setHours(0, 0, 0, 0)
    this.excludedDates = []
    this.excludedDays = []

    this.buttonClass = 'lis-date-picker__button'
    this.selectedDayButtonClass = 'lis-date-picker__button--selected'
    this.currentDayButtonClass = 'lis-date-picker__button--current'
    this.todayButtonClass = 'lis-date-picker__button--today'

    this.setOptions()
    this.initControls()
  }

  /**
   * Wraps the input and adds the toggle button. The dialog is built on first open.
   */
  initControls() {
    this.id = `datepicker-${this.$input.id}`

    this.$componentWrapper = document.createElement('div')
    const $inputWrapper = document.createElement('div')
    this.$componentWrapper.classList.add('lis-date-picker__wrapper')
    $inputWrapper.classList.add('govuk-input__wrapper')

    this.$input.parentElement.insertBefore(this.$componentWrapper, this.$input)
    this.$componentWrapper.appendChild($inputWrapper)
    $inputWrapper.appendChild(this.$input)

    $inputWrapper.insertAdjacentHTML('beforeend', toggleTemplate())

    this.$calendarButton = $inputWrapper.querySelector(
      '.lis-js-date-picker-toggle'
    )
    this.$calendarButton.addEventListener('click', (event) =>
      this.toggleDialog(event)
    )

    for (const type of ['input', 'change']) {
      this.$input.addEventListener(type, () => this.updateToggleName())
    }
    this.updateToggleName()
  }

  /**
   * Keeps the toggle's name in step with the input: it names the date only
   * while the input holds a real one.
   */
  updateToggleName() {
    const date = this.formattedDateFromString(this.$input.value, null)
    this.$calendarButton.querySelector('span').textContent = date
      ? `Choose date. Selected date is ${this.formattedDateHuman(date)}`
      : 'Choose date'
  }

  /**
   * Builds the dialog, its calendar grid and listeners, once.
   */
  createDialogOnce() {
    if (this.$dialog) {
      return
    }

    this.$dialog = this.createDialog()
    this.createCalendarHeaders()
    this.$componentWrapper.insertAdjacentElement('beforeend', this.$dialog)
    // Only points at the dialog once it exists, so the reference is never dangling.
    this.$calendarButton.setAttribute('aria-controls', this.id)

    this.$dialogTitle = this.$dialog.querySelector(
      '.lis-js-date-picker-month-year'
    )

    this.createCalendar()
    this.findDialogButtons()
    this.addDialogListeners()
  }

  /**
   * Finds the dialog's navigation and action buttons.
   */
  findDialogButtons() {
    this.$prevMonthButton = this.$dialog.querySelector(
      '.lis-js-date-picker-prev-month'
    )
    this.$prevYearButton = this.$dialog.querySelector(
      '.lis-js-date-picker-prev-year'
    )
    this.$nextMonthButton = this.$dialog.querySelector(
      '.lis-js-date-picker-next-month'
    )
    this.$nextYearButton = this.$dialog.querySelector(
      '.lis-js-date-picker-next-year'
    )
    this.$cancelButton = this.$dialog.querySelector(
      '.lis-js-date-picker-cancel'
    )
    this.$okButton = this.$dialog.querySelector('.lis-js-date-picker-ok')

    const $dialogButtons = this.$dialog.querySelectorAll(
      'button:not([disabled="true"])'
    )

    this.$firstButtonInDialog = $dialogButtons[0]
    this.$lastButtonInDialog = $dialogButtons[$dialogButtons.length - 1]
  }

  /**
   * Wires up the dialog's buttons, focus trap and Escape key.
   */
  addDialogListeners() {
    this.$prevMonthButton.addEventListener('click', (event) =>
      this.focusPreviousMonth(event, false)
    )
    this.$prevYearButton.addEventListener('click', (event) =>
      this.focusPreviousYear(event, false)
    )
    this.$nextMonthButton.addEventListener('click', (event) =>
      this.focusNextMonth(event, false)
    )
    this.$nextYearButton.addEventListener('click', (event) =>
      this.focusNextYear(event, false)
    )
    this.$cancelButton.addEventListener('click', (event) => {
      event.preventDefault()
      this.closeDialog()
    })
    this.$okButton.addEventListener('click', () => {
      this.selectDate(this.currentDate)
    })

    this.$firstButtonInDialog.addEventListener('keydown', (event) =>
      this.firstButtonKeydown(event)
    )
    this.$lastButtonInDialog.addEventListener('keydown', (event) =>
      this.lastButtonKeydown(event)
    )

    const $grid = this.$dialog.querySelector('.lis-js-date-picker-grid')
    $grid.addEventListener('click', (event) =>
      this.calendarDayFor(event)?.click(event)
    )
    $grid.addEventListener('keydown', (event) =>
      this.calendarDayFor(event)?.keyPress(event)
    )

    this.$dialog.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.closeDialog()
        event.preventDefault()
        event.stopPropagation()
      }
    })
  }

  /**
   * @param {object} event - an event inside the calendar grid
   * @returns {object | undefined} the calendar day whose button the event came from
   */
  calendarDayFor(event) {
    const $button = event.target.closest('button')
    return this.calendarDays.find(
      (calendarDay) => calendarDay.$button === $button
    )
  }

  /**
   * @returns {object} the hidden calendar dialog element
   */
  createDialog() {
    return createDialogElement(this.id, `datepicker-title-${this.$input.id}`)
  }

  /**
   * Fills the calendar grid with a button for each day.
   */
  createCalendar() {
    this.calendarDays = createCalendarDays(
      this.$dialog.querySelector('tbody'),
      this
    )
  }

  /**
   * Adds a column header for each day of the week.
   */
  createCalendarHeaders() {
    this.dayLabels.forEach((day) => {
      const html = `<th scope="col"><span aria-hidden="true">${day.substring(0, DAY_ABBREVIATION_LENGTH)}</span><span class="govuk-visually-hidden">${day}</span></th>`
      const $headerRow = this.$dialog.querySelector('thead > tr')
      $headerRow.insertAdjacentHTML('beforeend', html)
    })
  }

  /**
   * Applies the min, max, excluded and week start options.
   */
  setOptions() {
    this.setMinAndMaxDatesOnCalendar()
    this.setExcludedDates()
    this.setExcludedDays()
    this.setWeekStartDay()
  }

  /**
   * Reads the min and max dates, moving the current date inside them.
   */
  setMinAndMaxDatesOnCalendar() {
    if (this.config.minDate) {
      this.minDate = this.formattedDateFromString(this.config.minDate, null)
      if (this.minDate && this.currentDate < this.minDate) {
        this.currentDate = this.minDate
      }
    }

    if (this.config.maxDate) {
      this.maxDate = this.formattedDateFromString(this.config.maxDate, null)
      if (this.maxDate && this.currentDate > this.maxDate) {
        this.currentDate = this.maxDate
      }
    }
  }

  /**
   * Reads the space-separated excluded dates and date ranges.
   */
  setExcludedDates() {
    if (this.config.excludedDates) {
      this.excludedDates = parseExcludedDates(this.config.excludedDates)
    }
  }

  /**
   * Reads the space-separated excluded days of the week.
   */
  setExcludedDays() {
    if (this.config.excludedDays) {
      this.excludedDays = parseExcludedDays(this.config.excludedDays)
    }
  }

  /**
   * Starts the week on Sunday when asked, otherwise on Monday.
   */
  setWeekStartDay() {
    const weekStartDayParam = this.config.weekStartDay
    if (weekStartDayParam?.toLowerCase() === 'sunday') {
      this.config.weekStartDay = 'sunday'
      this.dayLabels.unshift(this.dayLabels.pop())
    } else {
      this.config.weekStartDay = 'monday'
    }
  }

  /**
   * Determine if a date is selectable
   * @param {Date} date - the date to check
   * @returns {boolean} true when the date cannot be picked
   */
  isExcludedDate(date) {
    if (this.minDate && this.minDate > date) {
      return true
    }

    if (this.maxDate && this.maxDate < date) {
      return true
    }

    for (const excludedDate of this.excludedDates) {
      if (date.toDateString() === excludedDate.toDateString()) {
        return true
      }
    }

    return this.excludedDays.includes(date.getDay())
  }

  /**
   * Get a Date object from a string
   * @param {string} dateString - string in the format d/m/yyyy dd/mm/yyyy
   * @param {Date | null} fallback - date object to return if formatting fails
   * @returns {Date | null} the parsed date, or the fallback
   */
  formattedDateFromString(dateString, fallback = new Date()) {
    return parseDate(dateString, fallback)
  }

  /**
   * Get a formatted date string from a Date object
   * @param {Date} date - date to format to a string
   * @returns {string} the date as d/m/yyyy, or dd/mm/yyyy with leading zeros
   */
  formattedDateFromDate(date) {
    return formatDate(date, this.config.leadingZeros)
  }

  /**
   * Get a human readable date in the format Monday 2 March 2024
   * @param {Date} date - Date to format
   * @returns {string} the date in words
   */
  formattedDateHuman(date) {
    // Uses the Monday-first labels whatever the week start day: MoJ's version
    // indexes the rotated labels, naming every day wrongly when weeks start on Sunday.
    return `${DAY_LABELS[(date.getDay() + LAST_DAY_OF_WEEK_OFFSET) % DAYS_IN_WEEK]} ${date.getDate()} ${this.monthLabels[date.getMonth()]} ${date.getFullYear()}`
  }

  /**
   * Closes the dialog on a click outside it, the input and the toggle.
   * @param {object} event - mouseup event
   */
  backgroundClick(event) {
    if (
      this.isOpen() &&
      event.target instanceof globalThis.Node &&
      !this.$dialog.contains(event.target) &&
      !this.$input.contains(event.target) &&
      !this.$calendarButton.contains(event.target)
    ) {
      event.preventDefault()
      // Leaves focus on whatever the user clicked.
      this.closeDialog(false)
    }
  }

  /**
   * Wraps Shift+Tab from the first dialog button round to the last.
   * @param {object} event - keydown event
   */
  firstButtonKeydown(event) {
    if (event.key === 'Tab' && event.shiftKey) {
      this.$lastButtonInDialog.focus()
      event.preventDefault()
    }
  }

  /**
   * Wraps Tab from the last dialog button round to the first.
   * @param {object} event - keydown event
   */
  lastButtonKeydown(event) {
    if (event.key === 'Tab' && !event.shiftKey) {
      this.$firstButtonInDialog.focus()
      event.preventDefault()
    }
  }

  /**
   * Renders the month containing the current date.
   */
  updateCalendar() {
    this.$dialogTitle.textContent = `${this.monthLabels[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`

    const day = this.currentDate
    const firstOfMonth = new Date(day.getFullYear(), day.getMonth(), 1)
    let dayOfWeek

    if (this.config.weekStartDay === 'monday') {
      // Counts from Monday as 0.
      dayOfWeek =
        firstOfMonth.getDay() === 0
          ? LAST_DAY_OF_WEEK_OFFSET
          : firstOfMonth.getDay() - 1
    } else {
      dayOfWeek = firstOfMonth.getDay()
    }

    firstOfMonth.setDate(firstOfMonth.getDate() - dayOfWeek)

    const thisDay = new Date(firstOfMonth)

    for (const calendarDay of this.calendarDays) {
      const hidden = thisDay.getMonth() !== day.getMonth()
      const disabled = this.isExcludedDate(thisDay)

      calendarDay.update(thisDay, hidden, disabled)

      thisDay.setDate(thisDay.getDate() + 1)
    }
  }

  /**
   * Marks the current, input and today's dates in the grid.
   * @param {boolean} [focus] - Focus the day button
   */
  setCurrentDate(focus = true) {
    const { currentDate } = this
    this.calendarDays.forEach((calendarDay) => {
      calendarDay.$button.classList.add(
        this.buttonClass,
        'lis-date-picker__calendar-day'
      )
      calendarDay.$button.setAttribute('tabindex', '-1')
      calendarDay.$button.classList.remove(this.selectedDayButtonClass)
      const calendarDayDate = calendarDay.date
      calendarDayDate.setHours(0, 0, 0, 0)

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (focus && calendarDayDate.getTime() === currentDate.getTime()) {
        calendarDay.$button.setAttribute('tabindex', '0')
        calendarDay.$button.focus()
        calendarDay.$button.classList.add(this.selectedDayButtonClass)
      }

      if (calendarDayDate.getTime() === this.inputDate?.getTime()) {
        calendarDay.$button.classList.add(this.currentDayButtonClass)
        calendarDay.$button.setAttribute('aria-current', 'date')
      } else {
        calendarDay.$button.classList.remove(this.currentDayButtonClass)
        calendarDay.$button.removeAttribute('aria-current')
      }

      if (calendarDayDate.getTime() === today.getTime()) {
        calendarDay.$button.classList.add(this.todayButtonClass)
      } else {
        calendarDay.$button.classList.remove(this.todayButtonClass)
      }
    })

    // When no day is focused, the first enabled day becomes the grid's tab stop.
    if (!focus) {
      const firstEnabledDay = this.calendarDays.find((calendarDay) => {
        return (
          !calendarDay.$button.hidden &&
          calendarDay.$button.getAttribute('aria-disabled') !== 'true'
        )
      })

      // A month with every day excluded keeps no tab stop rather than throwing.
      if (firstEnabledDay) {
        firstEnabledDay.$button.setAttribute('tabindex', '0')
        this.currentDate = firstEnabledDay.date
      }
    }
  }

  /**
   * Puts the date in the input and closes the dialog, unless it is excluded.
   * @param {Date} date - Date to select
   */
  selectDate(date) {
    if (this.isExcludedDate(date)) {
      return
    }

    this.$input.value = this.formattedDateFromDate(date)
    this.updateToggleName()

    const changeEvent = new Event('change', { bubbles: true, cancelable: true })
    this.$input.dispatchEvent(changeEvent)

    this.closeDialog()
  }

  /**
   * @returns {boolean} true while the dialog is open
   */
  isOpen() {
    return Boolean(this.$dialog?.classList.contains(OPEN_DIALOG_CLASS))
  }

  /**
   * @param {object} event - click event
   */
  toggleDialog(event) {
    event.preventDefault()
    if (this.isOpen()) {
      this.closeDialog()
    } else {
      this.setMinAndMaxDatesOnCalendar()
      this.openDialog()
    }
  }

  /**
   * Shows the dialog on the input's date, moved inside the min and max dates.
   */
  openDialog() {
    this.createDialogOnce()
    this.$dialog.hidden = false
    this.$dialog.classList.add(OPEN_DIALOG_CLASS)
    this.$calendarButton.setAttribute('aria-expanded', 'true')

    // Pins the dialog to the right when the input is wider than it.
    if (this.$input.offsetWidth > this.$dialog.offsetWidth) {
      this.$dialog.style.right = `0px`
    }
    this.$dialog.style.top = `${this.$input.offsetHeight + DIALOG_OFFSET_PX}px`

    this.inputDate = this.formattedDateFromString(this.$input.value)
    if (this.minDate && this.minDate > this.inputDate) {
      this.inputDate = new Date(this.minDate)
    }
    if (this.maxDate && this.maxDate < this.inputDate) {
      this.inputDate = new Date(this.maxDate)
    }
    if (this.minDate && this.maxDate && this.minDate > this.maxDate) {
      console.error('min date is after max date. No dates will be selectable')
    }

    this.currentDate = this.inputDate
    this.currentDate.setHours(0, 0, 0, 0)

    this.updateCalendar()
    this.setCurrentDate()

    // Drops any listener left by a repeated call while already open.
    this.openController?.abort()
    this.openController = new AbortController()
    document.body.addEventListener(
      'mouseup',
      (event) => this.backgroundClick(event),
      { signal: this.openController.signal }
    )
  }

  /**
   * Hides the dialog, returning focus to the toggle button unless asked not to.
   * @param {boolean} [restoreFocus] - focus the toggle button
   */
  closeDialog(restoreFocus = true) {
    this.openController?.abort()
    this.$dialog.hidden = true
    this.$dialog.classList.remove(OPEN_DIALOG_CLASS)
    this.$calendarButton.setAttribute('aria-expanded', 'false')
    if (restoreFocus) {
      this.$calendarButton.focus()
    }
  }

  /**
   * @param {Date} date - Date to go to
   * @param {boolean} [focus] - Focus the day button
   */
  goToDate(date, focus) {
    const current = this.currentDate
    this.currentDate = date

    if (
      current.getMonth() !== this.currentDate.getMonth() ||
      current.getFullYear() !== this.currentDate.getFullYear()
    ) {
      this.updateCalendar()
    }

    this.setCurrentDate(focus)
  }

  /**
   * Moves the current date by a number of days.
   * @param {number} days - days to move, negative to go back
   */
  focusDayOffset(days) {
    const date = new Date(this.currentDate)
    date.setDate(date.getDate() + days)
    this.goToDate(date)
  }

  /**
   * Moves to the next day.
   */
  focusNextDay() {
    this.focusDayOffset(1)
  }

  /**
   * Moves to the previous day.
   */
  focusPreviousDay() {
    this.focusDayOffset(-1)
  }

  /**
   * Moves to the same day next week.
   */
  focusNextWeek() {
    this.focusDayOffset(DAYS_IN_WEEK)
  }

  /**
   * Moves to the same day last week.
   */
  focusPreviousWeek() {
    this.focusDayOffset(-DAYS_IN_WEEK)
  }

  /**
   * Moves to the first day of the current week.
   */
  focusFirstDayOfWeek() {
    const date = new Date(this.currentDate)
    const firstDayOfWeekIndex = this.config.weekStartDay === 'sunday' ? 0 : 1
    const dayOfWeek = date.getDay()
    const diff =
      dayOfWeek >= firstDayOfWeekIndex
        ? dayOfWeek - firstDayOfWeekIndex
        : LAST_DAY_OF_WEEK_OFFSET - dayOfWeek

    date.setDate(date.getDate() - diff)
    date.setHours(0, 0, 0, 0)

    this.goToDate(date)
  }

  /**
   * Moves to the last day of the current week.
   */
  focusLastDayOfWeek() {
    const date = new Date(this.currentDate)
    const lastDayOfWeekIndex =
      this.config.weekStartDay === 'sunday' ? LAST_DAY_OF_WEEK_OFFSET : 0
    const dayOfWeek = date.getDay()
    const diff =
      dayOfWeek <= lastDayOfWeekIndex
        ? lastDayOfWeekIndex - dayOfWeek
        : DAYS_IN_WEEK - dayOfWeek

    date.setDate(date.getDate() + diff)
    date.setHours(0, 0, 0, 0)

    this.goToDate(date)
  }

  /**
   * Moves to the first of next month.
   * @param {object} event - key press or click event
   * @param {boolean} [focus] - Focus the day button
   */
  focusNextMonth(event, focus = true) {
    event.preventDefault()
    const date = new Date(this.currentDate)
    date.setMonth(date.getMonth() + 1, 1)
    this.goToDate(date, focus)
  }

  /**
   * Moves to the first of last month.
   * @param {object} event - key press or click event
   * @param {boolean} [focus] - Focus the day button
   */
  focusPreviousMonth(event, focus = true) {
    event.preventDefault()
    const date = new Date(this.currentDate)
    date.setMonth(date.getMonth() - 1, 1)
    this.goToDate(date, focus)
  }

  /**
   * Moves to the first of the same month next year.
   * @param {object} event - key press or click event
   * @param {boolean} [focus] - Focus the day button
   */
  focusNextYear(event, focus = true) {
    event.preventDefault()
    const date = new Date(this.currentDate)
    date.setFullYear(date.getFullYear() + 1, date.getMonth(), 1)
    this.goToDate(date, focus)
  }

  /**
   * Moves to the first of the same month last year.
   * @param {object} event - key press or click event
   * @param {boolean} [focus] - Focus the day button
   */
  focusPreviousYear(event, focus = true) {
    event.preventDefault()
    const date = new Date(this.currentDate)
    date.setFullYear(date.getFullYear() - 1, date.getMonth(), 1)
    this.goToDate(date, focus)
  }

  static moduleName = 'lis-date-picker'

  /**
   * @type {DatePickerConfig}
   */
  static defaults = Object.freeze({
    leadingZeros: false,
    weekStartDay: 'monday',
    input: {
      selector: '.lis-js-date-picker-input'
    }
  })

  static schema = Object.freeze({
    properties: {
      excludedDates: { type: 'string' },
      excludedDays: { type: 'string' },
      leadingZeros: { type: 'boolean' },
      maxDate: { type: 'string' },
      minDate: { type: 'string' },
      weekStartDay: { type: 'string' },
      input: { type: 'object' }
    }
  })
}

/**
 * @typedef {object} DatePickerConfig
 * @property {string} [excludedDates] - Dates that cannot be selected
 * @property {string} [excludedDays] - Days that cannot be selected
 * @property {boolean} [leadingZeros] - Whether to add leading zeroes when populating the field
 * @property {string} [minDate] - The earliest available date
 * @property {string} [maxDate] - The latest available date
 * @property {string} [weekStartDay] - First day of the week in calendar view
 * @property {object} [input] - Input config
 * @property {string} [input.selector] - Selector for the input element
 * @property {object | null} [input.element] - HTML element for the input
 */
