import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import nunjucks from 'nunjucks'
import { test } from 'vitest'

const componentRoot = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(componentRoot, '../../../..')
const environment = new nunjucks.Environment(
  new nunjucks.FileSystemLoader([
    path.join(projectRoot, 'test/fixtures/nunjucks'),
    path.dirname(componentRoot)
  ]),
  { autoescape: true, trimBlocks: true, lstripBlocks: true }
)

function render(params) {
  return environment.render('autocomplete/template.njk', { params })
}

test('renders the autocomplete using the GOV.UK input macro', () => {
  const html = render({
    id: 'species',
    name: 'species',
    value: 'Sheep',
    label: { text: 'Choose a species' },
    hint: { text: 'Start typing' },
    errorMessage: { text: 'Choose a listed species' },
    items: ['Cattle', 'Sheep'],
    minLength: 2
  })

  assert.match(html, /data-module="app-autocomplete"/)
  assert.match(html, /data-min-length="2"/)
  assert.match(
    html,
    /<label class="govuk-label" for="species">Choose a species<\/label>/
  )
  assert.match(html, /class="govuk-input govuk-input--error"/)
  assert.match(html, /<li>Cattle<\/li>/)
  assert.match(html, /<li>Sheep<\/li>/)
})

test('escapes suggestion text and supports item objects', () => {
  const html = render({
    name: 'species',
    label: { text: 'Choose a species' },
    items: [{ text: '<script>alert(1)</script>' }]
  })

  assert.doesNotMatch(html, /<script>/)
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
})

test('passes enhancement options through data attributes', () => {
  const html = render({
    name: 'species',
    label: { text: 'Choose a species' },
    items: [],
    autoselect: true,
    confirmOnBlur: false,
    displayMenu: 'overlay',
    showAllValues: true,
    containerClasses: 'app-autocomplete--wide'
  })

  assert.match(html, /class="app-autocomplete app-autocomplete--wide"/)
  assert.match(html, /data-autoselect="true"/)
  assert.match(html, /data-confirm-on-blur="false"/)
  assert.match(html, /data-display-menu="overlay"/)
  assert.match(html, /data-show-all-values="true"/)
})

test('renders items with values as a GOV.UK select that submits the value', () => {
  const html = render({
    id: 'breed',
    name: 'breed',
    value: 'HE',
    classes: 'govuk-input--width-20',
    label: { text: 'Breed' },
    hint: { text: 'Start typing' },
    errorMessage: { text: 'Choose a listed breed' },
    items: [
      { value: 'AA', text: 'Aberdeen Angus (AA)' },
      { value: 'HE', text: 'Hereford (HE)' }
    ]
  })

  assert.match(html, /data-module="app-autocomplete"/)
  assert.match(html, /data-input-classes="govuk-input--width-20"/)
  assert.match(html, /<label class="govuk-label" for="breed">Breed<\/label>/)
  assert.match(
    html,
    /<select class="govuk-select govuk-select--error" id="breed" name="breed">/
  )
  assert.match(html, /<option value=""><\/option>/)
  assert.match(html, /<option value="AA">Aberdeen Angus \(AA\)<\/option>/)
  assert.match(html, /<option value="HE" selected>Hereford \(HE\)<\/option>/)
  assert.doesNotMatch(html, /<input/)
  assert.doesNotMatch(html, /app-autocomplete__source/)
})

test('chooses no item when the value is not one of the items', () => {
  const html = render({
    name: 'breed',
    value: 'ZZ',
    label: { text: 'Breed' },
    items: [{ value: 'AA', text: 'Aberdeen Angus (AA)' }]
  })

  assert.doesNotMatch(html, /selected/)
  assert.doesNotMatch(html, /data-input-classes/)
})

test('escapes the text and values of items with values', () => {
  const html = render({
    name: 'breed',
    label: { text: 'Breed' },
    items: [{ value: '"><b>', text: '<script>alert(1)</script>' }]
  })

  assert.doesNotMatch(html, /<script>/)
  assert.doesNotMatch(html, /<b>/)
})

test('renders a disabled select for disabled items with values', () => {
  const html = render({
    name: 'breed',
    label: { text: 'Breed' },
    disabled: true,
    items: [{ value: 'AA', text: 'Aberdeen Angus (AA)' }]
  })

  assert.match(html, /<select [^>]*name="breed" disabled>/)
})
