import assert from 'node:assert/strict'
import test from 'node:test'

import { buildPrimaryNavigation } from './build-navigation.js'

test('buildPrimaryNavigation renders species already authorized by the host', () => {
  const navigation = buildPrimaryNavigation({
    request: {
      path: '/',
      app: {
        authorizedSpecies: [
          { id: 'cattle', label: 'Cattle' },
          { id: 'sheep', label: 'Sheep' }
        ]
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
        authorizedSpecies: [{ id: 'cattle', label: 'Cattle' }]
      }
    }
  })

  assert.equal(navigation.at(-1)?.text, 'Profile')
  assert.equal(navigation.at(-1)?.current, true)
})
