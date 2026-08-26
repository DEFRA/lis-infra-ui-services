import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import nunjucks from 'nunjucks'
import { getBasePathForModule } from '@defra/lis-hubs-infra-registry'
import { createNunjucksConfig } from './plugin.js'

vi.mock('nunjucks')
vi.mock('@defra/lis-hubs-infra-registry')

const mocks = {
  nunjucksConfigure: vi.mocked(nunjucks.configure),
  getBasePathForModule: vi.mocked(getBasePathForModule)
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

  test('resolves the base path from the module registry when moduleId is given', () => {
    // Arrange
    mocks.getBasePathForModule.mockReturnValue('/cattle/register')
    const config = { get: vi.fn((key) => (key === 'root' ? projectRoot : false)) }

    // Act
    createNunjucksConfig({
      config,
      logger: {},
      getRequestBasePath: vi.fn(),
      moduleId: 'cattle-register'
    })

    // Assert
    expect(mocks.getBasePathForModule).toHaveBeenCalledWith('cattle-register')
  })

  test('defaults to an empty base path when no moduleId is given', () => {
    // Arrange
    const config = { get: vi.fn((key) => (key === 'root' ? projectRoot : false)) }

    // Act
    const nunjucksConfig = createNunjucksConfig({
      config,
      logger: {},
      getRequestBasePath: vi.fn()
    })

    // Assert
    expect(mocks.getBasePathForModule).not.toHaveBeenCalled()
    expect(nunjucksConfig.plugin).toBeDefined()
  })
})
