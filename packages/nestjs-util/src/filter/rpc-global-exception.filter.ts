import { ArgumentsHost, Catch, HttpException, Logger, RpcExceptionFilter } from '@nestjs/common'
import { RpcException } from '@nestjs/microservices'
import { throwError } from 'rxjs'

import { EnrichedException } from './exception.interface'
import { GlobalExceptionFilter } from './global-exception.filter'
import { logErrorDebugMsg } from './util'

@Catch(RpcException)
export class RpcGlobalExceptionFilter implements RpcExceptionFilter {
  private logger = new Logger(this.constructor.name)

  public static defaultPayload (exception: RpcException | HttpException, host: ArgumentsHost): EnrichedException {
    return {
      ...GlobalExceptionFilter.defaultPayload(exception),
      service: host
        .switchToRpc()
        .getContext()
        .args.map((args) => args.fields.routingKey)
    }
  }

  public catch (exception: RpcException | HttpException, host: ArgumentsHost): any {
    const payload = this.payload(exception, host)

    logErrorDebugMsg(this.logger, payload, exception.stack)

    return throwError(payload)
  }

  protected payload (exception: RpcException | HttpException, host: ArgumentsHost): EnrichedException {
    return RpcGlobalExceptionFilter.defaultPayload(exception, host)
  }
}