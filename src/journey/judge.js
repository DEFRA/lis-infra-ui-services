/** @import { ValidationError } from 'joi' */
/** @import { FieldResult, Step, StepResult } from './index.js' */

/**
 * @param {ValidationError} [report] - a schema's errors or
 *   warnings
 * @returns {FieldResult[]} each as its field and code, in the schema's order
 */
function fieldResults(report) {
  return (report?.details ?? []).map(({ path, message }) => ({
    field: path[0],
    code: message
  }))
}

/**
 * @template TRecord
 * @template TOptions
 * @param {Step<TRecord, TOptions>} step
 * @param {TRecord} record - as it would be saved
 * @param {TOptions} options
 * @param {TRecord} saved - the record as it is saved
 * @returns {StepResult} what the step's rules make of the record
 */
export function judge(step, record, options, saved) {
  const { error, warning } = step.schema.validate(record, {
    abortEarly: false,
    allowUnknown: true,
    context: step.context?.(options, saved) ?? {}
  })

  return { errors: fieldResults(error), warnings: fieldResults(warning) }
}
