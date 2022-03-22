import type { NormalizedSchema } from '../main.interface'
import type { SchematicFiles } from '@digiportal/nx-tools'
import { AvailableTestsTypes } from '@digiportal/nx-tools'
import { AvailableLibraryTypes } from '@interfaces/available.constants'

/**
 * This constant includes the files that are required for different components.
 * It can be used to filter out files, if that component is not used.
 */
export function getSchematicFiles (options: NormalizedSchema): SchematicFiles {
  return {
    [AvailableTestsTypes.JEST]: {
      condition: options.tests === AvailableTestsTypes.JEST,
      files: ['.spec.ts', 'e2e.spec.ts'],
      folders: ['test/']
    },

    [AvailableLibraryTypes.BUILDABLE]: {
      condition: options.type === AvailableLibraryTypes.BUILDABLE,
      files: ['tsconfig.build.json']
    }
  }
}
