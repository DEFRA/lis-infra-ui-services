import { format, isDate, parseISO } from 'date-fns'

/**
 * @param {Date | string} value
 * @param {string} [formattedDateStr]
 * @returns {string}
 */
export function formatDate(value, formattedDateStr = 'EEE do MMMM yyyy') {
  const date = isDate(value) ? value : parseISO(value)

  return format(date, formattedDateStr)
}
