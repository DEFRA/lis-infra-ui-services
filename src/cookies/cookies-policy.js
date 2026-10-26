/** @import { Request } from '@hapi/hapi' */
import { milliseconds } from '../duration.js'

export const COOKIES_POLICY_COOKIE_NAME = 'cookies_policy'
export const COOKIES_PATH = '/cookies'

/**
 * Hapi state options for the consent cookie. It is readable by client-side
 * JavaScript so the banner can set it and analytics can later check it.
 */
export const cookiesPolicyStateOptions = {
  ttl: milliseconds.oneYear,
  path: '/',
  isSecure: true,
  isHttpOnly: false,
  isSameSite: 'Lax',
  encoding: 'none',
  clearInvalid: true,
  ignoreErrors: true
}

/**
 * @typedef {object} CookiesPolicy
 * @property {boolean} essential - always true; essential cookies cannot be refused
 * @property {boolean} analytics - whether analytics cookies may be set
 */

/**
 * @param {boolean} analytics
 * @returns {CookiesPolicy}
 */
export function createCookiesPolicy(analytics) {
  return { essential: true, analytics: analytics === true }
}

/**
 * Encodes a policy as the cookie value: URL-encoded JSON, so the value only
 * contains cookie-safe characters and client-side code can decode it.
 * @param {CookiesPolicy} policy
 * @returns {string}
 */
export function serialiseCookiesPolicy(policy) {
  return encodeURIComponent(JSON.stringify(policy))
}

/**
 * @param {string | undefined} value - the raw cookie value
 * @returns {CookiesPolicy | null} null when absent or malformed
 */
export function parseCookiesPolicy(value) {
  if (typeof value !== 'string' || value === '') {
    return null
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(value))

    if (typeof parsed?.analytics !== 'boolean') {
      return null
    }

    return createCookiesPolicy(parsed.analytics)
  } catch {
    return null
  }
}

/**
 * @param {Request} [request]
 * @returns {CookiesPolicy | null}
 */
export function getCookiesPolicy(request) {
  return parseCookiesPolicy(request?.state?.[COOKIES_POLICY_COOKIE_NAME])
}
