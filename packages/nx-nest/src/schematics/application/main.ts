import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics'
import { chain } from '@angular-devkit/schematics'

import { addProject } from './lib/add-project'
import { createApplicationFiles } from './lib/create-application-files'
import { normalizeOptions } from './lib/normalize-options'
import { updateIntegration } from './lib/update-integration'
import type { Schema } from './main.interface'
import {
  addDependenciesToProjectPackageJsonRule,
  addEslintConfigRule,
  formatTreeRule,
  LINTER_VERSIONS,
  Logger,
  runInRule,
  updatePackageJsonForProjectRule,
  updateTsConfigPathsRule
} from '@digiportal/nx-tools'
import type { SchematicRule } from '@digiportal/nx-tools'
import init from '@schematics/init/main'
import { calculateDependencies } from '@utils/versions'

/**
 * Entrypoint to the schematic.
 * @param schema
 */
export default function (schema: Schema): SchematicRule {
  return async (host: Tree, context: SchematicContext): Promise<Rule> => {
    const log = new Logger(context)
    const options = await normalizeOptions(host, context, schema)
    const dependencies = await calculateDependencies(options)

    return chain([
      runInRule(log.info.bind(log)('Initiating workspace.')),
      init(),

      addEslintConfigRule(options, { deps: LINTER_VERSIONS.eslint, json: {} }),

      runInRule(log.info.bind(log)('Adding project to workspace.')),
      addProject(options),

      runInRule(log.info.bind(log)('Creating application files.')),
      createApplicationFiles(options),

      runInRule(log.info.bind(log)('Updating integration.')),
      updateIntegration(options),

      runInRule(log.info.bind(log)('Updating tsconfig files.')),
      updateTsConfigPathsRule(options),

      addDependenciesToProjectPackageJsonRule(options, dependencies),
      updatePackageJsonForProjectRule(options, { scripts: options.packageJsonScripts }),

      formatTreeRule({ skip: options.skipFormat })
    ])
  }
}
