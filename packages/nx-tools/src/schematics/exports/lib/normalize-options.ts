import { SchematicContext, Tree } from '@angular-devkit/schematics'
import { Listr } from 'listr2'

import { NormalizedSchema, Schema } from '../main.interface'
import { setSchemaDefaultsInContext } from '@utils/schematics/defaults'

export async function normalizeOptions (host: Tree, context: SchematicContext, options: Schema): Promise<NormalizedSchema> {
  return new Listr<NormalizedSchema>(
    [
      // assign options to parsed schema
      {
        task: async (ctx): Promise<void> => {
          await setSchemaDefaultsInContext(ctx, { assign: { from: options, keys: [ 'root', 'template' ] } })
        }
      }
    ],
    {
      concurrent: false,
      rendererFallback: context.debug,
      rendererSilent: options.silent
    }
  ).run()
}
