import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StockMovementType } from '@prisma/client';
import { ReturnAdjustmentService } from './return-adjustment.service';

const tenantId = '11111111-1111-4111-8111-111111111111';
const base = { tenantId, warehouseId: 'warehouse-1', userId: 'user-1' };

function txBase() {
  return {
    warehouse: { findFirst: jest.fn().mockResolvedValue({ id: 'warehouse-1' }) },
    user: { findFirst: jest.fn().mockResolvedValue({ id: 'user-1', status: 'ACTIVE' }) },
    product: { findFirst: jest.fn().mockResolvedValue({ id: 'product-1' }) },
    sale: { findFirst: jest.fn() },
    purchase: { findFirst: jest.fn() },
    saleReturnItem: { findMany: jest.fn().mockResolvedValue([]) },
    purchaseReturnItem: { findMany: jest.fn().mockResolvedValue([]) },
    saleReturn: { create: jest.fn().mockResolvedValue({ id: 'return-sale-1', items: [{ productId: 'product-1', quantity: 2 }] }) },
    purchaseReturn: { create: jest.fn().mockResolvedValue({ id: 'return-purchase-1', items: [{ productId: 'product-1', quantity: 2 }] }) },
    stockBalance: { upsert: jest.fn(), findUnique: jest.fn(), updateMany: jest.fn(), update: jest.fn(), create: jest.fn() },
    stockMovement: { create: jest.fn() },
  };
}

function service(tx: ReturnType<typeof txBase>) {
  return new ReturnAdjustmentService({ $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)) } as never);
}

describe('ReturnAdjustmentService', () => {
  it('rejects malformed returns before opening a transaction', async () => {
    const tx = txBase();
    const sut = service(tx);
    await expect(sut.processReturn({ ...base, isCustomerReturn: true, items: [] })).rejects.toBeInstanceOf(BadRequestException);
    await expect(sut.processReturn({ ...base, isCustomerReturn: true, items: [{ productId: 'p', quantity: 0, reason: 'x' }] })).rejects.toBeInstanceOf(BadRequestException);
    await expect(sut.processReturn({ ...base, isCustomerReturn: true, items: [{ productId: 'p', quantity: 1, reason: 'x' }] })).rejects.toBeInstanceOf(BadRequestException);
    await expect(sut.processReturn({ ...base, isCustomerReturn: false, items: [{ productId: 'p', quantity: 1, reason: 'x' }] })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('processes a customer return and increases stock with a SALE_RETURN_IN movement', async () => {
    const tx = txBase();
    tx.sale.findFirst.mockResolvedValue({ id: 'sale-1', items: [{ productId: 'product-1', quantity: 5, unitPrice: 10 }] });
    tx.saleReturn.create.mockResolvedValue({ id: 'return-sale-1', items: [{ productId: 'product-1', quantity: 2 }] });
    tx.stockBalance.findUnique.mockResolvedValue({ quantity: 7 });
    const result = await service(tx).processReturn({ ...base, originalSaleId: 'sale-1', isCustomerReturn: true, items: [{ productId: 'product-1', quantity: 2, reason: 'damaged packaging' }] });
    expect(result).toEqual(expect.objectContaining({ success: true, returnId: 'return-sale-1', total: 20, type: 'SALE_RETURN' }));
    expect(tx.saleReturn.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ tenantId, saleId: 'sale-1', total: 20 }) }));
    expect(tx.stockBalance.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: { quantity: { increment: 2 } } }));
    expect(tx.stockMovement.create).toHaveBeenCalledWith({ data: expect.objectContaining({ type: StockMovementType.SALE_RETURN_IN, quantity: 2, balanceAfter: 7 }) });
  });

  it('rejects returns exceeding original quantity or missing source invoice', async () => {
    const missing = txBase();
    missing.sale.findFirst.mockResolvedValue(null);
    await expect(service(missing).processReturn({ ...base, originalSaleId: 'missing', isCustomerReturn: true, items: [{ productId: 'product-1', quantity: 1, reason: 'reason' }] })).rejects.toBeInstanceOf(NotFoundException);

    const exceeding = txBase();
    exceeding.sale.findFirst.mockResolvedValue({ id: 'sale-1', items: [{ productId: 'product-1', quantity: 1, unitPrice: 10 }] });
    await expect(service(exceeding).processReturn({ ...base, originalSaleId: 'sale-1', isCustomerReturn: true, items: [{ productId: 'product-1', quantity: 2, reason: 'reason' }] })).rejects.toBeInstanceOf(BadRequestException);

    const unknownItem = txBase();
    unknownItem.sale.findFirst.mockResolvedValue({ id: 'sale-1', items: [{ productId: 'other', quantity: 1, unitPrice: 10 }] });
    await expect(service(unknownItem).processReturn({ ...base, originalSaleId: 'sale-1', isCustomerReturn: true, items: [{ productId: 'product-1', quantity: 1, reason: 'reason' }] })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('processes supplier returns and decrements stock safely', async () => {
    const tx = txBase();
    tx.purchase.findFirst.mockResolvedValue({ id: 'purchase-1', items: [{ productId: 'product-1', quantity: 5, unitPrice: 10 }] });
    tx.stockBalance.findUnique.mockResolvedValueOnce({ id: 'balance-1', quantity: 10 }).mockResolvedValueOnce({ quantity: 8 });
    tx.stockBalance.updateMany.mockResolvedValue({ count: 1 });
    const result = await service(tx).processReturn({ ...base, originalPurchaseId: 'purchase-1', isCustomerReturn: false, items: [{ productId: 'product-1', quantity: 2, reason: 'supplier return' }] });
    expect(result).toEqual(expect.objectContaining({ success: true, returnId: 'return-purchase-1', total: 20, type: 'PURCHASE_RETURN' }));
    expect(tx.stockBalance.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { quantity: { decrement: 2 } } }));
    expect(tx.stockMovement.create).toHaveBeenCalledWith({ data: expect.objectContaining({ type: StockMovementType.PURCHASE_RETURN_OUT, quantity: -2, balanceAfter: 8 }) });

    const noBalance = txBase();
    noBalance.purchase.findFirst.mockResolvedValue({ id: 'purchase-1', items: [{ productId: 'product-1', quantity: 5, unitPrice: 10 }] });
    noBalance.stockBalance.findUnique.mockResolvedValue(null);
    await expect(service(noBalance).processReturn({ ...base, originalPurchaseId: 'purchase-1', isCustomerReturn: false, items: [{ productId: 'product-1', quantity: 1, reason: 'return' }] })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('adjusts stock with existing or missing balance and handles no-op', async () => {
    const tx = txBase();
    tx.stockBalance.findUnique.mockResolvedValue({ id: 'balance-1', quantity: 10 });
    tx.stockBalance.update.mockResolvedValue({ quantity: 12 });
    const result = await service(tx).processStockAdjustment({ ...base, productId: 'product-1', actualQuantity: 12, reason: 'count', userId: 'user-1' });
    expect(result).toEqual({ success: true, difference: 2, message: 'تمت تسوية المخزون بنجاح' });
    expect(tx.stockMovement.create).toHaveBeenCalledWith({ data: expect.objectContaining({ type: StockMovementType.ADJUSTMENT, quantity: 2, balanceAfter: 12 }) });

    const noop = txBase();
    noop.stockBalance.findUnique.mockResolvedValue({ id: 'balance-1', quantity: 10 });
    await expect(service(noop).processStockAdjustment({ ...base, productId: 'product-1', actualQuantity: 10, reason: 'count', userId: 'user-1' })).resolves.toEqual(expect.objectContaining({ difference: 0 }));

    const createBalance = txBase();
    createBalance.stockBalance.findUnique.mockResolvedValue(null);
    createBalance.stockBalance.create.mockResolvedValue({ quantity: 5 });
    await expect(service(createBalance).processStockAdjustment({ ...base, productId: 'product-1', actualQuantity: 5, reason: 'count', userId: 'user-1' })).resolves.toEqual(expect.objectContaining({ difference: 5 }));
  });
});
