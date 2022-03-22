import type { AvailableTestsTypes, VersionsMap } from '@digiportal/nx-tools'
import type { AvailableComponents, AvailableDBAdapters, AvailableDBTypes, AvailableMicroserviceTypes, AvailableServerTypes } from '@interfaces/available.constants'

export type Versions = VersionsMap<
Exclude<AvailableComponents, AvailableComponents.SERVER> | AvailableServerTypes | AvailableDBTypes | AvailableDBAdapters | AvailableTestsTypes | AvailableMicroserviceTypes,
'default' | 'microservice' | 'builder'
>
