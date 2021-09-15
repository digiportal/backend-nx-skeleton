import { normalize } from '@angular-devkit/core'
import { Rule } from '@angular-devkit/schematics'
import { generateProjectLint, updateWorkspaceInTree } from '@nrwl/workspace'
import { EnrichedWorkspaceJson, NxProjectTypes } from '@webundsoehne/nx-tools'
import { join } from 'path'

import { SchematicArchitect } from '../interfaces/add-project.interface'
import { SchematicFilesMap } from '../interfaces/file.constants'
import { NormalizedSchema } from '../main.interface'
import { AvailableComponents, AvailableDBAdapters, AvailableExtensions, AvailableTestsTypes } from '@interfaces/available.constants'
import { SchematicConstants } from '@src/interfaces'

/**
 * Add the project to the {workspace,angular}.json
 * @param options Parsed schema
 */
export function addProject (options: NormalizedSchema): Rule {
  return updateWorkspaceInTree<EnrichedWorkspaceJson>((json) => {
    const architect: SchematicArchitect = {} as SchematicArchitect

    architect.build = {
      executor: '@webundsoehne/nx-builders:tsc',
      options: {
        cwd: options.root,
        main: `${options.root}/src/main.ts`,
        outputPath: `dist/${options.directory}`,
        tsConfig: `${options.root}/tsconfig.build.json`,
        swapPaths: true,
        assets: [
          {
            glob: '*',
            input: `${options.root}/config`,
            output: 'config'
          },
          {
            glob: 'Dockerfile',
            input: `${options.root}`,
            output: '.'
          }
        ]
      }
    }

    // prefer server mode
    if (options.components.includes(AvailableComponents.SERVER)) {
      architect.serve = {
        executor: '@webundsoehne/nx-builders:ts-node-dev',
        options: {
          cwd: options.root,
          main: join(options.root, 'src/main.ts'),
          tsConfig: join(options.root, 'tsconfig.json'),
          environment: {
            NODE_SERVICE: 'server'
          }
        }
      }
    } else if (options.components.includes(AvailableComponents.MICROSERVICE_SERVER)) {
      architect.serve = {
        executor: '@webundsoehne/nx-builders:ts-node-dev',
        options: {
          cwd: options.root,
          main: join(options.root, 'src/main.ts'),
          tsConfig: join(options.root, 'tsconfig.json'),
          environment: {
            NODE_SERVICE: 'microservice-server'
          }
        }
      }
    } else if (options.components.includes(AvailableComponents.BG_TASK)) {
      architect.serve = {
        executor: '@webundsoehne/nx-builders:ts-node-dev',
        options: {
          cwd: options.root,
          main: join(options.root, 'src/main.ts'),
          tsConfig: join(options.root, 'tsconfig.json'),
          environment: {
            NODE_SERVICE: 'bgtask'
          }
        }
      }
    }

    if (options.tests === AvailableTestsTypes.JEST) {
      architect.test = {
        executor: '@webundsoehne/nx-builders:run',
        options: {
          cwd: options.root,
          nodeOptions: '-r ts-node/register -r tsconfig-paths/register',
          node: true,
          watch: false,
          command: 'jest --config ./test/jest.config.js --passWithNoTests --detectOpenHandles',
          environment: {
            DEBUG_PORT: 9229
          }
        },
        configurations: {
          cov: {
            command: 'jest --config ./test/jest.config.js --passWithNoTests --coverage --detectOpenHandles',
            nodeOptions: '-r ts-node/register -r tsconfig-paths/register',
            node: true,
            environment: {}
          },

          dev: {
            command: 'jest --config ./test/jest.config.js --watchAll --passWithNoTests --runInBand --detectOpenHandles',
            nodeOptions: '-r ts-node/register -r tsconfig-paths/register --inspect=0.0.0.0:{{ debugPort | default(environment.DEBUG_PORT) }}',
            node: true,
            interactive: true,
            environment: {}
          },

          e2e: {
            command: 'jest --config ./test/jest.e2e-config.js --passWithNoTests --runInBand --detectOpenHandles',
            nodeOptions: '-r ts-node/register -r tsconfig-paths/register',
            node: true,
            environment: {}
          }
        }
      }
    }

    if (options.components.includes(AvailableComponents.COMMAND)) {
      architect.command = {
        executor: '@webundsoehne/nx-builders:run',
        options: {
          cwd: options.root,
          command: 'nestjs-command',
          nodeOptions: '-r tsconfig-paths/register',
          node: true,
          watch: false,
          interactive: true,
          environment: {
            CLI_PATH: './src/main.ts'
          }
        }
      }
    }

    if (options.dbAdapters === AvailableDBAdapters.TYPEORM) {
      const configurationBasePath = options.extensions.includes(AvailableExtensions.EXTERNAL_BACKEND_INTERFACES)
        ? SchematicConstants.BACKEND_INTERFACES_PACKAGE
        : join(options.sourceRoot, SchematicFilesMap.UTILS)

      architect.migration = {
        executor: '@webundsoehne/nx-builders:run',
        options: {
          cwd: options.root,
          nodeOptions: '-r ts-node/register -r tsconfig-paths/register',
          node: true,
          watch: false,
          environment: {}
        },
        configurations: {
          run: {
            command: `typeorm migration:run --config=${join(configurationBasePath, 'orm.config.ts')}`
          },
          'mock-run': {
            command: `typeorm migration:run --config=${join(configurationBasePath, 'mock-orm.config.ts')}`
          },
          create: {
            command: `typeorm migration:create --config=${join(configurationBasePath, 'orm.config.ts')} -n`
          },
          generate: {
            command: `typeorm migration:generate --config=${join(configurationBasePath, 'orm.config.ts')} -n`
          },
          rollback: {
            command: `typeorm migration:revert --config=${join(configurationBasePath, 'orm.config.ts')}`
          }
        }
      }

      architect.seed = {
        executor: '@webundsoehne/nx-builders:run',
        options: {
          cwd: options.root,
          command: `typeorm-seeding --configName=${join(configurationBasePath, 'orm.config.ts')} seed`,
          nodeOptions: '-r ts-node/register -r tsconfig-paths/register',
          node: true,
          watch: false,
          environment: {}
        }
      }
    }

    architect.lint = generateProjectLint(normalize(options.root), join(normalize(options.root), 'tsconfig.json'), options.linter, [
      `${options.root}/**/*.ts`,
      `${options.root}/**/*.js`
    ])

    json.projects[options.name] = {
      root: options.root,
      sourceRoot: options.sourceRoot,
      projectType: NxProjectTypes.APP,
      schematics: {},
      architect
    }

    return json
  })
}
