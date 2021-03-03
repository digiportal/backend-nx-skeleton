/* eslint-disable no-underscore-dangle */
import { BaseCommand } from '@cenk1cenk2/boilerplate-oclif'
import { flags as Flags } from '@oclif/command'
import { IBooleanFlag, IOptionFlag } from '@oclif/parser/lib/flags'
import fs from 'fs-extra'
import { getAppRootPath } from 'patch-package/dist/getAppRootPath'
import { getPackageDetailsFromPatchFilename } from 'patch-package/dist/PackageDetails'
import { packageIsDevDependency } from 'patch-package/dist/packageIsDevDependency'
import { join, resolve, isAbsolute } from 'path'
import rewire from 'rewire'
import tmp from 'tmp-promise'

import { ApplicationConfiguration } from '@src/interfaces/config.interface'

export class PatchCommand extends BaseCommand<ApplicationConfiguration> {
  static description = 'Patches or reserves given patches in a directory.'
  static flags: Record<'path' | 'directory', IOptionFlag<string>> & Record<'exitOnError' | 'reverse', IBooleanFlag<boolean>> & Record<'limit', IOptionFlag<string[]>> = {
    directory: Flags.string({
      char: 'd',
      description: 'Directory to apply the patches from.'
    }),
    path: Flags.string({
      char: 'p',
      description: 'Directory to apply patches to.',
      default: getAppRootPath()
    }),
    limit: Flags.string({
      char: 'l',
      description: 'Limit the patches to the given variables.',
      multiple: true
    }),
    exitOnError: Flags.boolean({
      char: 'e',
      description: 'Whether to exit on error if the patching process fails or not.',
      default: false
    }),
    reverse: Flags.boolean({
      char: 'r',
      description: 'Reverses the patches, if they were applied before.',
      default: false
    })
  }

  private temp: tmp.DirectoryResult
  private rewire: Record<
  | 'getInstalledPackageVersion'
  | 'createVersionMismatchWarning'
  | 'createBrokenPatchFileError'
  | 'createPatchApplictionFailureError'
  | 'createUnexpectedError'
  | 'PatchApplicationError'
  | 'findPatchFiles'
  | 'applyPatch',
  any
  > = {} as any

  public async construct (): Promise<void> {
    // since the underlying application is not exposing any of these methods, run time rewire is required
    this.logger.debug('Rewiring underlying module...')

    const applyPatches = rewire('patch-package/dist/applyPatches')

    await Promise.all(
      [
        'getInstalledPackageVersion',
        'createVersionMismatchWarning',
        'createBrokenPatchFileError',
        'createPatchApplictionFailureError',
        'createUnexpectedError',
        'PatchApplicationError',
        'findPatchFiles',
        'applyPatch'
      ].map(async (method) => {
        this.rewire[method] = applyPatches.__get__(method)
      })
    )
  }

  public async run (): Promise<void> {
    // get arguments
    const { flags } = this.parse(PatchCommand)

    // set default arguments
    flags.directory = flags.directory
      ? isAbsolute(flags.directory)
        ? flags.directory
        : join(getAppRootPath(), flags.directory)
      : join(this.config.root, this.constants.patchesDir)

    this.logger.module(`${flags.reverse ? 'Reversing' : 'Applying'} patches to path: %s`, flags.path)

    this.logger.info('Importing patches from directory: %s', flags.directory)

    if (flags?.limit?.length > 0) {
      // check for missing patches when limited to
      const missingPatches = []
      await Promise.all(
        flags.limit.map(async (patch) => {
          const path = join(flags.directory, `${patch}.patch`)

          try {
            const stat = await fs.stat(path)

            if (!stat.isFile()) {
              throw new Error('Is not a file.')
            }
          } catch (err) {
            this.logger.debug(`Missing file ${path}: %s`, err.message)

            missingPatches.push(patch)
          }
        })
      )

      if (missingPatches.length > 0) {
        this.logger.fatal(`Some of the patches you limit to is not appropirate: ${missingPatches.join(', ')}`)

        process.exit(127)
      }

      // create temporary directory and move the patches there
      this.temp = await tmp.dir({ unsafeCleanup: true })
      this.logger.debug('Created a temporary directory: %s', this.temp.path)

      // move limited patches to the temporary directory
      this.logger.info('Limitting patches: %s', flags.limit.join(', '))

      await Promise.all(
        flags.limit.map(async (patch) => {
          const path = join(flags.directory, `${patch}.patch`)

          await fs.copyFile(path, join(this.temp.path, `${patch}.patch`))
        })
      )

      // set patch directory to temporary directory
      flags.directory = this.temp.path
    }

    this.logger.debug('Final patch directory: %s', flags.directory)

    // apply patches
    this.applyPatchesForApp({
      appPath: flags?.path,
      reverse: flags?.reverse,
      patchDir: flags.directory,
      shouldExitWithError: flags?.exitOnError
    })

    if (this.temp) {
      this.logger.debug('Cleaning up temporary directory: %s', this.temp.path)

      await this.temp.cleanup()
    }
  }

  private async applyPatchesForApp ({ appPath,
    reverse,
    patchDir,
    shouldExitWithError }: {
    appPath: string
    reverse: boolean
    patchDir: string
    shouldExitWithError: boolean
  }): Promise<void> {
    const files: string[] = this.rewire.findPatchFiles(patchDir)

    if (files.length === 0) {
      this.logger.fatal('No patch files found.')

      return
    }

    const errors: string[] = []
    const warnings: string[] = []

    await Promise.all(
      files.map(async (filename) => {
        try {
          const packageDetails = getPackageDetailsFromPatchFilename(filename)

          if (!packageDetails) {
            errors.push(`Unrecognized patch file in patches directory: ${filename}`)

            return
          }

          const { name, version, path, pathSpecifier, isDevOnly, patchFilename } = packageDetails

          const installedPackageVersion = this.rewire.getInstalledPackageVersion({
            appPath,
            path,
            pathSpecifier,
            isDevOnly:
              isDevOnly ||
              // check for direct-dependents in prod
              process.env.NODE_ENV === 'production' && packageIsDevDependency({ appPath, packageDetails }),
            patchFilename
          })

          if (!installedPackageVersion) {
            // it's ok we're in production mode and this is a dev only package
            this.logger.warn(`Skipping dev-only: ${pathSpecifier}@${version}`)

            return
          }

          if (
            this.rewire.applyPatch({
              patchFilePath: resolve(patchDir, filename) as string,
              reverse,
              packageDetails,
              patchDir
            })
          ) {
            // yay patch was applied successfully
            // print warning if version mismatch
            if (installedPackageVersion !== version) {
              warnings.push(
                this.rewire.createVersionMismatchWarning({
                  packageName: name,
                  actualVersion: installedPackageVersion,
                  originalVersion: version,
                  pathSpecifier,
                  path
                })
              )
            }

            this.logger.success(`${pathSpecifier}@${version}`)
          } else if (installedPackageVersion === version) {
            // completely failed to apply patch
            // TODO: propagate useful error messages from patch application
            errors.push(
              this.rewire.createBrokenPatchFileError({
                packageName: name,
                patchFileName: filename,
                pathSpecifier,
                path
              })
            )
          } else {
            errors.push(
              this.rewire.createPatchApplictionFailureError({
                packageName: name,
                actualVersion: installedPackageVersion,
                originalVersion: version,
                patchFileName: filename,
                path,
                pathSpecifier
              })
            )
          }
        } catch (error) {
          if (error instanceof this.rewire.PatchApplicationError) {
            errors.push(error.message)
          } else {
            errors.push(this.rewire.createUnexpectedError({ filename, error }))
          }
        }
      })
    )

    for (const warning of warnings) {
      this.logger.warn(warning)
    }

    for (const error of errors) {
      this.logger.fail(error)
    }

    this.logger.module('Finished execution.')

    if (warnings.length) {
      this.logger.warn(`${warnings.length} warning(s).`)
    }

    if (errors.length) {
      this.logger.fatal(`${errors.length} error(s).`)
      process.exit(shouldExitWithError ? 1 : 0)
    }
  }
}
