// A two-letter country code, then a six-digit herd mark and a six-digit
// animal number - e.g. "UK324537113236".
const earTagPattern = /^([A-Z]{2})(\d{6})(\d{6})$/

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

/**
 * For an aria-label, so a screen reader reads an ear tag character by
 * character rather than as "two hundred thousand".
 * @param {string} earTag e.g. "UK324537113236"
 * @returns {string} e.g. "U K, 3 2 4 5 3 7, 1 1 3 2 3 6" - the commas give a
 *   pause between the country code, herd mark and animal number. An ear tag
 *   in any other format is just spaced out, e.g. "A B 1 2 3".
 */
export function formatEarTagSpoken(earTag) {
  const groups = earTagGroups(earTag)

  if (!groups) {
    return [...earTag.replace(/\s+/g, '')].join(' ')
  }

  return groups.map((group) => [...group].join(' ')).join(', ')
}
