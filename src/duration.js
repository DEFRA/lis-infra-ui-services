const SECONDS_IN_MINUTE = 60
const MINUTES_IN_HOUR = 60
const MILLIS_IN_SECOND = 1000

const HOURS_IN_DAY = 24
const DAYS_IN_WEEK = 7

const TWO = 2
const FOUR = 4
const FIVE = 5
const TEN = 10
const FIFTEEN = 15
const THIRTY = 30
const EIGHT = 8

export const milliseconds = {
  tenSeconds: TEN * MILLIS_IN_SECOND,
  thirtySeconds: THIRTY * MILLIS_IN_SECOND,
  fiveMinutes: FIVE * SECONDS_IN_MINUTE * MILLIS_IN_SECOND,
  fourHours: FOUR * MINUTES_IN_HOUR * SECONDS_IN_MINUTE * MILLIS_IN_SECOND,
  oneDay: HOURS_IN_DAY * MINUTES_IN_HOUR * SECONDS_IN_MINUTE * MILLIS_IN_SECOND,
  oneWeek:
    DAYS_IN_WEEK *
    HOURS_IN_DAY *
    MINUTES_IN_HOUR *
    SECONDS_IN_MINUTE *
    MILLIS_IN_SECOND
}

export const seconds = {
  twoMinutes: TWO * SECONDS_IN_MINUTE,
  fiveMinutes: FIVE * SECONDS_IN_MINUTE,
  tenMinutes: TEN * SECONDS_IN_MINUTE,
  fifteenMinutes: FIFTEEN * SECONDS_IN_MINUTE,
  oneHour: MINUTES_IN_HOUR * SECONDS_IN_MINUTE,
  eightHours: EIGHT * MINUTES_IN_HOUR * SECONDS_IN_MINUTE,
  oneDay: HOURS_IN_DAY * MINUTES_IN_HOUR * SECONDS_IN_MINUTE,
  oneWeek:
    DAYS_IN_WEEK *
    HOURS_IN_DAY *
    MINUTES_IN_HOUR *
    SECONDS_IN_MINUTE
}

/**
 * @returns {number}
 */
export const unixEpoch = () => Math.round(Date.now() / MILLIS_IN_SECOND)
