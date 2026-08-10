import assert from 'node:assert/strict'
import { beforeEach, test, vi } from 'vitest'

const { accessibleAutocomplete } = vi.hoisted(() => ({
  accessibleAutocomplete: vi.fn(({ element }) => {
    element.input = createInput()
  })
}))

vi.mock('accessible-autocomplete', () => ({ default: accessibleAutocomplete }))

import { initAllAutocompletes, initAutocomplete } from './autocomplete.js'

function createInput(overrides = {}) {
  const attributeValues = new Map()
  const listeners = new Map()
  const input = {
    id: 'species',
    name: 'species',
    value: 'Sheep',
    required: true,
    className: 'govuk-input',
    placeholder: 'Choose',
    disabled: false,
    readOnly: false,
    attributes: [],
    hasAttribute: (name) => attributeValues.has(name),
    getAttribute: (name) => attributeValues.get(name) ?? null,
    setAttribute(name, value) {
      attributeValues.set(name, value)
      const existing = this.attributes.find(
        (attribute) => attribute.name === name
      )
      if (existing) existing.value = value
      else this.attributes.push({ name, value })
    },
    addEventListener: (name, listener) => listeners.set(name, listener),
    dispatch: (name) => listeners.get(name)?.(),
    before: vi.fn(),
    remove: vi.fn(),
    ...overrides
  }
  return input
}

function createElement({
  input = createInput(),
  source = ['Cattle', ' Sheep ']
} = {}) {
  const sourceElement = {
    children: source.map((textContent) => ({ textContent }))
  }
  return {
    dataset: {},
    querySelector(selector) {
      if (selector === '.govuk-input') return input
      if (selector === '.app-autocomplete__source') return sourceElement
      if (selector === 'input[role="combobox"]')
        return this.enhancedInput ?? null
      return null
    },
    input
  }
}

beforeEach(() => {
  accessibleAutocomplete.mockClear()
  vi.stubGlobal('document', {
    createElement: () => ({
      input: null,
      querySelector() {
        return this.input
      }
    })
  })
})

test('enhances an input using its source and component options', () => {
  const element = createElement()
  Object.assign(element.dataset, {
    autoselect: 'true',
    confirmOnBlur: 'false',
    displayMenu: 'overlay',
    minLength: '2',
    showAllValues: 'true'
  })

  const enhancedInput = initAutocomplete(element)
  const options = accessibleAutocomplete.mock.calls[0][0]

  assert.equal(enhancedInput, options.element.input)
  assert.deepEqual(options.source, ['Cattle', 'Sheep'])
  assert.equal(options.id, 'species')
  assert.equal(options.defaultValue, 'Sheep')
  assert.equal(options.autoselect, true)
  assert.equal(options.confirmOnBlur, false)
  assert.equal(options.displayMenu, 'overlay')
  assert.equal(options.minLength, 2)
  assert.equal(options.showAllValues, true)
  assert.equal(element.dataset.appAutocompleteInitialised, 'true')
  assert.equal(element.input.before.mock.calls.length, 1)
  assert.equal(element.input.remove.mock.calls.length, 1)
})

test('copies input attributes and preserves descriptions after input', async () => {
  const original = createInput({ id: '' })
  original.setAttribute('aria-describedby', 'species-hint species-error')
  original.setAttribute('aria-invalid', 'true')
  original.setAttribute('maxlength', '20')
  original.setAttribute('data-tracking', 'species-field')
  const element = createElement({ input: original })

  const enhancedInput = initAutocomplete(element)

  assert.equal(accessibleAutocomplete.mock.calls[0][0].id, 'species')
  assert.equal(enhancedInput.getAttribute('aria-invalid'), 'true')
  assert.equal(enhancedInput.getAttribute('maxlength'), '20')
  assert.equal(enhancedInput.getAttribute('data-tracking'), 'species-field')
  assert.equal(
    enhancedInput.getAttribute('aria-describedby'),
    'species-hint species-error'
  )

  enhancedInput.setAttribute('aria-describedby', 'assistive-hint')
  enhancedInput.dispatch('input')
  await new Promise(queueMicrotask)
  assert.equal(
    enhancedInput.getAttribute('aria-describedby'),
    'species-hint species-error'
  )
})

test('escapes suggestion HTML', () => {
  const element = createElement()
  initAutocomplete(element)

  assert.equal(
    accessibleAutocomplete.mock.calls[0][0].templates.suggestion(
      `<b class="x">Tom & 'Sue'</b>`
    ),
    '&lt;b class=&quot;x&quot;&gt;Tom &amp; &#039;Sue&#039;&lt;/b&gt;'
  )
})

test('does not enhance missing, disabled, or readonly inputs', () => {
  const missing = createElement()
  missing.querySelector = () => null

  assert.equal(initAutocomplete(missing), null)
  assert.equal(
    initAutocomplete(createElement({ input: createInput({ disabled: true }) })),
    null
  )
  assert.equal(
    initAutocomplete(createElement({ input: createInput({ readOnly: true }) })),
    null
  )
  assert.equal(accessibleAutocomplete.mock.calls.length, 0)
})

test('returns the existing combobox when already initialised', () => {
  const existing = createInput()
  const element = createElement()
  element.dataset.appAutocompleteInitialised = 'true'
  element.enhancedInput = existing

  assert.equal(initAutocomplete(element), existing)
  assert.equal(accessibleAutocomplete.mock.calls.length, 0)
})

test('initialises all valid components below a root', () => {
  const valid = createElement()
  const disabled = createElement({ input: createInput({ disabled: true }) })
  const root = { querySelectorAll: () => [valid, disabled] }

  assert.equal(initAllAutocompletes(root).length, 1)
})
