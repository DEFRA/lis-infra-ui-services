// Adapted from the date picker in MoJ Frontend 12.0.0
// (https://github.com/ministryofjustice/moj-frontend), MIT licence.
// Copyright (c) 2019 Ministry of Justice

// Accepts d/m/yyyy and dd/mm/yyyy, with -, /, comma, full stop or space between
// parts, and nothing else around them but whitespace.
const DATE_FORMAT_PATTERN = /^\s*(\d{1,2})([-/,. ])(\d{1,2})\2(\d{4})\s*$/
const DAY_GROUP = 1
const MONTH_GROUP = 3
const YEAR_GROUP = 4
const PADDED_LENGTH = 2
const SUNDAY_FIRST_DAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday'
]

/**
 * Pads given number with leading zeros
 * @param {number} value - The value to be padded
 * @param {number} length - The length in characters of the output
 * @returns {string} the padded value
 */
function padNumber(value, length = PADDED_LENGTH) {
  return value.toString().padStart(length, '0')
}

/**
 * Get a Date object from a string
 * @param {string} dateString - string in the format d/m/yyyy dd/mm/yyyy
 * @param {Date | null} fallback - value to return if parsing fails
 * @returns {Date | null} the parsed date, or the fallback
 */
export function parseDate(dateString, fallback) {
  const match = DATE_FORMAT_PATTERN.exec(dateString)

  if (!match) {
    return fallback
  }

  const year = Number(match[YEAR_GROUP])
  const monthIndex = Number(match[MONTH_GROUP]) - 1
  const day = Number(match[DAY_GROUP])
  const date = new Date(year, monthIndex, day)

  // Date rolls impossible dates over (31/4 becomes 1/5), so those are rejected.
  const isRealDate =
    date.getFullYear() === year &&
    date.getMonth() === monthIndex &&
    date.getDate() === day
  return isRealDate ? date : fallback
}

/**
 * Parses a daterange string into an array of dates
 * @param {string} rangeString - A daterange string in the format "dd/mm/yyyy-dd/mm/yyyy"
 * @returns {Date[]} every date in the range, or none when either end is invalid
 */
export function parseDateRange(rangeString) {
  const dates = []
  const [startDate, endDate] = rangeString
    .split('-')
    .map((part) => parseDate(part, null))

  if (startDate && endDate) {
    let date = new Date(startDate)
    while (date <= endDate) {
      dates.push(date)
      date = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
    }
  }
  return dates
}

/**
 * Parses whitespace-separated dates and date ranges. A hyphen always marks a
 * range, so the dates must not use it between their parts.
 * @param {string} excludedDates - e.g. "1/6/2026 10/6/2026-12/6/2026"
 * @returns {Date[]} the valid dates; anything that is not a date is dropped
 */
export function parseExcludedDates(excludedDates) {
  return excludedDates
    .trim()
    .split(/\s+/)
    .map((item) =>
      item.includes('-') ? parseDateRange(item) : [parseDate(item, null)]
    )
    .reduce((dates, items) => dates.concat(items), [])
    .filter(Boolean)
}

/**
 * Parses whitespace-separated day names into Date.getDay() indexes.
 * @param {string} excludedDays - e.g. "saturday sunday"
 * @returns {number[]} the indexes of the recognised days
 */
export function parseExcludedDays(excludedDays) {
  // Sunday first, so a day's index matches Date.getDay(). MoJ's version reads
  // the week start day before it is normalised, which shifts every excluded
  // day back by one when the week starts on Sunday.
  return excludedDays
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((item) => SUNDAY_FIRST_DAYS.indexOf(item))
    .filter((item) => item !== -1)
}

/**
 * Get a formatted date string from a Date object
 * @param {Date} date - date to format to a string
 * @param {boolean} leadingZeros - pad the day and month to two digits
 * @returns {string} the date as d/m/yyyy, or dd/mm/yyyy with leading zeros
 */
export function formatDate(date, leadingZeros) {
  if (leadingZeros) {
    return `${padNumber(date.getDate())}/${padNumber(date.getMonth() + 1)}/${date.getFullYear()}`
  }

  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
}
