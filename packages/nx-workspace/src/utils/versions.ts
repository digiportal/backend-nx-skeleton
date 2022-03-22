import { VERSIONS } from './versions.constants'
import type { PackageVersions } from '@digiportal/nx-tools'
import { dependencyCalculator } from '@digiportal/nx-tools'
import { AvailableCLIs } from '@interfaces/available.constants'
import type { NormalizedSchema as WorkspaceNormalizedSchema } from '@schematics/workspace/main.interface'

// calculate dependencies
export async function calculateDependencies (options: WorkspaceNormalizedSchema): Promise<PackageVersions> {
  return dependencyCalculator([
    {
      deps: VERSIONS.base.default
    },
    {
      condition: options.cli === AvailableCLIs.NX,
      deps: VERSIONS[AvailableCLIs.NX]
    }
  ])
}
