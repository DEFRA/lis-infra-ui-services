/**
 * @param {object} [params] query parameter values, keyed by name
 * @returns {string} a URL-encoded query string (no leading "?")
 */
export function queryString(params = {}) {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, value)
    }
  }

  return searchParams.toString()
}
