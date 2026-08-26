import path from 'path'
import { existsSync, readFileSync } from 'node:fs'
import nunjucks from 'nunjucks'
import hapiVision from '@hapi/vision'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

import { getBasePathForModule } from '@defra/lis-hubs-infra-registry'

import { createNunjucksContextBuilder } from './context.js'
import { buildPrimaryNavigation } from './build-navigation.js'
import * as filters from './filters.js'
import * as globals from './globals.js'

const PACKAGE_JSON_FILENAME = 'package.json'

function findDependentPackageName(projectRoot, prefix) {
  const packageJson = JSON.parse(
    readFileSync(path.join(projectRoot, PACKAGE_JSON_FILENAME), 'utf8')
  )
  const dependencyNames = Object.keys({
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
    ...packageJson.optionalDependencies,
    ...packageJson.peerDependencies
  })

  return dependencyNames.find((name) => name.startsWith(prefix)) ?? null
}

function resolvePackageRoot(require, packageName) {
  if (!packageName) {
    return null
  }

  let currentPath

  try {
    currentPath = path.dirname(require.resolve(packageName))
  } catch {
    return null
  }

  while (true) {
    const packageJsonPath = path.join(currentPath, PACKAGE_JSON_FILENAME)

    if (existsSync(packageJsonPath)) {
      return currentPath
    }

    const parentPath = path.dirname(currentPath)

    if (parentPath === currentPath) {
      return null
    }

    currentPath = parentPath
  }
}

function addIfExists(paths, candidatePath) {
  if (candidatePath && existsSync(candidatePath)) {
    paths.push(candidatePath)
  }
}

function buildProjectTemplatePaths(projectRoot) {
  const templatePaths = []

  addIfExists(
    templatePaths,
    path.resolve(projectRoot, 'src/server/common/templates')
  )
  addIfExists(
    templatePaths,
    path.resolve(projectRoot, 'src/server/common/components')
  )

  return templatePaths
}

function buildPackageTemplatePaths(packageRoot) {
  const templatePaths = []

  if (!packageRoot) {
    return templatePaths
  }

  addIfExists(
    templatePaths,
    path.resolve(packageRoot, 'src/nunjucks/templates')
  )
  addIfExists(
    templatePaths,
    path.resolve(packageRoot, 'src/nunjucks/components')
  )

  return templatePaths
}

function buildRoutePaths(packageRoot) {
  const routePaths = []

  if (!packageRoot) {
    return routePaths
  }

  addIfExists(routePaths, path.resolve(packageRoot, 'src/nunjucks/routes'))

  return routePaths
}

function resolveTemplateRoots(projectRoot) {
  const packageRequire = createRequire(
    path.join(projectRoot, PACKAGE_JSON_FILENAME)
  )
  const speciesRoot = resolvePackageRoot(
    packageRequire,
    findDependentPackageName(projectRoot, '@livestock/species-')
  )
  const taxonomyRoot = resolvePackageRoot(
    packageRequire,
    findDependentPackageName(projectRoot, '@livestock/taxonomy-')
  )
  const govukFrontendRoot = path.dirname(
    packageRequire.resolve('govuk-frontend/package.json')
  )

  return { speciesRoot, taxonomyRoot, govukFrontendRoot }
}

function buildNunjucksEnvironment({
  config,
  projectRoot,
  infrastructureRoot,
  speciesRoot,
  taxonomyRoot,
  govukFrontendRoot
}) {
  return nunjucks.configure(
    [
      path.join(govukFrontendRoot, 'dist'),
      ...buildProjectTemplatePaths(projectRoot),
      ...buildPackageTemplatePaths(speciesRoot),
      ...buildPackageTemplatePaths(taxonomyRoot),
      ...buildPackageTemplatePaths(infrastructureRoot)
    ],
    {
      autoescape: true,
      throwOnUndefined: false,
      trimBlocks: true,
      lstripBlocks: true,
      watch: config.get('nunjucks.watch'),
      noCache: config.get('nunjucks.noCache')
    }
  )
}

/**
 * @param {{ config: object, logger: object, getRequestBasePath: Function, moduleId?: string }} options
 * @returns {object}
 */
export function createNunjucksConfig({
  config,
  logger,
  getRequestBasePath,
  moduleId
}) {
  const basePath = moduleId ? getBasePathForModule(moduleId) : ''
  const projectRoot = config.get('root')
  const infrastructureRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../..'
  )
  const { speciesRoot, taxonomyRoot, govukFrontendRoot } =
    resolveTemplateRoots(projectRoot)
  const nunjucksEnvironment = buildNunjucksEnvironment({
    config,
    projectRoot,
    infrastructureRoot,
    speciesRoot,
    taxonomyRoot,
    govukFrontendRoot
  })

  const buildNavigation = (request) =>
    buildPrimaryNavigation({
      request,
      basePath,
      hubOrigin: request?.app?.hubOrigin ?? ''
    })

  const context = createNunjucksContextBuilder({
    config,
    buildNavigation,
    getRequestBasePath,
    logger,
    readFileSync
  })

  const nunjucksConfig = {
    plugin: hapiVision,
    options: {
      engines: {
        njk: {
          compile(src, options) {
            const template = nunjucks.compile(src, options.environment)
            return (ctx) => template.render(ctx)
          }
        }
      },
      compileOptions: {
        environment: nunjucksEnvironment
      },
      relativeTo: projectRoot,
      path: [
        'src/server/routes',
        ...buildRoutePaths(speciesRoot),
        ...buildRoutePaths(taxonomyRoot),
        ...buildRoutePaths(infrastructureRoot)
      ],
      isCached: config.get('isProduction'),
      context
    }
  }

  Object.entries(globals).forEach(([name, global]) => {
    nunjucksEnvironment.addGlobal(name, global)
  })

  Object.entries(filters).forEach(([name, filter]) => {
    nunjucksEnvironment.addFilter(name, filter)
  })

  return nunjucksConfig
}
