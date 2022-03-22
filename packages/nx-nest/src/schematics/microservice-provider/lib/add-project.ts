import { normalize } from '@angular-devkit/core'
import type { Rule } from '@angular-devkit/schematics'
import { join } from 'path'

import type { NormalizedSchema } from '../main.interface'
import { createWorkspaceProjectRule, generateProjectLintTarget, NxProjectTypes } from '@digiportal/nx-tools'

export function addProject (options: NormalizedSchema): Rule {
  // we dont need to enforce types here, since it is only going to be linting
  const targets: Record<string, any> = {}

  targets.lint = generateProjectLintTarget(options)

  const project = {
    root: normalize(options.root),
    sourceRoot: join(normalize(options.root), options.sourceRoot),
    projectType: NxProjectTypes.LIB,
    targets
  }

  return createWorkspaceProjectRule(options.name, project)
}
