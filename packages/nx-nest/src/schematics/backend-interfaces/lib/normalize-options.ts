import type { SchematicContext, Tree } from '@angular-devkit/schematics'
import { Listr } from 'listr2'

import type { NormalizedSchema, Schema } from '../main.interface'
import { uniqueArrayFilter } from '@digiportal/deep-merge'
import {
  isVerbose,
  normalizeNamePrompt,
  normalizePackageJsonNamePrompt,
  normalizePriorConfigurationPrompt,
  normalizeRootDirectoryPrompt,
  NxProjectTypes,
  setSchemaDefaultsInContext,
  ensureNxRootListrTask
} from '@digiportal/nx-tools'
import type { NxNestProjectIntegration } from '@integration'
import { readBackendInterfacesWorkspaceIntegration } from '@integration/backend-interfaces'
import { AvailableDBAdapters, SchematicConstants } from '@interfaces'

export async function normalizeOptions (host: Tree, _context: SchematicContext, options: Schema): Promise<NormalizedSchema> {
  return new Listr<NormalizedSchema>(
    [
      // assign options to parsed schema
      {
        task: async (ctx): Promise<void> => {
          setSchemaDefaultsInContext(ctx, {
            default: [
              options,
              {
                sourceRoot: 'src',
                name: SchematicConstants.BACKEND_INTERFACES_PACKAGE,
                constants: SchematicConstants,
                dbAdapters: [],
                enum: { dbAdapters: AvailableDBAdapters }
              }
            ]
          })
        }
      },

      ...ensureNxRootListrTask(),

      // select application name
      ...normalizeNamePrompt<NormalizedSchema>(),

      // normalize package json scope
      ...normalizePackageJsonNamePrompt<NormalizedSchema>(host),

      // set project root directory
      ...normalizeRootDirectoryPrompt<NormalizedSchema>(host, NxProjectTypes.LIB),

      // check for prior configuration
      ...normalizePriorConfigurationPrompt<NormalizedSchema, NxNestProjectIntegration>(host, 'backendInterfaces'),

      // parse microservices for templates
      {
        title: 'Parsing all integrated backend applications...',
        task: (ctx, task): void => {
          const backendInterfaces = readBackendInterfacesWorkspaceIntegration(host)

          ctx.dbAdapters = backendInterfaces.flatMap((m) => m.dbAdapters).filter(uniqueArrayFilter)

          if (ctx.dbAdapters.length > 0) {
            task.title = `DB Adapters used in the applications are: ${ctx.dbAdapters.join(', ')}`

            task.output = `Applications with databases has been found: ${backendInterfaces.map((m) => `${m.name}:${m.dbAdapters}`).join(', ')}`
          } else {
            task.title = 'No applications with databases has been found.'
          }
        }
      }
    ],
    {
      concurrent: false,
      rendererFallback: isVerbose(),
      rendererSilent: options.silent
    }
  ).run()
}
