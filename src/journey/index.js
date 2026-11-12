/*
 * A journey is the steps a record goes through, in order, and the questions
 * its pages ask of them. A record is its answers so far, as one flat object.
 * Nothing here reads or saves anything, nor knows of any one journey: each
 * function takes the record and answers from it.
 */
/** @import { Context, ObjectSchema } from 'joi' */
import { firstIncompleteStep } from './first-incomplete-step.js'
import { firstUnansweredPage } from './first-unanswered-page.js'
import { nextPage } from './next-page.js'
import { pageOwed } from './page-owed.js'
import { previousPage } from './previous-page.js'
import { validateStep } from './validate-step.js'
import { withAnswers } from './with-answers.js'

export { trimAnswers } from './trim-answers.js'

/**
 * @typedef {{ field: string, code: string }} FieldResult
 */

/**
 * @typedef {object} StepResult
 * @property {FieldResult[]} errors - what stops the step being saved
 * @property {FieldResult[]} warnings - what the user is asked to confirm
 */

/**
 * @template TRecord - the record's answers
 * @template TOptions - what the journey's rules need beyond the record
 * @typedef {object} Step
 * @property {string} page - the step's page, as in its path
 * @property {ObjectSchema} schema - the step's rules, over
 *   the answers the step owns; each rule's message is the code of its error
 * @property {(options: TOptions, saved: TRecord) => Context} [context]
 *   what the schema's rules refer to, from the options and the record as it
 *   is saved; absent when they refer to nothing
 * @property {(record: TRecord) => boolean} [appliesTo] - absent when
 *   every record goes through the step
 * @property {(keyof TRecord)[]} [clearsOnChange] - answers that no longer
 *   hold when the step's own answers change
 */

/**
 * @template TRecord - the record's answers
 * @template TOptions - what the journey's rules need beyond the record
 * @typedef {object} Journey - the questions a journey's pages ask of a record
 * @property {Step<TRecord, TOptions>[]} steps
 * @property {(record: TRecord, options?: TOptions) =>
 *   Step<TRecord, TOptions> | undefined} firstIncompleteStep
 * @property {(record: TRecord) => string | undefined} firstUnansweredPage
 * @property {(page: string, record: TRecord) => string | undefined} nextPage
 * @property {(page: string, record: TRecord) => string | undefined} pageOwed
 * @property {(page: string, record: TRecord) => string | undefined}
 *   previousPage
 * @property {(page: string, record: TRecord, values: Partial<TRecord>,
 *   options?: Partial<TOptions>) => StepResult} validateStep - takes only
 *   the options the page's step needs
 * @property {(page: string, record: TRecord, answers: Partial<TRecord>) =>
 *   TRecord} withAnswers
 */

/**
 * @template TRecord - the record's answers
 * @template TOptions - what the journey's rules need beyond the record
 * @param {Step<TRecord, TOptions>[]} steps - the journey's steps, in order
 * @returns {Journey<TRecord, TOptions>} the questions the journey's pages ask
 *   of a record
 */
export function createJourney(steps) {
  return {
    steps,
    firstIncompleteStep: (record, options) =>
      firstIncompleteStep(steps, record, options),
    firstUnansweredPage: (record) => firstUnansweredPage(steps, record),
    nextPage: (page, record) => nextPage(steps, page, record),
    pageOwed: (page, record) => pageOwed(steps, page, record),
    previousPage: (page, record) => previousPage(steps, page, record),
    validateStep: (page, record, values, options) =>
      validateStep(steps, page, record, values, options),
    withAnswers: (page, record, answers) =>
      withAnswers(steps, page, record, answers)
  }
}
