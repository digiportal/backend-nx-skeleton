import type { BaseIntegration } from '@digiportal/nx-tools'
import type { NormalizedSchema as LibraryNormalizedSchema } from '@schematics/library/main.interface'

export type NxWorkspaceIntegration = BaseIntegration<{
  library: LibraryNormalizedSchema['priorConfiguration']
}>
