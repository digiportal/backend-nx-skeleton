import type { Rule, Tree } from '@angular-devkit/schematics'

import type { NxBuildersWorkspaceIntegration } from './nx-builders.interface'
import { readNxJsonIntegration, updateNxJsonIntegrationRule } from '@digiportal/nx-tools'

/**
 * Reads the nx builders integration part of the nx.json.
 */
export function readNxBuildersWorkspaceIntegration (host: Tree): NxBuildersWorkspaceIntegration {
  return readNxJsonIntegration<NxBuildersWorkspaceIntegration>(host)
}

export function updateNxBuildersWorkspaceIntegrationRule (host: Tree, integration: NxBuildersWorkspaceIntegration['nxBuilders']): Rule {
  return updateNxJsonIntegrationRule<NxBuildersWorkspaceIntegration>(host, { nxBuilders: integration })
}
