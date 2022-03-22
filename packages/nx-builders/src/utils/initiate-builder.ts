import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics'
import { chain } from '@angular-devkit/schematics'

import { addDependenciesToPackageJsonRule, addNxInstallRule, Logger } from '@digiportal/nx-tools'
import { updateNxBuildersWorkspaceIntegrationRule } from '@integration/nx-builders'
import type { Schema } from '@schematics/init/main.interface'
import { calculateDependencies } from '@utils/versions'

/**
 * A function to initiate builder depdencies. It may be wiser to call it via schematic.
 * @param options
 */
export function initiateBuilderDependencies (options: Schema['items']): Rule {
  return async function (host: Tree, context: SchematicContext): Promise<Rule> {
    const log = new Logger(context)

    const dependencies = await calculateDependencies(options)

    if (options?.length > 0) {
      log.info('Initiating nx-builders builder dependencies: %o', dependencies)

      return chain([addDependenciesToPackageJsonRule(dependencies), updateNxBuildersWorkspaceIntegrationRule(host, { available: options }), addNxInstallRule()])
    } else {
      log.debug('nx-builders already has been initiated.')

      return chain([])
    }
  }
}
