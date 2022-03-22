import type { VersionsMap } from '@digiportal/nx-tools'
import type { AvailableBuilders } from '@interfaces/available.constants'

export type Versions = VersionsMap<Partial<AvailableBuilders>, never>
