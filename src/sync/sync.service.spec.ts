import { SyncOperationStatus } from '@prisma/client';
import { SyncService } from './sync.service';

describe('SyncService', () => {
  const prisma = {
    device: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    syncOperation: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    product: { findFirst: jest.fn() },
    customer: { findFirst: jest.fn() },
    purchase: { findFirst: jest.fn() },
  } as any;
  const productsService = { createProduct: jest.fn() } as any;
  const salesService = { createCustomer: jest.fn(), createSale: jest.fn() } as any;
  const purchasesService = { createPurchase: jest.fn() } as any;
  let service: SyncService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SyncService(prisma, productsService, salesService, purchasesService);
    prisma.device.findFirst.mockResolvedValue({ id: 'device-1' });
    prisma.device.update.mockResolvedValue(undefined);
  });

  it('applies a customer create operation and returns SYNCED', async () => {
    prisma.syncOperation.findUnique.mockResolvedValue(null);
    prisma.syncOperation.create.mockResolvedValue({ id: 'op-1', sequence: 7n });
    prisma.syncOperation.update
      .mockResolvedValueOnce({ id: 'op-1' })
      .mockResolvedValueOnce({ id: 'op-1', sequence: 7n, status: SyncOperationStatus.SYNCED });
    prisma.customer.findFirst.mockResolvedValue(null);

    const result = await service.pushOperations({
      tenantId: 'tenant-1',
      deviceId: 'device-1',
      operations: [{
        idempotencyKey: 'operation-1',
        entityType: 'CUSTOMER',
        entityId: '11111111-1111-4111-8111-111111111111',
        operationType: 'CREATE',
        payload: JSON.stringify({ name: 'عميل اختباري' }),
      }],
    });

    expect(result.success).toBe(true);
    expect(salesService.createCustomer).toHaveBeenCalledWith(expect.objectContaining({
      id: '11111111-1111-4111-8111-111111111111',
      tenantId: 'tenant-1',
      name: 'عميل اختباري',
    }));
  });

  it('applies a purchase create operation through the central purchases service', async () => {
    prisma.syncOperation.findUnique.mockResolvedValue(null);
    prisma.syncOperation.create.mockResolvedValue({ id: 'op-purchase', sequence: 9n });
    prisma.syncOperation.update
      .mockResolvedValueOnce({ id: 'op-purchase' })
      .mockResolvedValueOnce({ id: 'op-purchase', sequence: 9n, status: SyncOperationStatus.SYNCED });
    prisma.purchase.findFirst.mockResolvedValue(null);

    const result = await service.pushOperations({
      tenantId: 'tenant-1',
      deviceId: 'device-1',
      operations: [{
        idempotencyKey: 'operation-purchase-1',
        entityType: 'PURCHASE',
        entityId: '11111111-1111-4111-8111-111111111114',
        operationType: 'CREATE',
        payload: JSON.stringify({ warehouseId: 'warehouse-1', items: [] }),
      }],
    });

    expect(result.success).toBe(true);
    expect(purchasesService.createPurchase).toHaveBeenCalledWith(expect.objectContaining({
      id: '11111111-1111-4111-8111-111111111114',
      tenantId: 'tenant-1',
      warehouseId: 'warehouse-1',
    }));
  });

  it('does not reapply an already synced idempotency key', async () => {
    prisma.syncOperation.findUnique.mockResolvedValue({ id: 'op-1', status: SyncOperationStatus.SYNCED });

    const result = await service.pushOperations({
      tenantId: 'tenant-1',
      deviceId: 'device-1',
      operations: [{
        idempotencyKey: 'operation-2',
        entityType: 'CUSTOMER',
        entityId: '11111111-1111-4111-8111-111111111112',
        operationType: 'CREATE',
        payload: JSON.stringify({ name: 'مكرر' }),
      }],
    });

    expect(result.success).toBe(true);
    expect(result.results[0]).toEqual(expect.objectContaining({ duplicate: true, status: SyncOperationStatus.SYNCED }));
    expect(salesService.createCustomer).not.toHaveBeenCalled();
  });

  it('marks unsupported operations as FAILED instead of falsely syncing them', async () => {
    prisma.syncOperation.findUnique.mockResolvedValue(null);
    prisma.syncOperation.create.mockResolvedValue({ id: 'op-2', sequence: 8n });
    prisma.syncOperation.update.mockResolvedValue({ id: 'op-2', status: SyncOperationStatus.FAILED });

    const result = await service.pushOperations({
      tenantId: 'tenant-1',
      deviceId: 'device-1',
      operations: [{
        idempotencyKey: 'operation-3',
        entityType: 'SALE',
        entityId: '11111111-1111-4111-8111-111111111113',
        operationType: 'CREATE',
        payload: JSON.stringify({}),
      }],
    });

    expect(result.success).toBe(false);
    expect(result.results[0]).toEqual(expect.objectContaining({ status: SyncOperationStatus.FAILED, retryable: true }));
  });

  it('pulls operations after cursor and returns the next cursor', async () => {
    prisma.syncOperation.findMany.mockResolvedValue([
      { id: 'op-3', sequence: 12n },
      { id: 'op-4', sequence: 13n },
    ]);

    const result = await service.pullOperations('tenant-1', 'device-1', '11', 2);

    expect(result.nextCursor).toBe('13');
    expect(result.hasMore).toBe(true);
    expect(prisma.syncOperation.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ sequence: { gt: 11n } }),
      take: 2,
    }));
  });
});
