import { milliseconds } from './duration.js'

/**
 * A convict format for settings that must be a whole number of at least 1,
 * such as timeouts and circuit breaker thresholds, where 0 is a
 * misconfiguration rather than "off". Register it with
 * `convict.addFormat(positiveInteger)` and use `format: 'positive-integer'`.
 */
export const positiveInteger = {
  name: 'positive-integer',
  /**
   * @param {unknown} value the raw value, a string when it came from an environment variable
   * @returns {unknown} the value as a number when it is numeric, otherwise unchanged so validate() can reject it
   */
  coerce(value) {
    if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
      return Number(value)
    }
    return value
  },
  /**
   * @param {unknown} value the coerced value
   */
  validate(value) {
    if (
      typeof value !== 'number' ||
      !Number.isSafeInteger(value) ||
      value < 1
    ) {
      throw new Error('must be a positive integer')
    }
  }
}

const MINIMUM_SECRET_LENGTH = 32

/**
 * A convict format for a signing or encryption secret: a string of at least
 * 32 characters, with no default. The format's own error names the setting,
 * never the value, but convict appends the value to a validation error unless
 * the setting is marked `sensitive: true`. Register it with
 * `convict.addFormat(secret)` and use `format: 'secret'` with
 * `default: null` and `sensitive: true`.
 */
export const secret = {
  name: 'secret',
  /**
   * @param {unknown} value
   */
  validate(value) {
    if (typeof value !== 'string' || value.length === 0) {
      throw new Error('must be set')
    }
    if (value.length < MINIMUM_SECRET_LENGTH) {
      throw new Error(`must be at least ${MINIMUM_SECRET_LENGTH} characters`)
    }
  }
}

const ISO_DURATION_DATE = /^P(?:(\d+)D)?(?:T(.+))?$/
const ISO_DURATION_TIME = /^(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/
const MILLIS_IN_SECOND = 1000
const SECONDS_IN_MINUTE = 60
const MILLIS_IN_MINUTE = SECONDS_IN_MINUTE * MILLIS_IN_SECOND
const MILLIS_IN_HOUR = milliseconds.oneHour
const MILLIS_IN_DAY = milliseconds.oneDay

/**
 * Parses an ISO 8601 duration made of days, hours, minutes and seconds
 * (for example `P7D`, `PT4H`, `P1DT12H`) into milliseconds. Years, months
 * and weeks are not supported because their length is not fixed.
 *
 * @param {string} value
 * @returns {number | undefined} milliseconds, or undefined when it is not a supported duration
 */
export function parseIsoDuration(value) {
  const dateMatch = ISO_DURATION_DATE.exec(value.trim())
  if (!dateMatch) {
    return undefined
  }
  const [, days = 0, time] = dateMatch
  const timeMatch = time === undefined ? [] : ISO_DURATION_TIME.exec(time)
  if (!timeMatch || (days === 0 && !time) || timeMatch[0] === '') {
    return undefined
  }
  const [, hours = 0, minutes = 0, seconds = 0] = timeMatch
  return Math.round(
    Number(days) * MILLIS_IN_DAY +
      Number(hours) * MILLIS_IN_HOUR +
      Number(minutes) * MILLIS_IN_MINUTE +
      Number(seconds) * MILLIS_IN_SECOND
  )
}

/**
 * Builds a convict format for a duration setting that is read as
 * milliseconds. An environment variable may give either an ISO 8601
 * duration such as `PT4H` or `P7D`, or a whole number of milliseconds; both
 * are coerced to milliseconds. Only values loaded from the environment are
 * coerced, so the schema `default` must be a number of milliseconds. The
 * value must be at least 1ms and, when `max` is given, no more than that
 * duration. Register the result with
 * `convict.addFormat(...)` and use its `name` as the setting's `format`.
 *
 * @param {{ max?: string }} [options] `max` is an ISO 8601 duration, e.g. `'P7D'`
 * @returns {{ name: string, coerce: (value: unknown) => unknown, validate: (value: unknown) => void }}
 */
export function duration({ max } = {}) {
  const maxDuration = max?.trim()
  const maxMilliseconds =
    maxDuration === undefined ? undefined : parseIsoDuration(maxDuration)
  if (maxDuration !== undefined && maxMilliseconds === undefined) {
    throw new Error(`max must be an ISO 8601 duration, got ${max}`)
  }
  return {
    name:
      maxDuration === undefined ? 'duration' : `duration-max-${maxDuration}`,
    coerce(value) {
      if (typeof value !== 'string') {
        return value
      }
      const trimmed = value.trim()
      if (/^\d+$/.test(trimmed)) {
        return Number(trimmed)
      }
      return parseIsoDuration(trimmed) ?? value
    },
    validate(value) {
      if (
        typeof value !== 'number' ||
        !Number.isSafeInteger(value) ||
        value < 1
      ) {
        throw new Error(
          'must be an ISO 8601 duration (e.g. PT4H) or a positive number of milliseconds'
        )
      }
      if (maxMilliseconds !== undefined && value > maxMilliseconds) {
        throw new Error(`must be no more than ${maxDuration}`)
      }
    }
  }
}
