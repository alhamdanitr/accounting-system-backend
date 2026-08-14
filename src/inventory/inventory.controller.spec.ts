import { ForbiddenException } from '@nestjs/common';
import { InventoryController } from './inventory.controller';

describe('InventoryController', () => {
  const tenantId = 'tenant-1';
  const request = { user: { tenantId, userId: 'user-1' } } as any;
  const services = {
    inventory: {
      createWarehouse: jest.fn().mockResolvedValue({ id: 'warehouse-1' }),
      findWarehouses: jest.fn().mockResolvedValue([]),
      findProductsForWarehouse: jest.fn().mockResolvedValue([]),
      recordStockMovement: jest.fn().mockResolvedValue({ id: 'movement-1' }),
      adjustStock: jest.fn().mockResolvedValue({ id: 'adjustment-1' }),
      getStockBalance: jest.fn().mockResolvedValue({ id: 'balance-1' }),
    },
    returns: {
      processReturn: jest.fn().mockResolvedValue({ returnId: 'return-1' }),
      processStockAdjustment: jest.fn().mockResolvedValue({ difference: 1 }),
    },
  };

  beforeEach(() => jest.clearAllMocks());

  it('delegates all inventory endpoints with session user and tenant', async () => {
    const controller = new InventoryController(services.inventory as never, services.returns as never);
    const dto = { tenantId, warehouseId: 'warehouse-1', productId: 'product-1' } as any;
    await expect(controller.createWarehouse(dto, request)).resolves.toEqual({ id: 'warehouse-1' });
    await expect(controller.findWarehouses(tenantId, request)).resolves.toEqual([]);
    await expect(controller.findProductsForWarehouse(tenantId, 'warehouse-1', request)).resolves.toEqual([]);
    await expect(controller.recordMovement(dto, request)).resolves.toEqual({ id: 'movement-1' });
    await expect(controller.adjustStock(dto, request)).resolves.toEqual({ id: 'adjustment-1' });
    await expect(controller.processReturn({ ...dto, items: [] }, request)).resolves.toEqual({ returnId: 'return-1' });
    await expect(controller.processStockAdjustment(dto, request)).resolves.toEqual({ difference: 1 });
    await expect(controller.getStockBalance('warehouse-1', 'product-1', request)).resolves.toEqual({ id: 'balance-1' });
    expect(services.inventory.recordStockMovement).toHaveBeenCalledWith({ ...dto, userId: 'user-1' });
    expect(services.inventory.adjustStock).toHaveBeenCalledWith({ ...dto, userId: 'user-1' });
    expect(services.returns.processReturn).toHaveBeenCalledWith({ ...dto, items: [], userId: 'user-1' });
    expect(services.returns.processStockAdjustment).toHaveBeenCalledWith({ ...dto, userId: 'user-1' });
    expect(services.inventory.getStockBalance).toHaveBeenCalledWith('warehouse-1', 'product-1', tenantId);
  });

  it('rejects missing warehouse query and cross-tenant requests', async () => {
    const controller = new InventoryController(services.inventory as never, services.returns as never);
    await expect(controller.findProductsForWarehouse(tenantId, '', request)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.findWarehouses(tenantId, { user: { tenantId: 'tenant-2', userId: 'user-2' } } as any)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.createWarehouse({ tenantId } as any, { user: { tenantId: 'tenant-2', userId: 'user-2' } } as any)).rejects.toBeInstanceOf(ForbiddenException);
    expect(services.inventory.findWarehouses).not.toHaveBeenCalled();
  });
});
