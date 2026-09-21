// The UK country code, then a six-digit herd mark and a six-digit animal
// number - e.g. "UK324537113236".
const earTagPattern = /^(UK)(\d{6})(\d{6})$/

/**
 * @param {string} earTag
 * @returns {string[] | undefined} the country code, herd mark and animal
 *   number, or undefined if the ear tag isn't in that format
 */
function earTagGroups(earTag) {
  return earTag.replace(/\s+/g, '').toUpperCase().match(earTagPattern)?.slice(1)
}

/**
 * @param {string} earTag e.g. "UK324537113236"
 * @returns {string} e.g. "UK 324537 113236" - the country code, herd mark
 *   and animal number. An ear tag in any other format is returned as-is.
 */
export function formatEarTag(earTag) {
  return earTagGroups(earTag)?.join(' ') ?? earTag
}
