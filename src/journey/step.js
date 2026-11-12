/** @import { Step } from './index.js' */

/**
 * @template TRecord
 * @template TOptions
 * @param {Step<TRecord, TOptions>} step
 * @returns {string[]} the answers the step owns
 */
export function keysOf(step) {
  // A schema that declares no answers describes itself without keys
  return Object.keys(step.schema.describe().keys ?? {})
}

/**
 * @template TRecord
 * @template TOptions
 * @param {Step<TRecord, TOptions>} step
 * @returns {string[]} the answers the step's rules mark as required; one
 *   required only by a condition is not among them
 */
function requiredKeysOf(step) {
  return Object.entries(step.schema.describe().keys ?? {})
    .filter(([, rules]) => rules.flags?.presence === 'required')
    .map(([key]) => key)
}

/**
 * @template TRecord
 * @template TOptions
 * @param {Step<TRecord, TOptions>} step
 * @param {TRecord} record
 * @returns {boolean} whether the record goes through the step
 */
export function applies(step, record) {
  return step.appliesTo ? step.appliesTo(record) : true
}

/**
 * @template TRecord
 * @template TOptions
 * @param {Step<TRecord, TOptions>} step
 * @param {TRecord} record
 * @returns {boolean} whether an answer the step's rules require has yet to
 *   be saved; one they leave optional never holds a record back
 */
export function isUnanswered(step, record) {
  return requiredKeysOf(step).some((key) => record[key] === undefined)
}

/**
 * @template TRecord
 * @template TOptions
 * @param {Step<TRecord, TOptions>[]} steps
 * @param {string} page
 * @returns {Step<TRecord, TOptions>}
 */
export function findStep(steps, page) {
  const step = steps.find((candidate) => candidate.page === page)

  if (!step) {
    throw new Error(`No step for page "${page}"`)
  }

  return step
}
