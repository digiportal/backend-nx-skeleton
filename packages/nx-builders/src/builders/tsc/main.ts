/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect'
import { fs } from '@angular-devkit/core/node'
import { readJsonFile } from '@nrwl/workspace'
import { readPackageJson } from '@nrwl/workspace/src/core/file-utils'
import { createProjectGraph, ProjectGraph, ProjectGraphNode } from '@nrwl/workspace/src/core/project-graph'
import {
  calculateProjectDependencies,
  checkDependentProjectsHaveBeenBuilt,
  createTmpTsConfig,
  DependentBuildableProjectNode,
  updateBuildableProjectPackageJsonDependencies
} from '@nrwl/workspace/src/utils/buildable-libs-utils'
import { writeJsonFile } from '@nrwl/workspace/src/utils/fileutils'
import { createDependenciesForProjectFromGraph, ExecaArguments, Logger, mergeDependencies, pipeProcessToLogger, ProcessManager } from '@webundsoehne/nx-tools'
import { SpawnOptions } from 'child_process'
import merge from 'deepmerge'
import execa from 'execa'
import { copy, removeSync } from 'fs-extra'
import glob from 'glob'
import { basename, dirname, join, normalize, relative } from 'path'
import { Observable, of, Subscriber } from 'rxjs'
import { map, switchMap } from 'rxjs/operators'

import { FileInputOutput, NodePackageBuilderOptions, NormalizedBuilderOptions, ProcessPaths } from './main.interface'

export function runBuilder (options: NodePackageBuilderOptions, context: BuilderContext) {
  const { dependencies } = calculateProjectDependencies(createProjectGraph(), context)

  return of(checkDependentProjectsHaveBeenBuilt(context, dependencies)).pipe(
    switchMap((result) => {
      if (result) {
        const builder = new Builder(options, context)
        return builder.compileFiles()
      } else {
        return of({ success: false })
      }
    }),
    map((value) => {
      return value
    })
  )
}

// i converted this to a class since it makes not to much sense to have seperate functions with tons of same inputs
class Builder {
  private logger: Logger
  private projectGraph: ProjectGraph
  private projectTarget: ProjectGraphNode<Record<string, unknown>>
  private projectDependencies: DependentBuildableProjectNode[]
  private options: NormalizedBuilderOptions
  private paths: ProcessPaths
  private manager: ProcessManager

  constructor (options: NodePackageBuilderOptions, private context: BuilderContext) {
    this.logger = new Logger(context)

    // create dependency
    this.projectGraph = createProjectGraph()
    const { target, dependencies } = calculateProjectDependencies(this.projectGraph, context)
    this.projectTarget = target
    this.projectDependencies = dependencies

    // normalize options
    this.options = this.normalizeOptions(options)

    // create a process manager
    this.manager = new ProcessManager(this.context)
  }

  public compileFiles (): Observable<BuilderOutput> {

    // Cleaning the /dist folder
    removeSync(this.options.normalizedOutputPath)

    // paths of the programs, more convient than using the api since tscpaths does not have api
    this.paths = {
      typescript: require.resolve('typescript/bin/tsc'),
      tscpaths: require.resolve('tscpaths/cjs/index'),
      tscWatch: require.resolve('tsc-watch/lib/tsc-watch'),
      tsconfig: join(this.context.workspaceRoot, this.options.tsConfig)
    }

    // have to return a observable here
    return Observable.create(
      async (subscriber: Subscriber<BuilderOutput>): Promise<void> => {
        // stop all manager tasks
        await this.manager.stop()

        const libRoot = this.projectGraph.nodes[this.context.target.project].data.root
        if (this.projectDependencies.length > 0) {
          this.paths.tsconfig = createTmpTsConfig(this.paths.tsconfig, this.context.workspaceRoot, libRoot, this.projectDependencies)
        }
        this.paths.tsconfigPaths = `${dirname(this.paths.tsconfig)}/${basename(this.paths.tsconfig, '.json')}.paths.json`

        try {

          // check if needed tools are really installed
          Object.entries(this.paths).forEach(([ key, value ]) => {
            if (![ 'tsconfigPaths' ].includes(value) && !fs.isFile(value)) {
              throw new Error(`Binary for application not found: ${key}`)
            }
          })

          if (this.options.watch) {
          // TODO: This part is not working as intended atm
            this.logger.info('Starting TypeScript-Watch...')

            this.logger.debug(`tsc-watch path: ${this.paths.tscWatch}`)

            const { args, spawnOptions } = this.normalizeArguments('tsc-watch')

            const instance = this.manager.addPersistent(execa.node(this.paths.tscWatch, args, spawnOptions))

            instance.on('message', async (msg: 'first_success' | 'success' | 'compile_errors') => {
              switch (msg) {
              case 'success':

                await this.secondaryCompileActions()

                if (this.options.runAfterWatch) {
                  await this.manager.kill()
                  const subInstance = this.manager.add(execa.command(this.options.runAfterWatch, this.normalizeArguments('runAfterWatch').spawnOptions))

                  // we dont want errors from this since it can be killed
                  try {
                    await pipeProcessToLogger(this.context, subInstance)
                  } catch (e) {
                    this.logger.debug(e.message)
                  }

                } else {

                  this.logger.warn('No option for "runAfterWatch" is defined for package. Doing nothing.')

                }

                break
              default:
                break
              }
            })

            await pipeProcessToLogger(this.context, instance)
          } else {
          // the normal mode of compiling
            this.logger.info('Transpiling TypeScript files...')

            this.logger.debug(`typescript path: ${this.paths.typescript}`)

            const { args, spawnOptions } = this.normalizeArguments('typescript')

            const instance = this.manager.addPersistent(execa.node(this.paths.typescript, args, spawnOptions))

            await pipeProcessToLogger(this.context, instance)

            this.logger.info('Transpiling to TypeScript is done.')

            // perform secondary actions
            await this.secondaryCompileActions()
          }

          subscriber.next({ success: true, outputPath: this.options.normalizedOutputPath })
        } catch (error) {
          subscriber.error(new Error(`Could not compile Typescript files:\n${error}`))
        } finally {
          // clean up the zombies!
          await this.manager.stop()
          subscriber.complete()
        }
      }
    )
  }

  protected normalizeOptions (options: NodePackageBuilderOptions): NormalizedBuilderOptions {

    const outDir = options.outputPath
    const files: FileInputOutput[] = []

    const globbedFiles = (pattern: string, input = '', ignore: string[] = []): string[] => {
      return glob.sync(pattern, {
        cwd: input,
        nodir: true,
        ignore
      })
    }

    options.assets.forEach((asset) => {
      if (typeof asset === 'string') {
        globbedFiles(asset, this.context.workspaceRoot).forEach((globbedFile) => {
          files.push({
            input: join(this.context.workspaceRoot, globbedFile),
            output: join(this.context.workspaceRoot, outDir, basename(globbedFile))
          })
        })
      } else {
        globbedFiles(asset.glob, join(this.context.workspaceRoot, asset.input), asset.ignore).forEach((globbedFile) => {
          files.push({
            input: join(this.context.workspaceRoot, asset.input, globbedFile),
            output: join(this.context.workspaceRoot, outDir, asset.output, globbedFile)
          })
        })
      }
    })

    // Relative path for the dist directory
    const tsconfig = readJsonFile(join(this.context.workspaceRoot, options.tsConfig))
    const rootDir = tsconfig.compilerOptions?.rootDir || ''
    const mainFileDir = dirname(options.main)
    const tsconfigDir = dirname(options.tsConfig)

    const relativeMainFileOutput = relative(`${tsconfigDir}/${rootDir}`, mainFileDir)

    return {
      ...options,
      files,
      relativeMainFileOutput,
      normalizedOutputPath: join(this.context.workspaceRoot, options.outputPath)
    }
  }

  private async secondaryCompileActions () {
    return Promise.all([ this.swapPaths(), this.updatePackageJson(), this.copyAssetFiles() ])
  }

  private normalizeArguments (mode?: 'typescript' | 'tscpaths' | 'tsc-watch' | 'runAfterWatch'): ExecaArguments {
    let args: string[]
    let spawnOptions: SpawnOptions
    spawnOptions = { stdio: 'pipe' }

    // set spawn options
    if (mode === 'typescript' || mode === 'tsc-watch') {
      if (this.options.cwd) {
        spawnOptions = { ...spawnOptions, cwd: this.options.cwd }
      }
    } else if (mode === 'tscpaths') {
      spawnOptions = { ...spawnOptions, cwd: this.context.workspaceRoot }

    } else if (mode === 'runAfterWatch') {
      spawnOptions = {
        ...spawnOptions, cwd: this.options.normalizedOutputPath, shell: true
      }

    }

    // set arguments
    if (mode === 'typescript' || mode === 'tsc-watch') {
    // arguments for typescript compiler
      args = [ '-p', this.paths.tsconfig, '--outDir', this.options.normalizedOutputPath ]

      if (this.options.sourceMap) {
        args = [ ...args, '--sourceMap' ]
      }

      if (this.options.verbose) {
        args = [ ...args, '--extendedDiagnostics', '--listEmittedFiles' ]
      }

      if (mode === 'tsc-watch') {
      // it can use the same options with tsc
        args = [ ...args, '--noClear', '--sourceMap' ]
      }
    } else if (mode === 'tscpaths') {
    // arguments for tsc paths
      args = [ '-p', this.paths.tsconfigPaths, '-s', this.options.outputPath, '-o', this.options.outputPath ]

      if (this.options.verbose) {
        args = [ ...args, '--verbose' ]
      }
    }

    return { args, spawnOptions }
  }

  private async swapPaths () {
    // optional swap paths, which will swap all the typescripts to relative paths.
    if (this.options.swapPaths) {
      this.logger.info('Swapping Typescript paths...')

      this.logger.debug(`tscpaths path: ${this.paths.tscpaths}`)

      // create temporary tsconfig.paths
      const tsconfig = readJsonFile(this.paths.tsconfig)

      writeJsonFile(this.paths.tsconfigPaths, merge(tsconfig, { compilerOptions: { baseUrl: join(this.context.workspaceRoot, this.options.outputPath) } }))

      const { args, spawnOptions } = this.normalizeArguments('tscpaths')

      const instance = this.manager.add(execa.node(this.paths.tscpaths, args, spawnOptions))

      // we dont want errors from this it can be sig terminated
      try {
        await pipeProcessToLogger(this.context, instance, { stderr: false, stdout: false })
      } catch (e) {
        this.logger.debug(e)
      }

      this.logger.info('Swapped TypeScript paths.')
    }
  }

  private updatePackageJson () {

    let packageJson = readJsonFile(
      this.options.packageJson ?
        join(this.context.workspaceRoot, this.options.packageJson) :
        join(this.context.workspaceRoot, this.options.cwd, 'package.json')
    )

    if (!packageJson) {
      this.logger.warn('No implicit package.json file found for the package. Skipping.')
      return
    } else {
      this.logger.info('Processing "package.json"...')
    }

    const mainFile = basename(this.options.main, '.ts')
    const globalPackageJson = readPackageJson()

    // update main file and typings
    packageJson = {
      ...packageJson,
      main: normalize(`./${this.options.relativeMainFileOutput}/${mainFile}.js`),
      typings: normalize(`./${this.options.relativeMainFileOutput}/${mainFile}.d.ts`)
    }

    // update implicit dependencies
    const implicitDependencies = {}

    if (packageJson.implicitDependencies) {
      this.logger.info('Processing "package.json "implicit dependencies...')

      Object.entries(packageJson.implicitDependencies).forEach(([ name, version ]) => {
        implicitDependencies[name] = version === true ? globalPackageJson.dependencies[name] : version
      })
    }

    delete packageJson.implicitDependencies

    // update package dependencies
    const project = this.context.target.project
    const graph = createProjectGraph()

    packageJson.dependencies = mergeDependencies(createDependenciesForProjectFromGraph(graph, project), packageJson.dependencies, implicitDependencies)

    // write file back
    writeJsonFile(`${this.options.normalizedOutputPath}/package.json`, packageJson)

    // this is the default behaviour, lets keep this.
    if (this.projectDependencies.length > 0 && this.options.updateBuildableProjectDepsInPackageJson) {
      updateBuildableProjectPackageJsonDependencies(this.context, this.projectTarget, this.projectDependencies)
    }

    this.logger.info('Generated "package.json".')
  }

  private async copyAssetFiles (): Promise<BuilderOutput> {
    this.logger.info('Copying asset files...')

    try {
      await Promise.all(this.options.files.map((file) => {
        this.logger.debug(`Copying "${file.input}" to ${file.output}`)

        return copy(file.input, file.output)
      }))

      this.logger.info('Done copying asset files.')

      return {
        success: true
      }

    } catch (err) {

      return {
        error: err.message,
        success: false
      }

    }
  }
}

export default createBuilder(runBuilder)
