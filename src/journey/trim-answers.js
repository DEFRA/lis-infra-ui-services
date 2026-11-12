/**
 * @template TAnswers
 * @param {TAnswers} answers - a page's answers, every one a string
 * @returns {TAnswers} the answers with surrounding spaces removed
 */
export function trimAnswers(answers) {
  return Object.fromEntries(
    Object.entries(answers).map(([key, value]) => [key, value.trim()])
  )
}
