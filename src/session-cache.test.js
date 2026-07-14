import assert from 'node:assert/strict'
import test from 'node:test'
import yar from '@hapi/yar'

import {
  createSessionCachePlugin,
  createSessionCachePluginForConfig
} from './session-cache.js'

test('createSessionCachePlugin builds the expected yar plugin options', () => {
  const sessionConfig = {
    cache: {
      name: 'session',
      ttl: 1234
    },
    cookie: {
      password: 'password',
      ttl: 5678
    }
  }

  const plugin = createSessionCachePlugin({ sessionConfig, isSecure: true })

  assert.equal(plugin.plugin, yar)
  assert.deepEqual(plugin.options, {
    name: 'session',
    cache: {
      cache: 'session',
      expiresIn: 1234
    },
    storeBlank: false,
    errorOnCacheNotReady: true,
    cookieOptions: {
      password: 'password',
      ttl: 5678,
      isSecure: true,
      isSameSite: 'Lax',
      clearInvalid: true
    }
  })
})

test('createSessionCachePluginForConfig maps config values into the plugin', () => {
  const calls = []
  const config = {
    get(key) {
      calls.push(key)

      if (key === 'session') {
        return {
          cache: {
            name: 'mapped-session',
            ttl: 1000
          },
          cookie: {
            password: 'secret',
            ttl: 2000
          }
        }
      }

      if (key === 'session.cookie.secure') {
        return false
      }
    }
  }

  const plugin = createSessionCachePluginForConfig(config)

  assert.deepEqual(calls, ['session', 'session.cookie.secure'])
  assert.equal(plugin.options.name, 'mapped-session')
  assert.equal(plugin.options.cache.expiresIn, 1000)
  assert.equal(plugin.options.cookieOptions.password, 'secret')
  assert.equal(plugin.options.cookieOptions.ttl, 2000)
  assert.equal(plugin.options.cookieOptions.isSecure, false)
  assert.equal(plugin.options.cookieOptions.isSameSite, 'Lax')
})
