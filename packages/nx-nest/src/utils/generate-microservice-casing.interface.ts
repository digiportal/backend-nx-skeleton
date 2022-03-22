import type { GeneratedNameCases } from '@digiportal/nx-tools'

export interface GeneratedMicroserviceCasing {
  name: string
  casing: GeneratedNameCases
  names: Record<'queue' | 'file' | 'pattern' | 'interface' | 'default', string>
}
