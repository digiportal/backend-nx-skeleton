import type { Rule } from '@angular-devkit/schematics'
import { chain } from '@angular-devkit/schematics'

import type { NormalizedSchema } from '../main.interface'
import { updateNxIntegrationRule } from '@digiportal/nx-tools'
import type { NxNestProjectIntegration } from '@integration'

export function updateIntegration (options: NormalizedSchema): Rule {
  return chain([
    // add the components that needs to be known
    updateNxIntegrationRule<NxNestProjectIntegration>(options.name, {
      backendInterfaces: {
        dbAdapters: options.dbAdapters
      }
    })
  ])
}
