import { normalize } from '@angular-devkit/core'
import { SchematicContext, Tree } from '@angular-devkit/schematics'
import { readNxJson, toFileName } from '@nrwl/workspace'
import { appsDir } from '@nrwl/workspace/src/utils/ast-utils'
import { directoryExists } from '@nrwl/workspace/src/utils/fileutils'
import {
  ConvertToPromptType,
  generateNameCases,
  isVerbose,
  mapPromptChoices,
  readMicroserviceIntegration,
  readNxIntegration,
  setSchemaDefaultsInContext
} from '@webundsoehne/nx-tools'
import { Listr } from 'listr2'

import { NormalizedSchema, Schema } from '../main.interface'
import {
  AvailableComponents,
  AvailableDBAdapters,
  AvailableDBTypes,
  AvailableMicroserviceTypes,
  AvailableServerTypes,
  AvailableTestsTypes,
  PrettyNamesForAvailableThingies
} from '@interfaces/available.constants'
import { SchematicConstants } from '@src/interfaces'
import { generateMicroserviceCasing } from '@src/utils'

/**
 * Normalize the options passed in through angular-schematics.
 * @param host
 * @param context
 * @param options
 */
export async function normalizeOptions (host: Tree, _context: SchematicContext, options: Schema): Promise<NormalizedSchema> {
  return new Listr<NormalizedSchema>(
    [
      // assign options to parsed schema
      {
        task: (ctx): void => {
          setSchemaDefaultsInContext(ctx, {
            default: [
              {
                ...options
              },
              {
                sourceRoot: 'src'
              },
              {
                constants: SchematicConstants
              },
              {
                enum: {
                  components: AvailableComponents,
                  server: AvailableServerTypes,
                  database: AvailableDBTypes,
                  tests: AvailableTestsTypes,
                  microservice: AvailableMicroserviceTypes,
                  dbAdapters: AvailableDBAdapters
                }
              },
              {
                injectedCasing: {}
              }
            ]
          })
        }
      },

      // decide the application root directory
      {
        task: (ctx): void => {
          if (options.directory) {
            ctx.directory = `${toFileName(options.directory)}/${toFileName(options.name)}`
          } else {
            ctx.directory = toFileName(options.name)
          }
        }
      },

      // normalize package json scope
      {
        title: 'Normalizing package.json project name.',
        task: (ctx, task): void => {
          const nxJson = readNxJson()
          ctx.packageName = `@${nxJson.npmScope}/${ctx.name}`
          ctx.packageScope = `${nxJson.npmScope}`

          task.title = `Project package name set as "${ctx.packageName}".`
        }
      },

      // set project root directory
      {
        title: 'Setting project root directory.',
        task: (ctx, task): void => {
          ctx.root = normalize(`${appsDir(host)}/${ctx.directory}`)

          task.title = `Project root directory is set as "${ctx.root}".`
        }
      },

      // check for prior configuration
      {
        title: 'Checking if the application is configured before.',
        task: (ctx, task): void => {
          if (directoryExists(ctx.root)) {
            task.output = `Project root directory is not empty at: "${ctx.root}"`

            task.title = 'Looking for prior application configuration in "nx.json".'

            const integration = readNxIntegration<NormalizedSchema['priorConfiguration']>(ctx.name)
            if (integration) {
              ctx.priorConfiguration = integration

              task.title = 'Prior configuration successfully found in "nx.json".'
            } else {
              throw new Error('Can not read prior configuration from "nx.json".')
            }
          } else {
            task.title = 'This is the initial configuration of the package.'
          }
        },
        options: {
          persistentOutput: true,
          bottomBar: false
        }
      },

      // select server functionality
      {
        skip: (ctx): boolean => ctx.components?.length > 0,
        task: async (ctx, task): Promise<void> => {
          const choices = mapPromptChoices<AvailableComponents>(AvailableComponents, PrettyNamesForAvailableThingies)

          // select the base components
          ctx.components = await task.prompt<AvailableComponents[]>({
            type: 'MultiSelect',
            message: 'Please select which components you want to include.',
            choices,
            validate: (val) => {
              if (val.includes(AvailableComponents.MICROSERVICE_CLIENT) && val.length === 1) {
                return 'Microservice client can not be selected by its own.'
              }

              if (val?.length > 0) {
                return true
              } else {
                return 'At least one component must be included.'
              }
            },
            initial: getInitialFromPriorConfiguration(ctx, 'components', choices)
          })

          ctx.effectiveComponents = ctx.components.includes(AvailableComponents.MICROSERVICE_CLIENT) ? ctx.components.length - 1 : ctx.components.length

          task.title = `Server components selected: ${ctx.components}`
        },
        options: {
          bottomBar: Infinity,
          persistentOutput: true
        }
      },

      // backend server types
      {
        skip: (ctx): boolean => !ctx.components.includes(AvailableComponents.SERVER) && !ctx?.server,
        task: async (ctx, task): Promise<void> => {
          const choices = mapPromptChoices<AvailableServerTypes>(AvailableServerTypes, PrettyNamesForAvailableThingies)

          ctx.server = await task.prompt<AvailableServerTypes>({
            type: 'Select',
            message: 'Please select the API server type.',
            choices,
            initial: getInitialFromPriorConfiguration(ctx, 'server', choices)
          })

          task.title = `Server type selected as: ${ctx.server}`
        },
        options: {
          bottomBar: Infinity,
          persistentOutput: true
        }
      },

      // microservice-server types
      {
        skip: (ctx): boolean => !ctx.components.includes(AvailableComponents.MICROSERVICE_SERVER) && !ctx?.microservice,
        task: async (ctx, task): Promise<void> => {
          const choices = mapPromptChoices<AvailableMicroserviceTypes>(AvailableMicroserviceTypes, PrettyNamesForAvailableThingies)

          ctx.microservice = await task.prompt<AvailableMicroserviceTypes>({
            type: 'Select',
            message: 'Please select the microservice server type.',
            choices,
            initial: getInitialFromPriorConfiguration(ctx, 'microservice', choices)
          })

          ctx.injectedCasing.microservice = generateMicroserviceCasing(ctx.name)

          task.title = `Microservice type selected as: ${ctx.microservice}`
        },
        options: {
          bottomBar: Infinity,
          persistentOutput: true
        }
      },

      // database options
      {
        skip: (ctx): boolean => !!ctx?.database,
        task: async (ctx, task): Promise<void> => {
          const choices = mapPromptChoices<AvailableDBTypes>(AvailableDBTypes, PrettyNamesForAvailableThingies)

          // there can be two selections of API servers here
          ctx.database = await task.prompt<AvailableDBTypes>({
            type: 'Select',
            message: 'Please select the database type.',
            choices,
            initial: getInitialFromPriorConfiguration(ctx, 'database', choices)
          })

          ctx.dbAdapters = [ AvailableDBTypes.TYPEORM_MYSQL, AvailableDBTypes.TYPEORM_POSTGRESQL ].includes(ctx.database)
            ? AvailableDBAdapters.TYPEORM
            : AvailableDBAdapters.MONGOOSE

          task.title = `Database selected as: ${ctx.database}`
        },
        options: {
          bottomBar: Infinity,
          persistentOutput: true
        }
      },

      // microservice-client options
      {
        skip: (ctx): boolean => !ctx.components.includes(AvailableComponents.MICROSERVICE_CLIENT),
        task: async (ctx, task): Promise<void> => {
          const microservices = readMicroserviceIntegration().map((m) => ({ name: m.name, message: `${m.name} from ${m.root}` }))

          if (microservices?.length > 0) {
            // there can be two selections of API servers here
            ctx.microserviceClient = await task.prompt<string[]>({
              type: 'MultiSelect',
              message: 'Please select which microservice-servers you want to include.',
              choices: microservices,
              initial: getInitialFromPriorConfiguration(ctx, 'microserviceClient', microservices)
            })

            ctx.microserviceCasing = {}
            // generate the microservice names
            await Promise.all(ctx.microserviceClient.map(async (m) => ctx.microserviceCasing[m] = generateMicroserviceCasing(m)))

            // select the components to inject these microservice-clients to
            // TODO: not sure if this is required a trivial case

            task.title = `Microservice clients selected as: ${ctx.microserviceClient.join(', ')}`
          } else {
            task.title = 'No microservice clients are found running in mock mode.'
          }
        },
        options: {
          bottomBar: Infinity,
          persistentOutput: true
        }
      },

      // select tests
      {
        skip: (ctx): boolean => !!ctx.tests,
        task: async (ctx, task): Promise<void> => {
          const choices = mapPromptChoices<AvailableTestsTypes>(AvailableTestsTypes, PrettyNamesForAvailableThingies)

          ctx.tests = await task.prompt<AvailableTestsTypes>({
            type: 'Select',
            message: 'Please select the test runner type.',
            choices,
            initial: getInitialFromPriorConfiguration(ctx, 'tests', choices)
          })

          task.title = `Test runner selected as: ${ctx.tests}`
        },
        options: {
          bottomBar: Infinity,
          persistentOutput: true
        }
      },

      // generate casing
      {
        task: async (ctx): Promise<void> => {
          const casing = generateNameCases(ctx.name)
          ctx.casing = casing
        }
      }
    ],
    {
      rendererFallback: isVerbose()
    }
  ).run()
}

function getInitialFromPriorConfiguration (ctx: NormalizedSchema, key: keyof NormalizedSchema['priorConfiguration'], choices: ConvertToPromptType<any>): number[] | number {
  if (key === 'components') {
    return (
      ctx.priorConfiguration?.[key]?.reduce((o, val) => {
        choices.forEach((v, i) => {
          if (v.name === val) {
            o = [ ...o, i ]
          }
        })
        return o
      }, []) ?? []
    )
  } else {
    let value = 0
    choices.forEach((val, i) => {
      if (val.name === ctx.priorConfiguration?.[key]) {
        value = i
      }
    })

    return value
  }
}
