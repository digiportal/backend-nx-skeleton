import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics'
import { chain, noop } from '@angular-devkit/schematics'
import { join } from 'path'

import { addProject } from './lib/add-project'
import { createApplicationFiles } from './lib/create-application-files'
import { normalizeOptions } from './lib/normalize-options'
import { updateIntegration } from './lib/update-integration'
import type { Schema } from './main.interface'
import { addEslintConfigRule, formatTreeRule, LINTER_VERSIONS, Logger, runInRule, updateTsConfigPathsRule } from '@digiportal/nx-tools'
import type { SchematicRule } from '@digiportal/nx-tools'
import { AvailableLibraryTypes } from '@interfaces/available.constants'
import init from '@schematics/init/main'

/**
 * Entrypoint to the schematic.
 * @param schema
 */
export default function (schema: Schema): SchematicRule {
  return async (host: Tree, context: SchematicContext): Promise<Rule> => {
    const log = new Logger(context)
    const options = await normalizeOptions(host, context, schema)

    return chain([
      addEslintConfigRule(options, { deps: LINTER_VERSIONS.eslint, json: {} }),

      options.type === AvailableLibraryTypes.BUILDABLE ? init() : noop(),

      runInRule(log.info.bind(log)('Adding project to workspace.')),
      addProject(options),

      runInRule(log.info.bind(log)('Creating library files.')),
      createApplicationFiles(options),

      runInRule(log.info.bind(log)('Updating tsconfig files.')),
      updateTsConfigPathsRule(options),

      options.type === AvailableLibraryTypes.BUILDABLE ? updateTsConfigPathsRule({ ...options, tsconfig: join(options.root, 'tsconfig.build.json') }) : noop(),

      runInRule(log.info.bind(log)('Updating integration.')),
      updateIntegration(options),

      formatTreeRule({ skip: options.skipFormat })
    ])
  }
}
