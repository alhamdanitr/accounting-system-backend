import { AuditAction } from '@prisma/client';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  it('creates a tenant-scoped audit log with optional context', async () => {
    const prisma = { auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) } };
    const service = new AuditService(prisma as never);
    const result = await service.log({
      tenantId: '11111111-1111-4111-8111-111111111111',
      userId: 'user-1',
      deviceId: 'device-1',
      action: AuditAction.CREATE,
      entity: 'Product',
      entityId: 'product-1',
      before: '{}',
      after: '{"name":"Updated"}',
    });
    expect(result).toEqual({ id: 'audit-1' });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ tenantId: '11111111-1111-4111-8111-111111111111', action: AuditAction.CREATE, entity: 'Product' }),
    });
  });

  it('lists no more than 200 logs for the requested tenant', async () => {
    const prisma = { auditLog: { findMany: jest.fn().mockResolvedValue([]) } };
    const service = new AuditService(prisma as never);
    await expect(service.findLogs('11111111-1111-4111-8111-111111111111')).resolves.toEqual([]);
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
      where: { tenantId: '11111111-1111-4111-8111-111111111111' },
      include: { user: true, device: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  });
});
