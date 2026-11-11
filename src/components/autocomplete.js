import accessibleAutocomplete from 'accessible-autocomplete'

const MODULE_SELECTOR = '[data-module="app-autocomplete"]'
const SOURCE_SELECTOR = '.app-autocomplete__source'
const COMBOBOX_SELECTOR = 'input[role="combobox"]'
const DESCRIBED_BY_ATTRIBUTE = 'aria-describedby'

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function booleanOption(element, name, defaultValue) {
  const value = element.dataset[name]

  if (value === undefined) {
    return defaultValue
  }

  return value === 'true'
}

function copyInputAttributes(source, target) {
  const attributes = [
    'aria-invalid',
    'autocapitalize',
    'inputmode',
    'maxlength',
    'minlength',
    'pattern',
    'spellcheck'
  ]

  attributes.forEach((name) => {
    if (source.hasAttribute(name)) {
      target.setAttribute(name, source.getAttribute(name))
    }
  })

  Array.from(source.attributes)
    .filter(({ name }) => name.startsWith('data-'))
    .forEach(({ name, value }) => target.setAttribute(name, value))
}

function preserveDescriptions(input, describedBy) {
  if (!describedBy) {
    return
  }

  const assistiveHint = input.getAttribute(DESCRIBED_BY_ATTRIBUTE)
  input.setAttribute(
    DESCRIBED_BY_ATTRIBUTE,
    [assistiveHint, describedBy].filter(Boolean).join(' ')
  )

  // The library removes its one-time assistive hint after typing. Restore the
  // GOV.UK hint and error references that must remain associated with the input.
  input.addEventListener('input', () => {
    queueMicrotask(() =>
      input.setAttribute(DESCRIBED_BY_ATTRIBUTE, describedBy)
    )
  })
}

/**
 * The enhancement options a component root carries as data attributes.
 *
 * @param {object} element component root
 * @returns {object} options for accessible-autocomplete
 */
function enhancementOptions(element) {
  return {
    autoselect: booleanOption(element, 'autoselect', false),
    confirmOnBlur: booleanOption(element, 'confirmOnBlur', true),
    displayMenu: element.dataset.displayMenu || 'inline',
    minLength: Number(element.dataset.minLength || 0),
    showAllValues: booleanOption(element, 'showAllValues', false),
    templates: {
      // accessible-autocomplete accepts HTML in suggestion templates. Escape
      // server-provided values before the library writes them to innerHTML.
      suggestion: escapeHtml
    }
  }
}

/**
 * Select the option whose text is in the input, whatever its case, or none. The library only
 * updates the select when a suggestion is confirmed, so text typed afterwards
 * would otherwise submit the previous choice.
 *
 * @param {object} select the enhanced select
 * @param {string} text the input's text
 */
function selectOptionWithText(select, text) {
  const typed = text.trim().toLowerCase()
  const option = Array.from(select.options).find(
    ({ textContent }) => textContent.trim().toLowerCase() === typed
  )

  select.value = option ? option.value : ''
}

/**
 * Enhance a GOV.UK select, which stays in the page, hidden, as the control
 * that submits the chosen option's value.
 *
 * @param {object} element component root
 * @param {object} select the select to enhance
 * @returns {object|null} enhanced input, or null when not enhanced
 */
function initSelectAutocomplete(element, select) {
  if (select.disabled) {
    return null
  }

  const describedBy = select.getAttribute(DESCRIBED_BY_ATTRIBUTE)
  const inputClasses = [
    'govuk-input',
    select.classList.contains('govuk-select--error') && 'govuk-input--error',
    element.dataset.inputClasses
  ]
    .filter(Boolean)
    .join(' ')

  accessibleAutocomplete.enhanceSelectElement({
    selectElement: select,
    inputClasses,
    hintClasses: inputClasses,
    ...enhancementOptions(element)
  })

  const input = element.querySelector(COMBOBOX_SELECTOR)

  preserveDescriptions(input, describedBy)
  input.addEventListener('input', () =>
    selectOptionWithText(select, input.value)
  )
  element.dataset.appAutocompleteInitialised = 'true'

  return input
}

/**
 * Progressively enhance one GOV.UK text input, or select, with the GDS
 * accessible autocomplete. Disabled and readonly controls retain their
 * server-rendered form.
 *
 * @param {object} element component root
 * @returns {object|null} enhanced input, or null when not enhanced
 */
export function initAutocomplete(element) {
  if (element.dataset.appAutocompleteInitialised === 'true') {
    return element.querySelector(COMBOBOX_SELECTOR)
  }

  const select = element.querySelector('.govuk-select')

  if (select) {
    return initSelectAutocomplete(element, select)
  }

  const originalInput = element.querySelector('.govuk-input')
  const sourceElement = element.querySelector(SOURCE_SELECTOR)

  if (
    !originalInput ||
    !sourceElement ||
    originalInput.disabled ||
    originalInput.readOnly
  ) {
    return null
  }

  const source = Array.from(sourceElement.children, ({ textContent }) =>
    textContent.trim()
  )
  const mountElement = document.createElement('div')
  const describedBy = originalInput.getAttribute(DESCRIBED_BY_ATTRIBUTE)

  originalInput.before(mountElement)
  originalInput.remove()

  accessibleAutocomplete({
    element: mountElement,
    id: originalInput.id || originalInput.name,
    name: originalInput.name,
    source,
    defaultValue: originalInput.value,
    required: originalInput.required,
    inputClasses: originalInput.className,
    hintClasses: originalInput.className,
    placeholder: originalInput.placeholder,
    ...enhancementOptions(element)
  })

  const input = mountElement.querySelector(COMBOBOX_SELECTOR)

  copyInputAttributes(originalInput, input)
  preserveDescriptions(input, describedBy)
  element.dataset.appAutocompleteInitialised = 'true'

  return input
}

/**
 * Initialise every autocomplete below a root element.
 *
 * @param {object} root search root
 * @returns {Array<object>} enhanced inputs
 */
export function initAllAutocompletes(root = document) {
  return Array.from(root.querySelectorAll(MODULE_SELECTOR))
    .map(initAutocomplete)
    .filter(Boolean)
}
