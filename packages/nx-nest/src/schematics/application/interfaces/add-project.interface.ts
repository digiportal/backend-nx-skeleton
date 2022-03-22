import type { RunBuilderOptions, TscBuilderOptions, TsNodeBuilderOptions } from '@digiportal/nx-builders'

/**
 * Interface setting builder settings
 */
export interface SchematicTargets {
  [key: string]: any

  build: {
    executor: '@digiportal/nx-builders:tsc'
    options: TscBuilderOptions
  }

  serve: {
    executor: '@digiportal/nx-builders:ts-node-dev'
    options: TsNodeBuilderOptions
  }

  bgtask?: {
    executor: '@digiportal/nx-builders:ts-node-dev'
    options: TsNodeBuilderOptions
  }

  migration?: {
    executor: '@digiportal/nx-builders:run'
    options: Partial<RunBuilderOptions>
    configurations?: Record<PropertyKey, Partial<RunBuilderOptions>>
  }

  command?: {
    executor: '@digiportal/nx-builders:run'
    options: Partial<RunBuilderOptions>
  }

  seed?: {
    executor: '@digiportal/nx-builders:run'
    options: Partial<RunBuilderOptions>
  }

  test?: {
    executor: '@digiportal/nx-builders:run'
    options: Partial<RunBuilderOptions>
    configurations?: Record<PropertyKey, Partial<RunBuilderOptions>>
  }
}
