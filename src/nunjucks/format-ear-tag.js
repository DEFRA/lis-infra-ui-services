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
