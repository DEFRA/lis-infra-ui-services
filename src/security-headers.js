/** @import { Plugin } from '@hapi/hapi' */

const HSTS_MAX_AGE_SECONDS = 31536000 // one year

// Response headers that complement the CSP. HSTS pins HTTPS, nosniff stops MIME
// sniffing, and the referrer/permissions policies limit what the browser leaks
// and which powerful features a page may use. Referrer-Policy is "same-origin"
// so same-origin referers still reach resolveHubOrigin's referer fallback while
// cross-origin referer leakage is cut.
const SECURITY_HEADERS = {
  'strict-transport-security': `max-age=${HSTS_MAX_AGE_SECONDS}; includeSubDomains`,
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'same-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()'
}

/**
 * Hapi plugin that sets a fixed set of hardening headers on every response,
 * including Boom error responses.
 * @type {{ plugin: Plugin<void> }}
 */
export const securityHeaders = {
  plugin: {
    name: 'lis-security-headers',
    register(server) {
      server.ext('onPreResponse', (request, h) => {
        const { response } = request
        const headers = response.isBoom
          ? response.output.headers
          : response.headers

        for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
          headers[name] = value
        }

        return h.continue
      })
    }
  }
}
