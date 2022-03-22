import type { BaseNormalizedSchemaPackageName, BaseSchemaWithParentAndConfigurationAndDestination, EnrichedProjectConfiguration } from '@digiportal/nx-tools'

export interface Schema extends BaseSchemaWithParentAndConfigurationAndDestination {
  importPath?: string
  updateImportPath?: boolean
}

export interface NormalizedSchema extends Schema, BaseNormalizedSchemaPackageName {
  project: EnrichedProjectConfiguration
}
