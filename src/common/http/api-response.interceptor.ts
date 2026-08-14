import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiMeta, ApiSuccessResponse } from './api-response';

@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiSuccessResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse<T>> {
    const request = context
      .switchToHttp()
      .getRequest<{
        method: string;
        originalUrl?: string;
        url: string;
        id?: string;
      }>();
    const requestId = request.id ?? randomUUID();
    const meta: ApiMeta = {
      requestId,
      timestamp: new Date().toISOString(),
      path: request.originalUrl ?? request.url,
    };

    return next.handle().pipe(
      map((data) => ({
        success: true as const,
        data,
        meta,
      })),
    );
  }
}
