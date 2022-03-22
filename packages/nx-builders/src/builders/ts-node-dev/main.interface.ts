import type { EnvironmentVariables } from '@digiportal/nx-tools'

/**
 * Options for ts-node-dev
 */
export interface TsNodeBuilderOptions {
  /**
   * process current working directory
   *
   * this will spawn the process from the current working directory so most of the plugins will work as expected
   */
  cwd: string

  /** entrypoint for the application which ts-node will run */
  main: string

  /**
   * tsconfig file that is used
   * will default to tsconfig.json
   */
  tsConfig?: string

  /** ts-node-dev debounce in ms */
  debounce?: number

  /** ts-node-dev interval in ms */
  interval?: number

  /** node debug port enable */
  debug?: boolean

  /** inspect port that should be opened when debugging */
  inspect?: number

  /** environment variables */
  environment?: EnvironmentVariables
}
