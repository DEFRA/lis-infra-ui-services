// Served as it is and loaded by the base layout as a classic script, ahead of
// Google Tag Manager, so it has no imports or exports. It stands in for the
// inline half of Google's snippet, which the content security policy would
// block.
window.dataLayer = window.dataLayer || []
window.gtag = function gtag() {
  // Google only treats an arguments object as a gtag command; an array from
  // rest parameters is ignored.
  // eslint-disable-next-line sonarjs/arguments-usage
  window.dataLayer.push(arguments) // NOSONAR
}
window.gtag('js', new Date())
