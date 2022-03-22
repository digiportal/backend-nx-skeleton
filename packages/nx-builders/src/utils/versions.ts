import { VERSIONS } from './versions.constants'
import type { PackageVersions } from '@digiportal/nx-tools'
import { dependencyCalculator } from '@digiportal/nx-tools'
import { AvailableBuilders } from '@interfaces/available.constants'
import type { Schema } from '@schematics/init/main.interface'

// calculate dependencies
export async function calculateDependencies (options: Schema['items']): Promise<PackageVersions> {
  return dependencyCalculator([
    {
      condition: options.includes(AvailableBuilders.TSC),
      deps: VERSIONS[AvailableBuilders.TSC]
    },
    {
      condition: options.includes(AvailableBuilders.TS_NODE_DEV),
      deps: VERSIONS[AvailableBuilders.TS_NODE_DEV]
    }
  ])
}
