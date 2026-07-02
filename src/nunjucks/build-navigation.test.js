import assert from 'node:assert/strict'
import test from 'node:test'

import { buildPrimaryNavigation } from './build-navigation.js'

test('buildPrimaryNavigation derives species tabs from lis-perm permissions', () => {
  const navigation = buildPrimaryNavigation({
    request: {
      path: '/',
      app: {
        hubAuth: {
          permissions: [
            'lis-perm-front-office',
            'lis-perm-cattle-read',
            'lis-perm-sheep-register-admin',
            'lis-perm-user-write'
          ]
        }
      }
    }
  })

  assert.deepEqual(
    navigation.map((item) => item.text),
    ['Home', 'Cattle', 'Sheep', 'Profile']
  )
})

test('buildPrimaryNavigation marks the profile item as current on the profile route', () => {
  const navigation = buildPrimaryNavigation({
    request: {
      path: '/profile',
      app: {
        hubAuth: {
          permissions: ['lis-perm-front-office', 'lis-perm-cattle-read']
        }
      }
    }
  })

  assert.equal(navigation.at(-1)?.text, 'Profile')
  assert.equal(navigation.at(-1)?.current, true)
})
