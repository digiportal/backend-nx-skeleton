import type { BaseNormalizedSchemaPackageName, BaseSchemaWithParentAndConfiguration } from '@digiportal/nx-tools'

export type Schema = BaseSchemaWithParentAndConfiguration

export interface NormalizedSchema extends Schema, BaseNormalizedSchemaPackageName {}
