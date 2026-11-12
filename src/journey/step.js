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
 * @returns {boolean} whether any of the step's answers has yet to be saved
 */
export function isUnanswered(step, record) {
  return keysOf(step).some((key) => record[key] === undefined)
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
