import { intervalToDuration, isDate, parseISO } from 'date-fns'

/**
 * @param {Date | string} dateOfBirth
 * @param {Date} [now]
 * @returns {string} e.g. "3 years, 6 months", or "3 years" for a whole
 *   number of years
 */
export function formatAge(dateOfBirth, now = new Date()) {
  // intervalToDuration omits a unit entirely (rather than returning 0) when
  // its value is zero, so years/months need a default.
  const { years = 0, months = 0 } = intervalToDuration({
    start: isDate(dateOfBirth) ? dateOfBirth : parseISO(dateOfBirth),
    end: now
  })

  const yearsText = `${years} year${years === 1 ? '' : 's'}`

  if (months === 0) {
    return yearsText
  }

  return `${yearsText}, ${months} month${months === 1 ? '' : 's'}`
}
