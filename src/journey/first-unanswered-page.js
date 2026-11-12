/** @import { Step } from './index.js' */
import { applies, isUnanswered } from './step.js'

/**
 * @template TRecord
 * @template TOptions
 * @param {Step<TRecord, TOptions>[]} steps - the journey's steps, in order
 * @param {TRecord} record - as saved
 * @returns {string | undefined} the page of the first step the record goes
 *   through with an answer yet to be saved; undefined when every step has
 *   been
 */
export function firstUnansweredPage(steps, record) {
  return steps.find(
    (candidate) => applies(candidate, record) && isUnanswered(candidate, record)
  )?.page
}
