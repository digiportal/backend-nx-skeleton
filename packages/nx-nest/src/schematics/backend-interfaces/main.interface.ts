import type { BaseNormalizedSchema, BaseSchema, SchemaPriorConfiguration } from '@digiportal/nx-tools'
import type { SchematicConstants } from '@interfaces'
import type { AvailableDBAdapters } from '@interfaces/available.constants'

/**
 * The options that it gets from angular-cli
 */
export interface Schema extends BaseSchema, CommonPropertiesToSaveAndUse {}

/**
 * After the options has been normalized.
 */
export interface NormalizedSchema extends Schema, BaseNormalizedSchema, SchemaPriorConfiguration<CommonPropertiesToSaveAndUse> {
  constants: typeof SchematicConstants
  enum: { dbAdapters: typeof AvailableDBAdapters }
}

/**
 * This properties are shared across the input, normalized and saved configurations.
 */
interface CommonPropertiesToSaveAndUse {
  dbAdapters?: AvailableDBAdapters[]
}
