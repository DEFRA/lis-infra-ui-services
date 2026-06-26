import path from 'path'
import { existsSync, readFileSync } from 'node:fs'
import nunjucks from 'nunjucks'
import hapiVision from '@hapi/vision'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

import { createNunjucksContextBuilder } from './context.js'
import { buildPrimaryNavigation } from './build-navigation.js'
import * as filters from './filters.js'
import * as globals from './globals.js'

function findDependentPackageName(projectRoot, prefix) {
  const packageJson = JSON.parse(
    readFileSync(path.join(projectRoot, 'package.json'), 'utf8')
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
    const packageJsonPath = path.join(currentPath, 'package.json')

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

  addIfExists(templatePaths, path.resolve(packageRoot, 'src/nunjucks/templates'))
  addIfExists(templatePaths, path.resolve(packageRoot, 'src/nunjucks/components'))

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

export function createNunjucksConfig({ config, logger, getRequestBasePath }) {
  const projectRoot = config.get('root')
  const infrastructureRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../..'
  )
  const require = createRequire(path.join(projectRoot, 'package.json'))
  const speciesRoot = resolvePackageRoot(
    require,
    findDependentPackageName(projectRoot, '@livestock/species-')
  )
  const taxonomyRoot = resolvePackageRoot(
    require,
    findDependentPackageName(projectRoot, '@livestock/taxonomy-')
  )
  const govukFrontendRoot = path.dirname(
    require.resolve('govuk-frontend/package.json')
  )
  const nunjucksEnvironment = nunjucks.configure(
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

  const buildNavigation = (request) =>
    buildPrimaryNavigation({
      request,
      basePath: config.get('basePath'),
      hubOrigin: config.get('auth.hubOrigin')
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
