import type { BaseNormalizedSchemaPackageScope, BaseNormalizedSchemaRoot, BaseSchema, PackageVersions } from '@digiportal/nx-tools'
import type { AvailableCLIs, AvailableFolderStructures } from '@interfaces/available.constants'

/**
 * This is the unparsed options list coming from angular-schematics
 */
export interface Schema extends BaseSchema, CommonPropertiesToSaveAndUse<true> {
  skipInstall?: boolean
  skipGit?: boolean
  commit?: { name: string, email: string, message?: string }
}

/**
 * This is the parsed options after normalizing options.
 * It can not extend the default schema because types are different after parsed
 */
export interface NormalizedSchema extends Schema, BaseNormalizedSchemaRoot, BaseNormalizedSchemaPackageScope {
  enum: CommonPropertiesToSaveAndUse

  deps: PackageVersions['deps']
  devDeps: PackageVersions['devDeps']
}

interface CommonPropertiesToSaveAndUse<Values extends boolean = false> {
  cli: Values extends true ? AvailableCLIs : typeof AvailableCLIs
  layout: Values extends true ? AvailableFolderStructures : typeof AvailableFolderStructures
}
