import type { Rule, Tree } from '@angular-devkit/schematics'
import { join } from 'path'

import type { SchematicTargets } from '../interfaces/add-project.interface'
import { SchematicFilesMap } from '../interfaces/file.constants'
import type { NormalizedSchema } from '../main.interface'
import type { EnrichedProjectConfiguration } from '@digiportal/nx-tools'
import { AvailableTestsTypes, createWorkspaceProjectRule, generateProjectLintTarget, NxProjectTypes, readWorkspaceLayout } from '@digiportal/nx-tools'
import { SchematicConstants } from '@interfaces'
import { AvailableComponents, AvailableDBAdapters, AvailableExtensions } from '@interfaces/available.constants'

/**
 * Add the project to the {workspace,angular}.json
 * @param options Parsed schema
 */
export function addProject (options: NormalizedSchema): Rule {
  return (host: Tree): Rule => {
    const targets: SchematicTargets = {} as SchematicTargets

    targets.build = {
      executor: '@digiportal/nx-builders:tsc',
      options: {
        cwd: options.root,
        main: `${options.root}/src/main.ts`,
        outputPath: `dist/${options.root}`,
        tsConfig: `${options.root}/tsconfig.build.json`,
        swapPaths: true,
        assets: [
          {
            glob: '*',
            input: `${options.root}/config`,
            output: 'config'
          },
          {
            glob: '.dockerignore',
            input: `${options.root}`,
            output: '.'
          },
          {
            glob: 'Dockerfile',
            input: `${options.root}`,
            output: '.'
          },
          {
            glob: 'package-lock.json',
            input: '.',
            output: '.'
          }
        ]
      }
    }

    // prefer server mode
    if (options.components.includes(AvailableComponents.SERVER)) {
      targets.serve = {
        executor: '@digiportal/nx-builders:ts-node-dev',
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
      targets.serve = {
        executor: '@digiportal/nx-builders:ts-node-dev',
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
      targets.serve = {
        executor: '@digiportal/nx-builders:ts-node-dev',
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
      targets.test = {
        executor: '@digiportal/nx-builders:run',
        options: {
          cwd: options.root,
          nodeOptions: '-r ts-node/register -r tsconfig-paths/register',
          node: true,
          watch: false,
          command: 'jest --config ./test/jest.config.js --passWithNoTests --detectOpenHandles',
          environment: {
            DEBUG_PORT: '9229'
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
            command: 'jest --config ./test/jest.config.js --watchAll --passWithNoTests --runInBand --detectOpenHandles --verbose',
            nodeOptions: '-r ts-node/register -r tsconfig-paths/register --inspect=0.0.0.0:{{ debugPort | default(environment.DEBUG_PORT) }}',
            node: true,
            interactive: true,
            environment: {
              DEBUG_PORT: '9229'
            }
          },

          e2e: {
            command: 'jest --config ./test/jest-e2e.config.js --passWithNoTests --runInBand --detectOpenHandles',
            nodeOptions: '-r ts-node/register -r tsconfig-paths/register',
            node: true,
            environment: {}
          },

          'e2e-dev': {
            command: 'jest --config ./test/jest-e2e.config.js --watchAll --passWithNoTests --runInBand --detectOpenHandles --verbose',
            nodeOptions: '-r ts-node/register -r tsconfig-paths/register --inspect=0.0.0.0:{{ debugPort | default(environment.DEBUG_PORT) }}',
            node: true,
            interactive: true,
            environment: {
              DEBUG_PORT: '9229'
            }
          }
        }
      }
    }

    if (options.components.includes(AvailableComponents.COMMAND)) {
      targets.command = {
        executor: '@digiportal/nx-builders:run',
        options: {
          cwd: options.root,
          command: './src/main.ts',
          nodeOptions: '-r ts-node/register -r tsconfig-paths/register',
          node: true,
          watch: false,
          interactive: true,
          environment: {
            NODE_SERVICE: 'cli'
          }
        }
      }
    }

    if (options.dbAdapters === AvailableDBAdapters.TYPEORM) {
      const configurationBasePath = options.extensions.includes(AvailableExtensions.EXTERNAL_BACKEND_INTERFACES)
        ? join(readWorkspaceLayout(host).libsDir, SchematicConstants.BACKEND_INTERFACES_PACKAGE)
        : join(options.sourceRoot, SchematicFilesMap.UTILS)

      targets.migration = {
        executor: '@digiportal/nx-builders:run',
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

      targets.seed = {
        executor: '@digiportal/nx-builders:run',
        options: {
          cwd: options.root,
          command: `typeorm-seeding --configName=${join(configurationBasePath, 'orm.config.ts')} seed`,
          nodeOptions: '-r ts-node/register -r tsconfig-paths/register',
          node: true,
          executeWithNode: true,
          watch: false,
          environment: {}
        }
      }
    }

    targets.lint = generateProjectLintTarget(options)

    const project: EnrichedProjectConfiguration = {
      root: options.root,
      sourceRoot: options.sourceRoot,
      projectType: NxProjectTypes.APP,
      targets
    }

    return createWorkspaceProjectRule(options.name, project)
  }
}
