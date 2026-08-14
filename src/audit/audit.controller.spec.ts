import { ForbiddenException } from '@nestjs/common';
import { AuditController } from './audit.controller';

describe('AuditController', () => {
  it('lists audit logs for the current tenant', async () => {
    const service = { findLogs: jest.fn().mockResolvedValue([]) };
    const controller = new AuditController(service as never);
    await expect(controller.findLogs('tenant-1', { user: { tenantId: 'tenant-1' } } as any)).resolves.toEqual([]);
    expect(service.findLogs).toHaveBeenCalledWith('tenant-1');
  });

  it('rejects a foreign tenant audit log request', async () => {
    const service = { findLogs: jest.fn() };
    const controller = new AuditController(service as never);
    await expect(controller.findLogs('tenant-1', { user: { tenantId: 'tenant-2' } } as any)).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.findLogs).not.toHaveBeenCalled();
  });
});
