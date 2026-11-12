/**
 * A form posts an answer left empty as a blank string. A record holds it as
 * null: answered, with nothing given.
 * @template TAnswers
 * @param {TAnswers} answers - a page's answers, every one a string
 * @returns {TAnswers} the answers, each blank one given as null
 */
export function blankAsNull(answers) {
  return Object.fromEntries(
    Object.entries(answers).map(([key, value]) => [
      key,
      value === '' ? null : value
    ])
  )
}
