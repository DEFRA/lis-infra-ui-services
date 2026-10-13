import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import nunjucks from 'nunjucks'
import { createNunjucksConfig } from './plugin.js'

vi.mock('nunjucks')

const mocks = {
  nunjucksConfigure: vi.mocked(nunjucks.configure)
}

function createProjectRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'ui-services-nunjucks-'))

  writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({ dependencies: {} })
  )
  mkdirSync(path.join(root, 'node_modules/govuk-frontend'), {
    recursive: true
  })
  writeFileSync(
    path.join(root, 'node_modules/govuk-frontend/package.json'),
    '{}'
  )

  return root
}

describe('createNunjucksConfig()', () => {
  let projectRoot

  beforeEach(() => {
    vi.clearAllMocks()
    projectRoot = createProjectRoot()
    mocks.nunjucksConfigure.mockReturnValue({
      addGlobal: vi.fn(),
      addFilter: vi.fn()
    })
  })

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true })
  })

  test('defaults to an empty base path when no moduleId is given', () => {
    // Arrange
    const config = {
      get: vi.fn((key) => (key === 'root' ? projectRoot : false))
    }

    // Act
    const nunjucksConfig = createNunjucksConfig({
      config,
      logger: {},
      getRequestBasePath: vi.fn()
    })

    // Assert
    expect(nunjucksConfig.plugin).toBeDefined()
  })

  test('exposes PERMISSIONS to templates as a global', () => {
    // Arrange
    const addGlobal = vi.fn()
    mocks.nunjucksConfigure.mockReturnValueOnce({
      addGlobal,
      addFilter: vi.fn()
    })
    const config = {
      get: vi.fn((key) => (key === 'root' ? projectRoot : false))
    }

    // Act
    createNunjucksConfig({
      config,
      logger: {},
      getRequestBasePath: vi.fn()
    })

    // Assert
    expect(addGlobal).toHaveBeenCalledWith(
      'PERMISSIONS',
      expect.objectContaining({ backOffice: 'lis-perm-back-office' })
    )
  })

  test('passes the errorPages links through to the view context', () => {
    // Arrange
    const config = {
      get: vi.fn((key) => (key === 'root' ? projectRoot : false))
    }
    const errorPages = {
      contactHref: 'https://example.com/contact',
      homeHref: '/home',
      getStartedHref: '/start'
    }

    // Act
    const nunjucksConfig = createNunjucksConfig({
      config,
      logger: {},
      getRequestBasePath: vi.fn(() => ''),
      errorPages
    })
    const context = nunjucksConfig.options.context({ headers: {}, path: '/' })

    // Assert
    expect(context.errorPages).toEqual(errorPages)
  })
})
