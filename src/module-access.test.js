import assert from 'node:assert/strict'
import test from 'node:test'

import { hasModuleAccess } from './module-access.js'

test('hasModuleAccess allows higher levels to satisfy a species-scoped requirement', () => {
  assert.equal(
    hasModuleAccess(
      {
        permissions: ['lis-perm-cattle-admin']
      },
      {
        species: 'cattle',
        scope: 'species',
        minLevel: 'read'
      }
    ),
    true
  )
})

test('hasModuleAccess requires the exact app scope for app-scoped modules', () => {
  assert.equal(
    hasModuleAccess(
      {
        permissions: ['lis-perm-cattle-write']
      },
      {
        species: 'cattle',
        scope: 'app',
        app: 'move',
        minLevel: 'read'
      }
    ),
    false
  )

  assert.equal(
    hasModuleAccess(
      {
        permissions: ['lis-perm-cattle-move-write']
      },
      {
        species: 'cattle',
        scope: 'app',
        app: 'move',
        minLevel: 'read'
      }
    ),
    true
  )
})
