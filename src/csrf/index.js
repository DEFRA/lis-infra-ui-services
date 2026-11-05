/** @import { Plugin, Request, ResponseToolkit } from '@hapi/hapi' */
import { randomBytes, timingSafeEqual } from 'node:crypto'

import Boom from '@hapi/boom'
import { logger } from '@defra/lis-hubs-infra-core'

import {
  CSRF_FIELD_NAME,
  CSRF_PLUGIN_NAME,
  CSRF_TOKEN_HEADER
} from './constants.js'
import { isSameOriginRequest } from './same-origin.js'

export { CSRF_FIELD_NAME, CSRF_PLUGIN_NAME, CSRF_TOKEN_HEADER }
export { isSameOriginRequest }

const SESSION_KEY = 'lis-csrf-token'
const TOKEN_BYTES = 32
const SAFE_METHODS = new Set(['get', 'head', 'options'])

const tokenResolvers = {
  session: resolveSessionToken,
  header: resolveHeaderToken
}

/**
 * @typedef {object} CsrfPluginOptions
 * @property {'session' | 'header'} tokenSource - `session` for a hub, which
 * keeps the token in its yar session; `header` for a spoke, which gets it from
 * the hub in the `x-lis-csrf-token` header
 */

/**
 * @typedef {false | { enabled?: boolean, token?: boolean }} CsrfRouteOptions
 * Route `options.plugins['lis-csrf']`: `false` or `{ enabled: false }` skips
 * every check; `{ token: false }` keeps the origin check only.
 */

/**
 * A session gets a token only once signed in, so an anonymous visitor is not
 * given a session for it.
 * @param {Request} request
 * @returns {string | undefined}
 */
function resolveSessionToken(request) {
  const stored = request.yar?.get(SESSION_KEY)

  if (typeof stored === 'string' && stored !== '') {
    return stored
  }

  if (!request.auth.isAuthenticated || !request.yar) {
    return undefined
  }

  const token = randomBytes(TOKEN_BYTES).toString('base64url')
  request.yar.set(SESSION_KEY, token)

  return token
}

/**
 * @param {Request} request
 * @returns {string | undefined}
 */
function resolveHeaderToken(request) {
  const token = request.headers[CSRF_TOKEN_HEADER]

  return typeof token === 'string' && token !== '' ? token : undefined
}

/**
 * @param {Request} request
 * @returns {{ enabled: boolean, checkToken: boolean }}
 */
function getRouteSettings(request) {
  const settings = request.route.settings.plugins?.[CSRF_PLUGIN_NAME]

  if (settings === false || settings?.enabled === false) {
    return { enabled: false, checkToken: false }
  }

  return { enabled: true, checkToken: settings?.token !== false }
}

/**
 * Only a parsed form or JSON body can carry the field: a streamed or raw body
 * fails the check unless the route opted out of it.
 * @param {unknown} payload
 * @returns {payload is Record<string, unknown>}
 */
function isParsedObject(payload) {
  if (typeof payload !== 'object' || payload === null) {
    return false
  }

  const prototype = Object.getPrototypeOf(payload)

  return prototype === Object.prototype || prototype === null
}

/**
 * @param {unknown} submitted
 * @param {string | undefined} expected
 * @returns {boolean}
 */
function tokensMatch(submitted, expected) {
  if (
    typeof submitted !== 'string' ||
    typeof expected !== 'string' ||
    expected === ''
  ) {
    return false
  }

  const submittedBytes = Buffer.from(submitted)
  const expectedBytes = Buffer.from(expected)

  return (
    submittedBytes.length === expectedBytes.length &&
    timingSafeEqual(submittedBytes, expectedBytes)
  )
}

/**
 * @param {Request} request
 * @param {'origin' | 'token'} check
 * @returns {Boom.Boom}
 */
function reject(request, check) {
  logger.warn(
    {
      http: { request: { method: request.method } },
      url: { path: request.path },
      event: { reason: `csrf-${check}` }
    },
    `CSRF ${check} check failed`
  )

  return Boom.forbidden()
}

/**
 * @param {(request: Request) => string | undefined} resolveToken
 * @returns {(request: Request, h: ResponseToolkit) => unknown}
 */
function createOnPostAuth(resolveToken) {
  return function protectAgainstCsrf(request, h) {
    const token = resolveToken(request)
    request.plugins[CSRF_PLUGIN_NAME] = { token }

    const { enabled, checkToken } = getRouteSettings(request)

    if (!enabled || SAFE_METHODS.has(request.method)) {
      return h.continue
    }

    if (!isSameOriginRequest(request)) {
      return reject(request, 'origin')
    }

    if (!checkToken) {
      return h.continue
    }

    const { payload } = request

    if (
      !isParsedObject(payload) ||
      !tokensMatch(payload[CSRF_FIELD_NAME], token)
    ) {
      return reject(request, 'token')
    }

    // Route payload validation runs after onPostAuth, so it never sees the field.
    delete payload[CSRF_FIELD_NAME]

    return h.continue
  }
}

/**
 * Drops the session's token, so the next signed-in request is issued a new
 * one. Call it when a user signs in, unless the session is reset there.
 * @param {Request} request
 */
export function clearCsrfToken(request) {
  request.yar?.clear(SESSION_KEY)
  request.plugins[CSRF_PLUGIN_NAME] = {}
}

/**
 * Refuses a POST, PUT, PATCH or DELETE that is not from this origin or does
 * not carry the token in its `_csrf` field. The token is resolved after
 * authentication on every request and published at
 * `request.plugins['lis-csrf'].token` for views and the hub proxy.
 * @type {Plugin<CsrfPluginOptions>}
 */
export const csrfPlugin = {
  name: CSRF_PLUGIN_NAME,
  register(server, { tokenSource } = {}) {
    if (!Object.hasOwn(tokenResolvers, tokenSource ?? '')) {
      throw new Error(
        `${CSRF_PLUGIN_NAME} tokenSource must be 'session' or 'header'`
      )
    }

    if (tokenSource === 'session') {
      server.dependency('@hapi/yar')
    }

    server.ext('onPostAuth', createOnPostAuth(tokenResolvers[tokenSource]))
  }
}
