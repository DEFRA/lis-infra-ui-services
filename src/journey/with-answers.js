/** @import { Step } from './index.js' */
import { merged } from './merged.js'
import { findStep } from './step.js'

/**
 * @template TRecord
 * @template TOptions
 * @param {Step<TRecord, TOptions>[]} steps - the journey's steps, in order
 * @param {string} page
 * @param {TRecord} record - as saved
 * @param {Partial<TRecord>} answers - the page's answers, validated
 * @returns {TRecord} the record to save: the page's answers replaced, and the
 *   answers they invalidate removed
 */
export function withAnswers(steps, page, record, answers) {
  return merged(findStep(steps, page), record, answers)
}
