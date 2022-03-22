import type { EnvironmentVariables } from '@digiportal/nx-tools'

/**
 * Options for execute
 */
export interface ExecuteBuilderOptions {
  /**
   * Run the command in a working directory
   */
  cwd?: string
  /**
   * The target to build before starting the process
   */
  buildTarget: string
  /**
   * Run after the tasks has been finished building
   */
  runAfter?: string
  /**
   * Wait until targets to finish before executing
   */
  waitUntilTargets?: string[]
  /**
   * Watch parameter for passing in to the target
   */
  watch?: boolean
  /**
   * inject schematic options to the target
   */
  inject?: Record<string, any>
  /**
   * keep alive the process
   */
  keepAlive?: boolean
  /**
   * Inject env variables to the run after build
   */
  environment?: EnvironmentVariables
}

export type NormalizedExecuteBuilderOptions = ExecuteBuilderOptions
