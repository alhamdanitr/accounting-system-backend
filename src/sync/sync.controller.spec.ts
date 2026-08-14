import { ForbiddenException } from '@nestjs/common';
import { SyncController } from './sync.controller';

describe('SyncController', () => {
  const request = { user: { tenantId: 'tenant-1', deviceId: 'device-1' } } as any;

  it('delegates push and pull with verified device identity', async () => {
    const service = { pushOperations: jest.fn().mockResolvedValue({ accepted: 1 }), pullOperations: jest.fn().mockResolvedValue({ operations: [] }) };
    const controller = new SyncController(service as never);
    const dto = { tenantId: 'tenant-1', deviceId: 'device-1', operations: [] } as any;
    await expect(controller.pushOperations(dto, request)).resolves.toEqual({ accepted: 1 });
    await expect(controller.pullOperations('tenant-1', 'device-1', 'cursor-1', '25', request)).resolves.toEqual({ operations: [] });
    expect(service.pushOperations).toHaveBeenCalledWith(dto);
    expect(service.pullOperations).toHaveBeenCalledWith('tenant-1', 'device-1', 'cursor-1', 25);
  });

  it('rejects tenant or device mismatches before service calls', async () => {
    const service = { pushOperations: jest.fn(), pullOperations: jest.fn() };
    const controller = new SyncController(service as never);
    await expect(controller.pushOperations({ tenantId: 'tenant-2', deviceId: 'device-1' } as any, request)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.pullOperations('tenant-1', 'device-2', undefined, undefined, request)).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.pushOperations).not.toHaveBeenCalled();
    expect(service.pullOperations).not.toHaveBeenCalled();
  });
});
