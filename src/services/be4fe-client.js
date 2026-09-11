import Wreck from '@hapi/wreck'
import { requestContext, getServiceBaseUrl } from '@defra/lis-hubs-infra-core'

import { statusCodes } from '../status-codes.js'

/**
 * Error returned for an unsuccessful or unreachable BaseClient request.
 */
export class BaseClientError extends Error {
  /**
   * @param {string} message Error description
   * @param {{ cause?: Error, statusCode?: number }} options Error metadata
   */
  constructor(message, options = {}) {
    super(message, options)
    this.name = 'BaseClientError'
    this.statusCode = options.statusCode
  }
}

function parseError(statusCode, payload) {
  if (payload?.error?.code) {
    return new BaseClientError(
      `${payload.error.code} - ${payload.error.message}`,
      { statusCode }
    )
  }

  if (payload?.detail || payload?.title) {
    return new BaseClientError(
      `${payload.status} - ${payload.detail || payload.title}`,
      { statusCode }
    )
  }

  if (statusCode === statusCodes.unprocessableEntity) {
    return new BaseClientError('Validation failed', { statusCode })
  }

  return new BaseClientError(`Request failed - ${statusCode}`, { statusCode })
}

/**
 * A generic Wreck wrapper for a BE4FE or other upstream service, shared
 * across spokes and hubs. It resolves its own baseUrl via getServiceBaseUrl,
 * so a consumer only supplies the environment and the target service's name.
 * Subclass it and add named methods that call
 * _get()/_post()/_put()/_patch()/_delete() with a path.
 */
export class BaseClient {
  /** @protected */
  _baseUrl

  /** @protected */
  _apiKey

  /** @protected */
  _apiKeyHeader

  /** @protected */
  _timeout

  /**
   * @param {{ environment: string, serviceName: string, port?: number, apiKey?: string, apiKeyHeader?: string, timeout?: number }} options
   */
  constructor({
    environment,
    serviceName,
    port,
    apiKey,
    apiKeyHeader,
    timeout
  }) {
    this._baseUrl = getServiceBaseUrl(environment, serviceName, port).origin
    this._apiKey = apiKey
    this._apiKeyHeader = apiKeyHeader
    this._timeout = timeout
  }

  /**
   * @protected
   * @param {string} path Path relative to baseUrl
   * @param {object} [options] Wreck request options
   * @returns {Promise<object>} the Wreck result ({ res, payload })
   */
  _get(path, options) {
    return this._request('GET', path, this._buildOptions(options))
  }

  /**
   * @protected
   * @param {string} path Path relative to baseUrl
   * @param {object} [options] Wreck request options
   * @returns {Promise<object>} the Wreck result ({ res, payload })
   */
  _post(path, options) {
    return this._request('POST', path, this._buildOptions(options))
  }

  /**
   * @protected
   * @param {string} path Path relative to baseUrl
   * @param {object} [options] Wreck request options
   * @returns {Promise<object>} the Wreck result ({ res, payload })
   */
  _put(path, options) {
    return this._request('PUT', path, this._buildOptions(options))
  }

  /**
   * @protected
   * @param {string} path Path relative to baseUrl
   * @param {object} [options] Wreck request options
   * @returns {Promise<object>} the Wreck result ({ res, payload })
   */
  _patch(path, options) {
    return this._request('PATCH', path, this._buildOptions(options))
  }

  /**
   * @protected
   * @param {string} path Path relative to baseUrl
   * @param {object} [options] Wreck request options
   * @returns {Promise<object>} the Wreck result ({ res, payload })
   */
  _delete(path, options) {
    return this._request('DELETE', path, this._buildOptions(options))
  }

  /**
   * @protected
   * @param {object} [options] caller-supplied Wreck request options
   * @returns {object} Wreck request options with baseUrl/json/timeout/headers applied
   */
  _buildOptions(options = {}) {
    return {
      baseUrl: this._baseUrl,
      json: true,
      timeout: this._timeout,
      ...options,
      headers: this._buildHeaders(options.headers)
    }
  }

  /**
   * @protected
   * @param {object} [callerHeaders] headers supplied on this call
   * @returns {object} correlation, api key and caller headers merged
   */
  _buildHeaders(callerHeaders) {
    const headers = { ...requestContext.getHeaders() }

    if (this._apiKey) {
      headers[this._apiKeyHeader] = this._apiKey
    }

    return { ...headers, ...callerHeaders }
  }

  /**
   * @protected
   * @param {string} method HTTP method
   * @param {string} path Path relative to baseUrl
   * @param {object} options Wreck request options
   * @returns {Promise<object>} the Wreck result ({ res, payload })
   */
  async _request(method, path, options) {
    let res

    try {
      res = await Wreck.request(method, path, options)
    } catch (error) {
      throw parseError(error.output?.statusCode, error.data?.payload)
    }

    let payload

    try {
      payload = await Wreck.read(res, options)
    } catch {
      throw parseError(res.statusCode)
    }

    if (res.statusCode >= statusCodes.badRequest) {
      throw parseError(res.statusCode, payload)
    }

    return { res, payload }
  }
}
