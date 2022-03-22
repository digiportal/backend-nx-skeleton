import type { BaseIntegration } from '@digiportal/nx-tools'
import type { NormalizedSchema as ApplicationNormalizedSchema } from '@schematics/application/main.interface'
import type { NormalizedSchema as BackendInterfacesNormalizedSchema } from '@schematics/backend-interfaces/main.interface'
import type { NormalizedSchema as MicroserviceProviderNormalizedSchema } from '@schematics/microservice-provider/main.interface'

export type NxNestProjectIntegration = BaseIntegration<{
  nestjs: ApplicationNormalizedSchema['priorConfiguration']
  backendInterfaces: BackendInterfacesNormalizedSchema['priorConfiguration']
  microserviceProvider: MicroserviceProviderNormalizedSchema['priorConfiguration']
}>
