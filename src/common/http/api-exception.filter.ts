import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Request, Response } from 'express';
import { ApiErrorResponse, ApiMeta } from './api-response';

interface HttpErrorBody {
  message?: string | string[];
  error?: string;
  code?: string;
  details?: unknown;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request & { id?: string }>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const body = this.normalizeBody(exceptionResponse);
    const isServerError = status >= HttpStatus.INTERNAL_SERVER_ERROR;
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        code: body.code ?? this.defaultCode(status),
        message: isServerError
          ? 'Internal server error'
          : this.normalizeMessage(
              body.message ?? body.error ?? 'Request failed',
            ),
        ...(isServerError
          ? {}
          : body.details === undefined
            ? {}
            : { details: body.details }),
      },
      meta: this.meta(request),
    };

    response.status(status).json(errorResponse);
  }

  private normalizeBody(value: string | object | undefined): HttpErrorBody {
    if (typeof value === 'string') return { message: value };
    if (value && typeof value === 'object') return value as HttpErrorBody;
    return {};
  }

  private normalizeMessage(value: string | string[]): string {
    return Array.isArray(value) ? value.join('; ') : value;
  }

  private defaultCode(status: number): string {
    return `HTTP_${status}`;
  }

  private meta(request: Request & { id?: string }): ApiMeta {
    return {
      requestId: request.id ?? randomUUID(),
      timestamp: new Date().toISOString(),
      path: request.originalUrl ?? request.url,
    };
  }
}
