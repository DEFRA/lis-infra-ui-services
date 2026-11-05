/** @import { Request } from '@hapi/hapi' */

/**
 * @param {Request} request
 * @returns {string} the host the browser addressed, as the hub proxy forwards it
 */
export function getRequestHost(request) {
  return (request.headers['x-forwarded-host'] ?? request.headers.host ?? '')
    .split(',')[0]
    .trim()
}

/**
 * Whether a request came from a page on this origin, by the browser's own
 * signals. Same-site is not enough: deployed hubs share a platform domain with
 * other tenants. Sec-Fetch-Site `none` is a navigation the user started (e.g.
 * from the address bar), which can never be a form posted from a page, so it
 * fails too. A request with neither header fails: current browsers send at
 * least one of them on a form POST, but those that send neither on a
 * same-origin one (IE11, Firefox before 70) are refused.
 * @param {Request} request
 * @returns {boolean}
 */
export function isSameOriginRequest(request) {
  const fetchSite = request.headers['sec-fetch-site']

  if (typeof fetchSite === 'string') {
    return fetchSite === 'same-origin'
  }

  const origin = request.headers.origin

  if (typeof origin !== 'string' || origin === '') {
    return false
  }

  try {
    return new URL(origin).host === getRequestHost(request)
  } catch {
    return false
  }
}
