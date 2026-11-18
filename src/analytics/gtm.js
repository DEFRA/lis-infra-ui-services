/**
 * The header the hub proxy sends spokes the hub's Google Tag Manager
 * container id in. Must match GTM_ID_HEADER in @defra/lis-hubs-infra-core.
 */
export const GTM_ID_HEADER = 'x-lis-gtm-id'

/**
 * The file name the static files plugin serves the data layer script under,
 * at each app's asset root, for the base layout to load ahead of Google Tag
 * Manager.
 */
export const GOOGLE_TAG_SCRIPT_NAME = 'google-tag.js'

const GTM_ID_PATTERN = /^GTM-[A-Z0-9]+$/

/**
 * The id is written into the URL of a script the page loads, so anything
 * that is not a container id is dropped.
 * @param {unknown} value
 * @returns {string | null} the Google Tag Manager container id, or null when absent or malformed
 */
export function parseGtmId(value) {
  return typeof value === 'string' && GTM_ID_PATTERN.test(value) ? value : null
}
