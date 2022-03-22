import { CommandFactory } from 'nest-commander'

import { createCommandModule } from './command.module'
import { LoggerService } from '@digiportal/nestjs-util'

export async function createApplication(): Promise<void> {
  await CommandFactory.run(createCommandModule(), new LoggerService())
}
