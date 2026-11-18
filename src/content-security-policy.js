/** @import { Plugin } from '@hapi/hapi' */
import Blankie from 'blankie'

// What Google asks a content security policy to allow for Google Tag Manager
// loading Google Analytics 4. Nothing is requested from them until analytics
// cookies are accepted.
const GOOGLE_TAG_MANAGER = 'https://*.googletagmanager.com'
const GOOGLE_ANALYTICS = [
  'https://*.google-analytics.com',
  'https://*.analytics.google.com'
]

// Lets GOV.UK Frontend's inline script, which the page template writes to
// mark JavaScript as available, run without allowing inline scripts.
// https://frontend.design-system.service.gov.uk/import-javascript/#if-our-inline-javascript-snippet-is-blocked-by-a-content-security-policy
const GOVUK_FRONTEND_INLINE_SCRIPT =
  "'sha256-GUQ5ad8JK5KmEWmROf3LZd9ge94daqNvd8xy9YS1iDw='"

/**
 * The content security policy for every page of the service. Register
 * `@hapi/scooter` before it, which Blankie depends on.
 * @type {{ plugin: Plugin<object>, options: object }}
 */
export const contentSecurityPolicy = {
  plugin: Blankie,
  options: {
    defaultSrc: ['self'],
    fontSrc: ['self', 'data:'],
    connectSrc: [
      'self',
      'wss',
      'data:',
      GOOGLE_TAG_MANAGER,
      ...GOOGLE_ANALYTICS
    ],
    mediaSrc: ['self'],
    styleSrc: ['self'],
    scriptSrc: ['self', GOVUK_FRONTEND_INLINE_SCRIPT, GOOGLE_TAG_MANAGER],
    imgSrc: ['self', 'data:', GOOGLE_TAG_MANAGER, ...GOOGLE_ANALYTICS],
    frameSrc: ['self', 'data:'],
    objectSrc: ['none'],
    frameAncestors: ['none'],
    formAction: ['self'],
    manifestSrc: ['self'],
    generateNonces: false
  }
}
