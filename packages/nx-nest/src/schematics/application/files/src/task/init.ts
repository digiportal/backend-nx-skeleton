import { NestFactory } from '@nestjs/core'

import { createTaskModule } from './task.module'
import { LoggerService } from '@digiportal/nestjs-util'

export async function createApplication(): Promise<void> {
  await NestFactory.createApplicationContext(createTaskModule(), {
    logger: new LoggerService()
  })
}
