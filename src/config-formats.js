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
