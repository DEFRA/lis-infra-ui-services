/** @import { Step } from './index.js' */
import { applies, findStep, isUnanswered } from './step.js'

/**
 * Whether the record belongs on a page yet. Asks only whether the earlier
 * steps have their answers: those were validated when they were saved.
 * @template TRecord
 * @template TOptions
 * @param {Step<TRecord, TOptions>[]} steps - the journey's steps, in order
 * @param {string} page
 * @param {TRecord} record - as saved
 * @returns {string | undefined} the page to send the record to instead:
 *   the earlier step with an answer missing or, for a step the record does
 *   not go through, the last one it does. Undefined when it belongs on the
 *   page.
 */
export function pageOwed(steps, page, record) {
  const step = findStep(steps, page)
  const earlier = steps
    .slice(0, steps.indexOf(step))
    .filter((candidate) => applies(candidate, record))
  const unanswered = earlier.find((candidate) =>
    isUnanswered(candidate, record)
  )

  if (unanswered) {
    return unanswered.page
  }

  return applies(step, record) ? undefined : earlier.at(-1)?.page
}
