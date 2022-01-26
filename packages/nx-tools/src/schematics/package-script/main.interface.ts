import { BarebonesSchema, BaseNormalizedSchemaRoot } from '@interfaces/base-schemas.interface'
import { PackageManagerActions } from '@utils/package-manager'

export interface Schema extends BarebonesSchema, BaseNormalizedSchemaRoot {
  action: PackageManagerActions
}

export type NormalizedSchema = Schema
