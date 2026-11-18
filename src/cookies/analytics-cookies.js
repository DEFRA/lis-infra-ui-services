/** @import { Request } from '@hapi/hapi' */

// Google Analytics' own cookies: _ga and _ga_<stream id>, plus _gid and
// _gat from its older libraries.
const ANALYTICS_COOKIE_PATTERN = /^_(ga|gid|gat)(_\w+)?$/
const HOSTNAME_PATTERN = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/
const EXPIRED = 'Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/'

/**
 * @param {Request} request
 * @returns {string[]} the domains a cookie readable on this host could have been set for: the host and each parent domain down to two labels
 */
function getCookieDomains(request) {
  const hostname = (
    request.headers['x-forwarded-host'] ??
    request.headers.host ??
    ''
  )
    .split(',')[0]
    .trim()
    .split(':')[0]
    .toLowerCase()

  if (!HOSTNAME_PATTERN.test(hostname)) {
    return []
  }

  const labels = hostname.split('.')

  return labels
    .slice(0, -1)
    .map((_label, index) => labels.slice(index).join('.'))
}

/**
 * Builds the Set-Cookie headers that remove the Google Analytics cookies the
 * browser sent. A cookie is only removed by naming the domain it was set
 * for, which Google picks itself and the request does not reveal, so each
 * cookie is expired for the host alone and for every parent domain; the
 * browser ignores the ones that do not apply.
 * @param {Request} request
 * @returns {string[]}
 */
export function expireAnalyticsCookies(request) {
  const names = Object.keys(request.state ?? {}).filter((name) =>
    ANALYTICS_COOKIE_PATTERN.test(name)
  )
  const domains = getCookieDomains(request)

  return names.flatMap((name) => [
    `${name}=; ${EXPIRED}`,
    ...domains.map((domain) => `${name}=; ${EXPIRED}; Domain=${domain}`)
  ])
}
