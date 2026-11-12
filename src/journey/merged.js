/** @import { Step } from './index.js' */
import { keysOf } from './step.js'

/**
 * @template TRecord
 * @template TOptions
 * @param {Step<TRecord, TOptions>} step
 * @param {TRecord} record - as saved
 * @param {Partial<TRecord>} answers - the step's answers
 * @returns {TRecord} the record with the step's answers replaced, and
 *   the answers they invalidate removed
 */
export function merged(step, record, answers) {
  const keys = keysOf(step)
  const changed = keys.some((key) => record[key] !== answers[key])
  const cleared = changed ? (step.clearsOnChange ?? []) : []
  const kept = Object.entries(record).filter(([key]) => !cleared.includes(key))

  return {
    ...Object.fromEntries(kept),
    ...Object.fromEntries(keys.map((key) => [key, answers[key]]))
  }
}
