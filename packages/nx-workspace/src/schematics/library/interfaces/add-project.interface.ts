import type { RunBuilderOptions, TscBuilderOptions } from '@digiportal/nx-builders'

/**
 * Interface setting builder settings
 */
export interface SchematicTargets {
  [key: string]: any

  build?: {
    executor: '@digiportal/nx-builders:tsc'
    options: TscBuilderOptions
  }

  serve?: {
    executor: '@digiportal/nx-builders:tsc'
    options: TscBuilderOptions
  }

  test?: {
    executor: '@digiportal/nx-builders:run'
    options: Partial<RunBuilderOptions>
    configurations?: Record<PropertyKey, Partial<RunBuilderOptions>>
  }
}
