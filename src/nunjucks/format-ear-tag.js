const ukEarTagPattern = /^(UK)(\d{6})(\d{6})$/

/**
 * @param {string} earTag e.g. "UK324537113236"
 * @returns {string} e.g. "UK 324537 113236" - the country code, herd mark
 *   and animal number. Anything that isn't a UK ear tag is returned as-is.
 */
export function formatEarTag(earTag) {
  const match = earTag.replace(/\s+/g, '').toUpperCase().match(ukEarTagPattern)

  if (!match) {
    return earTag
  }

  const [, countryCode, herdMark, animalNumber] = match

  return `${countryCode} ${herdMark} ${animalNumber}`
}

/**
 * For an aria-label, so a screen reader reads an ear tag character by
 * character rather than as "two hundred thousand".
 * @param {string} earTag e.g. "UK324537113236"
 * @returns {string} e.g. "U K, 3 2 4 5 3 7, 1 1 3 2 3 6" - the commas give a
 *   pause between the country code, herd mark and animal number.
 */
export function formatEarTagSpoken(earTag) {
  return formatEarTag(earTag)
    .split(/\s+/)
    .map((group) => [...group].join(' '))
    .join(', ')
}
