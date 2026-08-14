import {
  BadRequestException,
  ExecutionContext,
  NotFoundException,
} from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { ApiExceptionFilter } from './api-exception.filter';
import { ApiResponseInterceptor } from './api-response.interceptor';

function httpContext(
  request: Record<string, unknown>,
  response: Record<string, jest.Mock>,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
      getNext: jest.fn(),
    }),
  } as unknown as ExecutionContext;
}

describe('API envelope', () => {
  it('wraps successful controller data without changing the payload', async () => {
    const interceptor = new ApiResponseInterceptor<{ id: string }>();
    const context = httpContext(
      { originalUrl: '/api/v1/products', url: '/products' },
      {},
    );
    const result = await lastValueFrom(
      interceptor.intercept(context, { handle: () => of({ id: 'p-1' }) }),
    );

    expect(result).toEqual({
      success: true,
      data: { id: 'p-1' },
      meta: {
        requestId: expect.any(String),
        timestamp: expect.any(String),
        path: '/api/v1/products',
      },
    });
  });

  it('serializes a client exception with a stable error envelope', () => {
    const filter = new ApiExceptionFilter();
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const context = httpContext(
      { originalUrl: '/api/v1/products', url: '/products' },
      response,
    );

    filter.catch(new BadRequestException('Invalid product'), context);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'HTTP_400',
        message: 'Invalid product',
      },
      meta: {
        requestId: expect.any(String),
        timestamp: expect.any(String),
        path: '/api/v1/products',
      },
    });
  });

  it('does not expose internal exception details', () => {
    const filter = new ApiExceptionFilter();
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const context = httpContext(
      { originalUrl: '/api/v1/internal', url: '/internal' },
      response,
    );

    filter.catch(new Error('database password leaked'), context);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: { code: 'HTTP_500', message: 'Internal server error' },
      }),
    );
    expect(response.json.mock.calls[0][0].error.message).not.toContain(
      'database password',
    );
  });

  it('supports custom HTTP error bodies without leaking server errors', () => {
    const filter = new ApiExceptionFilter();
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const context = httpContext(
      { originalUrl: '/api/v1/missing', url: '/missing' },
      response,
    );

    filter.catch(
      new NotFoundException({
        code: 'PRODUCT_NOT_FOUND',
        message: 'Product not found',
        details: { id: 'p-1' },
      }),
      context,
    );

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found',
          details: { id: 'p-1' },
        },
      }),
    );
  });
});
