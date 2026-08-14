import { NotFoundException } from '@nestjs/common';
import { StockMovementType } from '@prisma/client';
import { InventoryService } from './inventory.service';

const tenantId = '11111111-1111-4111-8111-111111111111';

function createPrisma() {
  return {
    branch: { findFirst: jest.fn() },
    warehouse: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
    product: { findMany: jest.fn(), findFirst: jest.fn() },
    user: { findFirst: jest.fn() },
    stockBalance: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    stockMovement: { create: jest.fn() },
  };
}

describe('InventoryService', () => {
  it('creates a warehouse with optional branch validation and lists active warehouses', async () => {
    const prisma = createPrisma();
    prisma.branch.findFirst.mockResolvedValue({ id: 'branch-1', tenantId });
    prisma.warehouse.create.mockResolvedValue({ id: 'warehouse-1', tenantId, code: 'WH-1' });
    prisma.warehouse.findMany.mockResolvedValue([]);
    const service = new InventoryService(prisma as never);
    await expect(service.createWarehouse({ tenantId, branchId: 'branch-1', name: 'Main', code: 'WH-1' })).resolves.toEqual({ id: 'warehouse-1', tenantId, code: 'WH-1' });
    await expect(service.createWarehouse({ tenantId, name: 'General', code: 'WH-2' })).resolves.toEqual({ id: 'warehouse-1', tenantId, code: 'WH-1' });
    await expect(service.findWarehouses(tenantId)).resolves.toEqual([]);
    expect(prisma.warehouse.findMany).toHaveBeenCalledWith({ where: { tenantId, active: true }, include: { branch: true }, orderBy: { name: 'asc' } });
  });

  it('rejects a branch from another tenant and maps warehouse stock to currentStock', async () => {
    const invalid = createPrisma();
    invalid.branch.findFirst.mockResolvedValue(null);
    await expect(new InventoryService(invalid as never).createWarehouse({ tenantId, branchId: 'foreign', name: 'Main', code: 'WH-1' })).rejects.toBeInstanceOf(NotFoundException);

    const prisma = createPrisma();
    prisma.warehouse.findFirst.mockResolvedValue({ id: 'warehouse-1' });
    prisma.product.findMany.mockResolvedValue([
      { id: 'p1', arabicName: 'A', stockBalances: [{ quantity: 7 }] },
      { id: 'p2', arabicName: 'B', stockBalances: [] },
    ]);
    const result = await new InventoryService(prisma as never).findProductsForWarehouse(tenantId, 'warehouse-1');
    expect(result).toEqual([{ id: 'p1', arabicName: 'A', currentStock: 7 }, { id: 'p2', arabicName: 'B', currentStock: 0 }]);
  });

  it('rejects products for an unknown warehouse and records a new stock movement balance', async () => {
    const missing = createPrisma();
    missing.warehouse.findFirst.mockResolvedValue(null);
    await expect(new InventoryService(missing as never).findProductsForWarehouse(tenantId, 'foreign')).rejects.toBeInstanceOf(NotFoundException);

    const prisma = createPrisma();
    prisma.warehouse.findFirst.mockResolvedValue({ id: 'warehouse-1' });
    prisma.product.findFirst.mockResolvedValue({ id: 'product-1', tenantId });
    prisma.user.findFirst.mockResolvedValue({ id: 'user-1', tenantId, status: 'ACTIVE' });
    prisma.stockBalance.findFirst.mockResolvedValue(null);
    prisma.stockBalance.create.mockResolvedValue({ id: 'balance-1', quantity: 10 });
    prisma.stockMovement.create.mockResolvedValue({ id: 'movement-1', balanceAfter: 10 });
    const service = new InventoryService(prisma as never);
    await expect(service.recordStockMovement({ tenantId, warehouseId: 'warehouse-1', productId: 'product-1', type: StockMovementType.PURCHASE, quantity: 10, userId: 'user-1' })).resolves.toEqual({ id: 'movement-1', balanceAfter: 10 });
    expect(prisma.stockBalance.create).toHaveBeenCalledWith({ data: { tenantId, warehouseId: 'warehouse-1', productId: 'product-1', quantity: 10 } });
    expect(prisma.stockMovement.create).toHaveBeenCalledWith({ data: expect.objectContaining({ tenantId, quantity: 10, balanceAfter: 10 }) });
  });

  it('updates an existing balance and rejects invalid product or inactive user', async () => {
    const prisma = createPrisma();
    prisma.warehouse.findFirst.mockResolvedValue({ id: 'warehouse-1' });
    prisma.product.findFirst.mockResolvedValue({ id: 'product-1', tenantId });
    prisma.user.findFirst.mockResolvedValue({ id: 'user-1', tenantId, status: 'ACTIVE' });
    prisma.stockBalance.findFirst.mockResolvedValue({ id: 'balance-1', quantity: 10 });
    prisma.stockMovement.create.mockResolvedValue({ id: 'movement-1', balanceAfter: 7 });
    await expect(new InventoryService(prisma as never).recordStockMovement({ tenantId, warehouseId: 'warehouse-1', productId: 'product-1', type: StockMovementType.SALE, quantity: -3, userId: 'user-1' })).resolves.toEqual({ id: 'movement-1', balanceAfter: 7 });
    expect(prisma.stockBalance.update).toHaveBeenCalledWith({ where: { id: 'balance-1' }, data: { quantity: 7 } });

    const missingWarehouse = createPrisma();
    missingWarehouse.warehouse.findFirst.mockResolvedValue(null);
    await expect(new InventoryService(missingWarehouse as never).recordStockMovement({ tenantId, warehouseId: 'foreign', productId: 'product-1', type: StockMovementType.SALE, quantity: -1 })).rejects.toBeInstanceOf(NotFoundException);

    const missingProduct = createPrisma();
    missingProduct.warehouse.findFirst.mockResolvedValue({ id: 'warehouse-1' });
    missingProduct.product.findFirst.mockResolvedValue(null);
    await expect(new InventoryService(missingProduct as never).recordStockMovement({ tenantId, warehouseId: 'warehouse-1', productId: 'foreign', type: StockMovementType.SALE, quantity: -1 })).rejects.toBeInstanceOf(NotFoundException);

    const inactiveUser = createPrisma();
    inactiveUser.warehouse.findFirst.mockResolvedValue({ id: 'warehouse-1' });
    inactiveUser.product.findFirst.mockResolvedValue({ id: 'product-1', tenantId });
    inactiveUser.user.findFirst.mockResolvedValue(null);
    await expect(new InventoryService(inactiveUser as never).recordStockMovement({ tenantId, warehouseId: 'warehouse-1', productId: 'product-1', type: StockMovementType.SALE, quantity: -1, userId: 'inactive' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('adjusts stock through an adjustment movement and rejects no-op adjustments', async () => {
    const prisma = createPrisma();
    prisma.stockBalance.findFirst.mockResolvedValueOnce({ quantity: 10 }).mockResolvedValueOnce({ quantity: 10 });
    prisma.warehouse.findFirst.mockResolvedValue({ id: 'warehouse-1' });
    prisma.product.findFirst.mockResolvedValue({ id: 'product-1', tenantId });
    prisma.user.findFirst.mockResolvedValue({ id: 'user-1', tenantId, status: 'ACTIVE' });
    prisma.stockBalance.findFirst.mockResolvedValueOnce({ quantity: 10 }).mockResolvedValueOnce({ quantity: 10 });
    prisma.stockBalance.create.mockResolvedValue({ id: 'balance-1' });
    prisma.stockMovement.create.mockResolvedValue({ id: 'movement-1', type: StockMovementType.ADJUSTMENT });
    const service = new InventoryService(prisma as never);
    await expect(service.adjustStock({ tenantId, warehouseId: 'warehouse-1', productId: 'product-1', actualQuantity: 12, reason: 'count', userId: 'user-1' })).resolves.toEqual({ id: 'movement-1', type: StockMovementType.ADJUSTMENT });

    const noop = createPrisma();
    noop.stockBalance.findFirst.mockResolvedValue({ quantity: 10 });
    await expect(new InventoryService(noop as never).adjustStock({ tenantId, warehouseId: 'warehouse-1', productId: 'product-1', actualQuantity: 10, reason: 'count' })).rejects.toThrow('الكمية الفعلية تطابق رصيد النظام الحالي');
  });

  it('gets a tenant-scoped stock balance', async () => {
    const prisma = createPrisma();
    prisma.stockBalance.findFirst.mockResolvedValue({ id: 'balance-1' });
    await expect(new InventoryService(prisma as never).getStockBalance('warehouse-1', 'product-1', tenantId)).resolves.toEqual({ id: 'balance-1' });
    expect(prisma.stockBalance.findFirst).toHaveBeenCalledWith({ where: { tenantId, warehouseId: 'warehouse-1', productId: 'product-1' }, include: { product: true, warehouse: true } });
  });
});
