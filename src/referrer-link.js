/** @import { Request, Server } from '@hapi/hapi' */
import { randomUUID } from 'node:crypto'

import { milliseconds } from './duration.js'

const idPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/**
 * The browser sends the hub's public URL as the referrer, and the hub proxy
 * passes the host it was called on as x-forwarded-host, so the two are
 * compared to keep a link built from the referrer on the current domain.
 *
 * @param {Request} request
 * @returns {string | undefined} the referrer's path and query, when it is on the same host as the request
 */
export function getSameHostReferrerPath(request) {
  const { referer } = request.headers
  if (!referer) {
    return undefined
  }

  let refererUrl
  try {
    refererUrl = new URL(referer)
  } catch {
    return undefined
  }

  const requestHost = (
    request.headers['x-forwarded-host'] ??
    request.headers.host ??
    ''
  )
    .split(',')[0]
    .trim()

  // A path starting with // would make the link protocol-relative, i.e.
  // another site.
  if (refererUrl.host !== requestHost || refererUrl.pathname.startsWith('//')) {
    return undefined
  }

  return `${refererUrl.pathname}${refererUrl.search}`
}

/**
 * @param {string} href
 * @param {string} queryParam
 * @param {string | null} id
 * @returns {string} href with the referrer id appended, or unchanged when there is no id
 */
function appendReferrerId(href, queryParam, id) {
  if (!id) {
    return href
  }
  const separator = href.includes('?') ? '&' : '?'
  return `${href}${separator}${queryParam}=${id}`
}

/**
 * @param {Request} request
 * @returns {string | null} the signed-in user's subject, which keys what is remembered for them
 */
function userKey(request) {
  const sub = request.auth?.credentials?.user?.sub
  return typeof sub === 'string' && sub.length > 0 ? sub : null
}

/**
 * Remembers where a user came from so pages reached from a list can link
 * back to it, including its query, after moving between related pages.
 *
 * On a request whose same-host referrer the caller allows, the referrer path
 * is stored in the server cache under a new id, keyed with the user, and the
 * page links to its related pages carrying `?<queryParam>=<id>`. A request
 * carrying an id resolves it from the cache, for the same user only.
 *
 * @typedef {object} ReferrerLink
 * @property {string | null} id the id to carry on links to related pages, or null when there is nothing to carry
 * @property {string} href the back link: the remembered referrer, or the fallback
 */

/**
 * @param {Server} server
 * @param {object} options
 * @param {string} options.cacheName a cache provisioned on the server
 * @param {(path: string) => boolean} options.allow whether a same-host referrer path is one worth remembering
 * @param {string} options.fallbackHref the back link when nothing is remembered
 * @param {(request: Request) => boolean} [options.when] whether the request gets a back link at all; defaults to always
 * @param {string} [options.queryParam] query parameter carrying the id; defaults to "referrer"
 * @param {string} [options.segment] cache segment; defaults to "referrer-link"
 * @param {number} [options.expiresIn] how long a remembered referrer lasts, in milliseconds; defaults to one hour
 * @returns {{ resolve: (request: Request) => Promise<ReferrerLink | null>, link: (href: string, id: string | null) => string }}
 */
export function createReferrerLink(
  server,
  {
    cacheName,
    allow,
    fallbackHref,
    when = () => true,
    queryParam = 'referrer',
    segment = 'referrer-link',
    expiresIn = milliseconds.oneHour
  }
) {
  if (typeof cacheName !== 'string' || cacheName.length === 0) {
    throw new TypeError('createReferrerLink() requires a cacheName')
  }
  if (typeof allow !== 'function') {
    throw new TypeError('createReferrerLink() requires an allow function')
  }
  if (typeof fallbackHref !== 'string' || fallbackHref.length === 0) {
    throw new TypeError('createReferrerLink() requires a fallbackHref')
  }

  const store = server.cache({ cache: cacheName, segment, expiresIn })

  /**
   * A route pre method: resolves the back link for the request. Null when
   * `when` rules the request out, so the page shows no back link.
   * @param {Request} request
   * @returns {Promise<ReferrerLink | null>}
   */
  async function resolve(request) {
    if (!when(request)) {
      return null
    }

    const user = userKey(request)
    const requestedId = request.query?.[queryParam]

    if (
      user &&
      typeof requestedId === 'string' &&
      idPattern.test(requestedId)
    ) {
      const remembered = await store.get(`${user}:${requestedId}`)
      if (typeof remembered === 'string') {
        return { id: requestedId, href: remembered }
      }
    }

    const referrerPath = getSameHostReferrerPath(request)
    if (user && referrerPath && allow(referrerPath)) {
      const id = randomUUID()
      await store.set(`${user}:${id}`, referrerPath)
      return { id, href: referrerPath }
    }

    return { id: null, href: fallbackHref }
  }

  return {
    resolve,
    link: (href, id) => appendReferrerId(href, queryParam, id)
  }
}
