import { NotFoundException } from '@nestjs/common';
import { PaymentType, PurchaseStatus, StockMovementType } from '@prisma/client';
import { PurchasesService } from './purchases.service';

const tenantId = '11111111-1111-4111-8111-111111111111';
const warehouseId = '22222222-2222-4222-8222-222222222222';
const supplierId = '33333333-3333-4333-8333-333333333333';
const productId = '44444444-4444-4444-8444-444444444444';

function createPrisma() {
  return {
    supplier: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
    warehouse: { findFirst: jest.fn() },
    branch: { findFirst: jest.fn() },
    user: { findFirst: jest.fn() },
    product: { findFirst: jest.fn() },
    stockBalance: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    purchase: { findMany: jest.fn() },
    $transaction: jest.fn(),
  };
}

function purchaseDto(overrides: Record<string, unknown> = {}) {
  return { tenantId, warehouseId, supplierId, userId: 'user-1', paymentType: PaymentType.CASH, paidAmount: 10, items: [{ productId, quantity: 2, unitPrice: 10, discount: 0 }], ...overrides };
}

describe('PurchasesService', () => {
  it('creates and lists suppliers with tenant scope', async () => {
    const prisma = createPrisma();
    prisma.supplier.create.mockResolvedValue({ id: supplierId, tenantId, name: 'Supplier' });
    prisma.supplier.findMany.mockResolvedValue([]);
    const service = new PurchasesService(prisma as never);
    await expect(service.createSupplier({ tenantId, name: 'Supplier' })).resolves.toEqual({ id: supplierId, tenantId, name: 'Supplier' });
    await expect(service.findSuppliers(tenantId)).resolves.toEqual([]);
    expect(prisma.supplier.findMany).toHaveBeenCalledWith({ where: { tenantId } });
  });

  it('rejects purchases with foreign warehouse, branch, user, supplier or product', async () => {
    const warehouseMissing = createPrisma();
    warehouseMissing.warehouse.findFirst.mockResolvedValue(null);
    await expect(new PurchasesService(warehouseMissing as never).createPurchase(purchaseDto())).rejects.toBeInstanceOf(NotFoundException);

    const branchMissing = createPrisma();
    branchMissing.warehouse.findFirst.mockResolvedValue({ id: warehouseId });
    branchMissing.branch.findFirst.mockResolvedValue(null);
    await expect(new PurchasesService(branchMissing as never).createPurchase(purchaseDto({ branchId: 'foreign-branch' }))).rejects.toBeInstanceOf(NotFoundException);

    const userMissing = createPrisma();
    userMissing.warehouse.findFirst.mockResolvedValue({ id: warehouseId });
    userMissing.user.findFirst.mockResolvedValue(null);
    await expect(new PurchasesService(userMissing as never).createPurchase(purchaseDto())).rejects.toBeInstanceOf(NotFoundException);

    const supplierMissing = createPrisma();
    supplierMissing.warehouse.findFirst.mockResolvedValue({ id: warehouseId });
    supplierMissing.user.findFirst.mockResolvedValue({ id: 'user-1' });
    supplierMissing.supplier.findFirst.mockResolvedValue(null);
    await expect(new PurchasesService(supplierMissing as never).createPurchase(purchaseDto())).rejects.toBeInstanceOf(NotFoundException);

    const productMissing = createPrisma();
    productMissing.warehouse.findFirst.mockResolvedValue({ id: warehouseId });
    productMissing.user.findFirst.mockResolvedValue({ id: 'user-1' });
    productMissing.supplier.findFirst.mockResolvedValue({ id: supplierId });
    productMissing.product.findFirst.mockResolvedValue(null);
    await expect(new PurchasesService(productMissing as never).createPurchase(purchaseDto())).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a paid purchase, increases existing stock, and records no supplier debt', async () => {
    const prisma = createPrisma();
    prisma.warehouse.findFirst.mockResolvedValue({ id: warehouseId });
    prisma.user.findFirst.mockResolvedValue({ id: 'user-1' });
    prisma.supplier.findFirst.mockResolvedValue({ id: supplierId });
    prisma.product.findFirst.mockResolvedValue({ id: productId, taxRate: 15 });
    const tx = {
      purchase: { create: jest.fn().mockResolvedValue({ id: 'purchase-1', status: PurchaseStatus.PAID, items: [], supplier: null }) },
      stockBalance: { findUnique: jest.fn().mockResolvedValue({ id: 'balance-1', quantity: 10 }), update: jest.fn(), create: jest.fn() },
      stockMovement: { create: jest.fn() },
      supplier: { update: jest.fn() },
      supplierTransaction: { create: jest.fn() },
    };
    prisma.$transaction.mockImplementation((callback: (transaction: typeof tx) => unknown) => callback(tx));
    const result = await new PurchasesService(prisma as never).createPurchase(purchaseDto({ paidAmount: 20 }));
    expect(result).toEqual(expect.objectContaining({ id: 'purchase-1', status: PurchaseStatus.PAID }));
    expect(tx.purchase.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ subTotal: 20, grandTotal: 20, paidAmount: 20, dueAmount: 0, status: PurchaseStatus.PAID }) }));
    expect(tx.stockBalance.update).toHaveBeenCalledWith({ where: { id: 'balance-1' }, data: { quantity: 12 } });
    expect(tx.stockMovement.create).toHaveBeenCalledWith({ data: expect.objectContaining({ type: StockMovementType.PURCHASE_IN, quantity: 2, balanceAfter: 12 }) });
    expect(tx.supplier.update).not.toHaveBeenCalled();

    tx.purchase.create.mockResolvedValue({ id: 'purchase-partial', status: PurchaseStatus.PARTIALLY_PAID, items: [], supplier: null });
    await new PurchasesService(prisma as never).createPurchase(purchaseDto({ paidAmount: 15 }));
    expect(tx.purchase.create).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: PurchaseStatus.PARTIALLY_PAID, dueAmount: 5 }) }));
  });

  it('creates a credit purchase, creates missing stock balance, and records supplier debt', async () => {
    const prisma = createPrisma();
    prisma.warehouse.findFirst.mockResolvedValue({ id: warehouseId });
    prisma.user.findFirst.mockResolvedValue({ id: 'user-1' });
    prisma.supplier.findFirst.mockResolvedValue({ id: supplierId });
    prisma.product.findFirst.mockResolvedValue({ id: productId, taxRate: 0 });
    const tx = {
      purchase: { create: jest.fn().mockResolvedValue({ id: 'purchase-2', status: PurchaseStatus.CREDIT, items: [], supplier: null }) },
      stockBalance: { findUnique: jest.fn().mockResolvedValue(null), update: jest.fn(), create: jest.fn() },
      stockMovement: { create: jest.fn() },
      supplier: { update: jest.fn() },
      supplierTransaction: { create: jest.fn() },
    };
    prisma.$transaction.mockImplementation((callback: (transaction: typeof tx) => unknown) => callback(tx));
    await expect(new PurchasesService(prisma as never).createPurchase(purchaseDto({ paidAmount: 0, discount: 2 }))).resolves.toEqual(expect.objectContaining({ id: 'purchase-2', status: PurchaseStatus.CREDIT }));
    expect(tx.stockBalance.create).toHaveBeenCalledWith({ data: expect.objectContaining({ tenantId, warehouseId, productId, quantity: 2 }) });
    expect(tx.supplier.update).toHaveBeenCalledWith({ where: { id: supplierId }, data: { balance: { increment: 18 } } });
    expect(tx.supplierTransaction.create).toHaveBeenCalledWith({ data: expect.objectContaining({ tenantId, supplierId, amount: 18, type: 'PURCHASE' }) });
  });

  it('lists tenant purchases with related items and supplier', async () => {
    const prisma = createPrisma();
    prisma.purchase.findMany.mockResolvedValue([]);
    await expect(new PurchasesService(prisma as never).findPurchases(tenantId)).resolves.toEqual([]);
    expect(prisma.purchase.findMany).toHaveBeenCalledWith({ where: { tenantId }, include: { items: { include: { product: true } }, supplier: true }, orderBy: { createdAt: 'desc' } });
  });
});
