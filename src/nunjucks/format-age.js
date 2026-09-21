import { intervalToDuration, isDate, isValid, parseISO } from 'date-fns'

/**
 * @param {Date | string} dateOfBirth
 * @param {Date} [now]
 * @returns {string} e.g. "3 years, 6 months", "3 years" for a whole number
 *   of years, or "6 months" for an animal under a year old. Empty when there
 *   is no usable date of birth - missing, unparseable or in the future - so
 *   a page never shows a made-up age.
 */
export function formatAge(dateOfBirth, now = new Date()) {
  if (!dateOfBirth) {
    return ''
  }

  const start = isDate(dateOfBirth) ? dateOfBirth : parseISO(dateOfBirth)

  if (!isValid(start) || start > now) {
    return ''
  }

  // intervalToDuration omits a unit entirely (rather than returning 0) when
  // its value is zero, so years/months need a default.
  const { years = 0, months = 0 } = intervalToDuration({ start, end: now })

  const yearsText = `${years} year${years === 1 ? '' : 's'}`
  const monthsText = `${months} month${months === 1 ? '' : 's'}`

  if (years === 0) {
    return months === 0 ? 'Less than 1 month' : monthsText
  }

  if (months === 0) {
    return yearsText
  }

  return `${yearsText}, ${monthsText}`
}
