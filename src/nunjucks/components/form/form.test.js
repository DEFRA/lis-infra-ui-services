// @vitest-environment jsdom
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import hapi from '@hapi/hapi'
import { afterEach, describe, expect, test } from 'vitest'

import { CSRF_TOKEN_HEADER, csrfPlugin } from '../../../csrf/index.js'
import { createNunjucksConfig } from '../../plugin.js'

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../test/fixtures/form-app'
)
const configValues = {
  root: projectRoot,
  assetPath: '/public',
  serviceName: 'Example service',
  isProduction: false,
  'nunjucks.watch': false,
  'nunjucks.noCache': true
}
const config = { get: (key) => configValues[key] }

let server

async function render({ view = 'form', form, token }) {
  server = hapi.server()
  await server.register(createNunjucksConfig({ config, logger: {} }))
  await server.register({
    plugin: csrfPlugin,
    options: { tokenSource: 'header' }
  })
  server.route({
    method: 'GET',
    path: '/form',
    handler: (_request, h) => h.view(view, { form })
  })
  await server.initialize()

  const response = await server.inject({
    method: 'GET',
    url: '/form',
    headers: token === undefined ? {} : { [CSRF_TOKEN_HEADER]: token }
  })
  document.body.innerHTML = response.result

  return document.querySelector('form')
}

describe('lisForm()', () => {
  afterEach(async () => {
    document.body.innerHTML = ''
    await server?.stop()
    server = undefined
  })

  test('renders a novalidate POST form with the request token and the caller body', async () => {
    // Act
    const form = await render({
      form: { action: '/holdings/12/345/6789/edit' },
      token: 'request-token'
    })

    // Assert
    expect(form.getAttribute('action')).toBe('/holdings/12/345/6789/edit')
    expect(form.getAttribute('method')).toBe('post')
    expect(form.hasAttribute('novalidate')).toBe(true)
    expect(form.querySelector('input[type="hidden"]').name).toBe('_csrf')
    expect(form.querySelector('input[name="_csrf"]').value).toBe(
      'request-token'
    )
    expect(form.querySelector('button').textContent).toBe('Save')
  })

  test('escapes the token, action, classes and attributes', async () => {
    // Arrange
    const hostile = '"><script>alert(1)</script>'

    // Act
    const form = await render({
      form: {
        action: `/edit${hostile}`,
        classes: `lis-form${hostile}`,
        attributes: { 'data-module': hostile }
      },
      token: `token${hostile}`
    })

    // Assert
    expect(document.querySelectorAll('script')).toHaveLength(0)
    expect(form.getAttribute('action')).toBe(`/edit${hostile}`)
    expect(form.className).toBe(`lis-form${hostile}`)
    expect(form.dataset.module).toBe(hostile)
    expect(form.querySelector('input[name="_csrf"]').value).toBe(
      `token${hostile}`
    )
  })

  test('renders the classes and attributes', async () => {
    // Act
    const form = await render({
      form: {
        action: '/edit',
        classes: 'lis-form govuk-!-margin-bottom-6',
        attributes: { id: 'edit-holding', 'data-module': 'lis-edit' }
      },
      token: 'request-token'
    })

    // Assert
    expect(form.className).toBe('lis-form govuk-!-margin-bottom-6')
    expect(form.id).toBe('edit-holding')
    expect(form.dataset.module).toBe('lis-edit')
  })

  test('leaves the action out when none is given, posting to the page itself', async () => {
    // Act
    const form = await render({ form: {}, token: 'request-token' })

    // Assert
    expect(form.hasAttribute('action')).toBe(false)
    expect(form.getAttribute('method')).toBe('post')
  })

  test('never puts the token in a GET form', async () => {
    // Act
    const form = await render({
      form: { action: '/search', method: 'GET' },
      token: 'request-token'
    })

    // Assert
    expect(form.getAttribute('method')).toBe('GET')
    expect(form.querySelector('input[name="_csrf"]')).toBeNull()
  })

  test('leaves the token field out when the request has no token, so the post is refused', async () => {
    // Act
    const form = await render({ form: { action: '/edit' } })

    // Assert
    expect(form.getAttribute('method')).toBe('post')
    expect(form.querySelector('input[name="_csrf"]')).toBeNull()
  })

  test('takes an explicit csrfToken when imported without context', async () => {
    // Act
    const form = await render({
      view: 'form-without-context',
      form: { action: '/edit', csrfToken: 'explicit-token' },
      token: 'request-token'
    })

    // Assert
    expect(form.querySelector('input[name="_csrf"]').value).toBe(
      'explicit-token'
    )
  })

  test('cannot see the request token when imported without context, so renders no token field', async () => {
    // Act
    const form = await render({
      view: 'form-without-context',
      form: { action: '/edit' },
      token: 'request-token'
    })

    // Assert
    expect(form.querySelector('input[name="_csrf"]')).toBeNull()
  })
})
