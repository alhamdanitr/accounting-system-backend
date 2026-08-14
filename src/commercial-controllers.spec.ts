import { ForbiddenException } from '@nestjs/common';
import { SalesController } from './sales/sales.controller';
import { PurchasesController } from './purchases/purchases.controller';

describe('commercial controllers', () => {
  const tenantId = 'tenant-1';
  const request = { user: { tenantId, userId: 'user-1' } } as any;

  it('delegates SalesController endpoints and injects session user', async () => {
    const service = {
      createCustomer: jest.fn().mockResolvedValue({ id: 'customer-1' }),
      findCustomers: jest.fn().mockResolvedValue([]),
      createSale: jest.fn().mockResolvedValue({ id: 'sale-1' }),
      findSales: jest.fn().mockResolvedValue([]),
    };
    const controller = new SalesController(service as never);
    const dto = { tenantId, warehouseId: 'warehouse-1' } as any;
    await expect(controller.createCustomer(dto, request)).resolves.toEqual({ id: 'customer-1' });
    await expect(controller.findCustomers(tenantId, request)).resolves.toEqual([]);
    await expect(controller.createSale(dto, request)).resolves.toEqual({ id: 'sale-1' });
    await expect(controller.findSales(tenantId, request)).resolves.toEqual([]);
    expect(service.createSale).toHaveBeenCalledWith({ ...dto, userId: 'user-1' });
  });

  it('rejects SalesController cross-tenant requests', async () => {
    const service = { createCustomer: jest.fn(), findCustomers: jest.fn(), createSale: jest.fn(), findSales: jest.fn() };
    const controller = new SalesController(service as never);
    const foreign = { user: { tenantId: 'tenant-2', userId: 'user-2' } } as any;
    await expect(controller.findSales(tenantId, foreign)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.createSale({ tenantId } as any, foreign)).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.findSales).not.toHaveBeenCalled();
  });

  it('delegates PurchasesController endpoints and injects session user', async () => {
    const service = {
      createSupplier: jest.fn().mockResolvedValue({ id: 'supplier-1' }),
      findSuppliers: jest.fn().mockResolvedValue([]),
      createPurchase: jest.fn().mockResolvedValue({ id: 'purchase-1' }),
      findPurchases: jest.fn().mockResolvedValue([]),
    };
    const controller = new PurchasesController(service as never);
    const dto = { tenantId, warehouseId: 'warehouse-1' } as any;
    await expect(controller.createSupplier(dto, request)).resolves.toEqual({ id: 'supplier-1' });
    await expect(controller.findSuppliers(tenantId, request)).resolves.toEqual([]);
    await expect(controller.createPurchase(dto, request)).resolves.toEqual({ id: 'purchase-1' });
    await expect(controller.findPurchases(tenantId, request)).resolves.toEqual([]);
    expect(service.createPurchase).toHaveBeenCalledWith({ ...dto, userId: 'user-1' });
  });

  it('rejects PurchasesController cross-tenant requests', async () => {
    const service = { createSupplier: jest.fn(), findSuppliers: jest.fn(), createPurchase: jest.fn(), findPurchases: jest.fn() };
    const controller = new PurchasesController(service as never);
    const foreign = { user: { tenantId: 'tenant-2', userId: 'user-2' } } as any;
    await expect(controller.findPurchases(tenantId, foreign)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.createSupplier({ tenantId } as any, foreign)).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.findPurchases).not.toHaveBeenCalled();
  });
});
