/** @import { Step, StepResult } from './index.js' */
import { judge } from './judge.js'
import { findStep } from './step.js'
import { withAnswers } from './with-answers.js'

/**
 * What a page's rules make of its answers, judged as part of the record they
 * would be saved on.
 * @template TRecord
 * @template TOptions
 * @param {Step<TRecord, TOptions>[]} steps - the journey's steps, in order
 * @param {string} page
 * @param {TRecord} record - as saved
 * @param {Partial<TRecord>} values - the page's answers, trimmed
 * @param {Partial<TOptions>} [options] - only what the page's step needs
 * @returns {StepResult}
 */
export function validateStep(steps, page, record, values, options = {}) {
  return judge(
    findStep(steps, page),
    withAnswers(steps, page, record, values),
    options,
    record
  )
}
