import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics'
import { chain, externalSchematic } from '@angular-devkit/schematics'
import type { Schema as NrwlSchema } from '@nrwl/workspace/src/generators/move/schema'

import { normalizeOptions } from './lib/normalize-options'
import type { Schema } from './main.interface'
import { formatTreeRule, removeTsConfigPathsRule, updateTsConfigPathsRule } from '@digiportal/nx-tools'

export default function (schema: Schema): Rule {
  return async (host: Tree, context: SchematicContext): Promise<Rule> => {
    const options = await normalizeOptions(host, context, schema)

    return chain([
      externalSchematic<NrwlSchema>('@nrwl/workspace', 'move', {
        destination: options.destination,
        projectName: options.parent,
        updateImportPath: options.updateImportPath,
        importPath: options.importPath,
        skipFormat: options.skipFormat
      }),

      removeTsConfigPathsRule({ packageName: options.packageName }),

      updateTsConfigPathsRule({
        packageName: options.packageName,
        root: options.project.root,
        sourceRoot: options.project.sourceRoot
      }),

      formatTreeRule({ skip: options.skipFormat })
    ])
  }
}
