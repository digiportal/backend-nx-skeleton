import type { Versions } from './versions.interface'
import { LINTER_VERSIONS } from '@digiportal/nx-tools'
import { AvailableCLIs } from '@interfaces/available.constants'

export const VERSIONS: Versions = {
  base: {
    default: {
      devDeps: {
        '@nrwl/cli': '^13.4.6',
        '@nrwl/workspace': '^13.4.6',
        '@nrwl/tao': '^13.4.6',
        '@angular-devkit/architect': '^0.1302.0',
        '@angular-devkit/core': '^13.2.0',
        '@angular-devkit/schematics': '^13.2.0',
        '@digiportal/nx-workspace': '^4.0.0',
        '@digiportal/nx-tools': '^5.0.5',
        typescript: '^4.5.5',
        '@types/node': '^16',
        dotenv: '^14.2.0',
        prettier: '^2.5.1',
        '@nrwl/jest': '^13.4.6',
        '@nrwl/linter': '^13.4.6',
        'lint-staged': '^11',
        'simple-git-hooks': '^2.7.0',
        ...LINTER_VERSIONS.eslint.dependencies,
        ...LINTER_VERSIONS.eslint.devDependencies
      }
    }
  },

  [AvailableCLIs.NX]: {
    devDeps: {}
  }
}
