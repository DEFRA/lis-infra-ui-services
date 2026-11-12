/** @import { Step } from './index.js' */
import { judge } from './judge.js'
import { applies } from './step.js'

/**
 * @template TRecord
 * @template TOptions
 * @param {Step<TRecord, TOptions>[]} steps - the journey's steps, in order
 * @param {TRecord} record
 * @param {TOptions} [options]
 * @returns {Step<TRecord, TOptions> | undefined} the first step the record
 *   goes through whose answers are missing or wrong; undefined when the
 *   record is complete
 */
export function firstIncompleteStep(steps, record, options = {}) {
  return steps.find(
    (step) =>
      applies(step, record) &&
      judge(step, record, options, record).errors.length
  )
}
