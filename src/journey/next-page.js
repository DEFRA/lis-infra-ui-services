/** @import { Step } from './index.js' */
import { applies, findStep } from './step.js'

/**
 * @template TRecord
 * @template TOptions
 * @param {Step<TRecord, TOptions>[]} steps - the journey's steps, in order
 * @param {string} page
 * @param {TRecord} record - as saved by the page
 * @returns {string | undefined} the page of the step the record goes
 *   through next; undefined after its last
 */
export function nextPage(steps, page, record) {
  return steps
    .slice(steps.indexOf(findStep(steps, page)) + 1)
    .find((candidate) => applies(candidate, record))?.page
}
