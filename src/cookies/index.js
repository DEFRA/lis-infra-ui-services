/** @import { Plugin, Request, ResponseToolkit } from '@hapi/hapi' */
import { CSRF_PLUGIN_NAME } from '../csrf/constants.js'
import { isSameOriginRequest } from '../csrf/same-origin.js'
import { getSameHostReferrerPath } from '../referrer-link.js'
import {
  COOKIES_PATH,
  COOKIES_POLICY_COOKIE_NAME,
  cookiesPolicyStateOptions,
  createCookiesPolicy,
  getCookiesPolicy,
  serialiseCookiesPolicy
} from './cookies-policy.js'

const PLUGIN_NAME = 'lis-cookies'
const PAGE_TITLE = 'Cookies'
const VIEW = 'cookies/index'
const CONSENT_VALUES = new Set(['yes', 'no'])
// Only used to resolve a candidate path; never appears in output.
const PROBE_ORIGIN = 'https://same-origin.invalid'

/**
 * @typedef {object} EssentialCookie
 * @property {string} name
 * @property {string} purpose
 * @property {string} expires
 */

/**
 * Keeps a candidate on this origin by resolving it the way a browser would:
 * `//host`, `/\\host` and absolute URLs all resolve elsewhere and are refused.
 * @param {unknown} candidate
 * @returns {string} the path when it is on this origin, otherwise the root
 */
export function toSameOriginPath(candidate) {
  if (typeof candidate !== 'string' || !candidate.startsWith('/')) {
    return '/'
  }

  try {
    const url = new URL(candidate, PROBE_ORIGIN)

    // A normalised path starting with // would be protocol-relative in a link.
    if (url.origin !== PROBE_ORIGIN || url.pathname.startsWith('//')) {
      return '/'
    }

    return `${url.pathname}${url.search}`
  } catch {
    return '/'
  }
}

/**
 * Returns the same-host path the user came from, so the cookies page can
 * link back to it after a choice made from the banner without JavaScript.
 * Anything else, including another host or the cookies page itself, falls
 * back to the service root.
 * @param {Request} request
 * @returns {string}
 */
export function getReturnPath(request) {
  const referrerPath = getSameHostReferrerPath(request)

  if (!referrerPath || referrerPath.split('?')[0] === COOKIES_PATH) {
    return '/'
  }

  return toSameOriginPath(referrerPath)
}

/**
 * @deprecated Use isSameOriginRequest from `@defra/lis-infra-ui-services/csrf`.
 * Kept for existing callers; it now requires the same origin, so a same-site
 * request, or one with neither Sec-Fetch-Site nor Origin, no longer passes.
 * @param {Request} request
 * @returns {boolean}
 */
export function isSameSiteRequest(request) {
  return isSameOriginRequest(request)
}

/**
 * @param {EssentialCookie[]} essentialCookies
 * @returns {(request: Request, h: ResponseToolkit) => unknown}
 */
function createGetHandler(essentialCookies) {
  return function getCookiesPage(request, h) {
    const cookiesPolicy = getCookiesPolicy(request)
    const saved = request.query?.saved === 'true'

    return h.view(VIEW, {
      pageTitle: PAGE_TITLE,
      essentialCookieRows: essentialCookies.map((cookie) => [
        { text: cookie.name },
        { text: cookie.purpose },
        { text: cookie.expires }
      ]),
      analytics: cookiesPolicy?.analytics === true,
      saved,
      returnPath: saved ? toSameOriginPath(request.query?.returnPath) : null
    })
  }
}

/**
 * @param {Request} request
 * @param {ResponseToolkit} h
 * @returns {unknown}
 */
function postConsent(request, h) {
  const analytics = request.payload?.analytics

  if (!CONSENT_VALUES.has(analytics) || !isSameOriginRequest(request)) {
    return h.redirect(COOKIES_PATH)
  }

  const policy = createCookiesPolicy(analytics === 'yes')
  const query = new URLSearchParams({
    saved: 'true',
    returnPath: getReturnPath(request)
  })

  return h
    .redirect(`${COOKIES_PATH}?${query}`)
    .state(COOKIES_POLICY_COOKIE_NAME, serialiseCookiesPolicy(policy))
}

/**
 * Registers the consent cookie and the cookies page: GET shows the page, POST
 * records the choice (from the page's form or the banner without JavaScript)
 * and redirects back to the page with a confirmation.
 * @param {{ essentialCookies: EssentialCookie[] }} options
 * @returns {Plugin<void>}
 */
export function createCookiesPlugin({ essentialCookies } = {}) {
  if (!Array.isArray(essentialCookies) || essentialCookies.length === 0) {
    throw new Error('createCookiesPlugin requires essentialCookies')
  }

  return {
    name: PLUGIN_NAME,
    register(server) {
      server.state(COOKIES_POLICY_COOKIE_NAME, cookiesPolicyStateOptions)

      server.route([
        {
          method: 'GET',
          path: COOKIES_PATH,
          options: { auth: { mode: 'try' } },
          handler: createGetHandler(essentialCookies)
        },
        {
          method: 'POST',
          path: COOKIES_PATH,
          // A signed-out visitor has no CSRF token, and a refused post
          // returns to the page rather than a 403, so the handler checks the
          // origin itself.
          options: {
            auth: { mode: 'try' },
            plugins: { [CSRF_PLUGIN_NAME]: false }
          },
          handler: postConsent
        }
      ])
    }
  }
}
