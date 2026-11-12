/** @import { Step } from './index.js' */
import { applies, findStep } from './step.js'

/**
 * @template TRecord
 * @template TOptions
 * @param {Step<TRecord, TOptions>[]} steps - the journey's steps, in order
 * @param {string} page
 * @param {TRecord} record - as saved
 * @returns {string | undefined} the page of the step the record went
 *   through before this one; undefined for the first
 */
export function previousPage(steps, page, record) {
  return steps
    .slice(0, steps.indexOf(findStep(steps, page)))
    .findLast((candidate) => applies(candidate, record))?.page
}
