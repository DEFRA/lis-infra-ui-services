/**
 * @param {string} taxonomy
 * @param {string} species
 * @returns {string}
 */
export function buildMicrositePath(taxonomy, species) {
  return `/${species}/${taxonomy}`
}
