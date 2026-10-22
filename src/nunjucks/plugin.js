import path from 'path'
import { existsSync, readFileSync } from 'node:fs'
import nunjucks from 'nunjucks'
import hapiVision from '@hapi/vision'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

import { createNunjucksContextBuilder } from './context.js'
import * as filters from './filters.js'
import * as globals from './globals.js'

const PACKAGE_JSON_FILENAME = 'package.json'

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
  const govukFrontendRoot = path.dirname(
    packageRequire.resolve('govuk-frontend/package.json')
  )

  return { govukFrontendRoot }
}

function buildNunjucksEnvironment({
  config,
  projectRoot,
  infrastructureRoot,
  govukFrontendRoot
}) {
  return nunjucks.configure(
    [
      path.join(govukFrontendRoot, 'dist'),
      ...buildProjectTemplatePaths(projectRoot),
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
 * @import { ErrorPageLinks } from './context.js'
 * @param {{ config: object, logger: object, getRequestBasePath: Function, moduleId?: string, errorPages?: ErrorPageLinks }} options
 * @returns {object}
 */
export function createNunjucksConfig({
  config,
  logger,
  getRequestBasePath,
  moduleId,
  errorPages
}) {
  const projectRoot = config.get('root')
  const infrastructureRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../..'
  )
  const { govukFrontendRoot } = resolveTemplateRoots(projectRoot)
  const nunjucksEnvironment = buildNunjucksEnvironment({
    config,
    projectRoot,
    infrastructureRoot,
    govukFrontendRoot
  })

  const context = createNunjucksContextBuilder({
    config,
    getRequestBasePath,
    logger,
    readFileSync,
    moduleId,
    errorPages
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
      path: ['src/server/routes', ...buildRoutePaths(infrastructureRoot)],
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
