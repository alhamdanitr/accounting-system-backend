import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentType, SaleStatus, StockMovementType } from '@prisma/client';
import { SalesService } from './sales.service';

const tenantId = '11111111-1111-4111-8111-111111111111';
const warehouseId = '22222222-2222-4222-8222-222222222222';
const customerId = '33333333-3333-4333-8333-333333333333';
const productId = '44444444-4444-4444-8444-444444444444';

function createPrisma() {
  return {
    customer: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    warehouse: { findFirst: jest.fn() },
    branch: { findFirst: jest.fn() },
    user: { findFirst: jest.fn() },
    product: { findFirst: jest.fn() },
    stockBalance: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    sale: { findMany: jest.fn() },
    $transaction: jest.fn(),
    customerTransaction: { create: jest.fn() },
  };
}

function saleDto(overrides: Record<string, unknown> = {}) {
  return { tenantId, warehouseId, customerId, userId: 'user-1', paymentType: PaymentType.CASH, paidAmount: 10, items: [{ productId, quantity: 2, unitPrice: 10, discount: 0 }], ...overrides };
}

describe('SalesService', () => {
  it('creates and lists customers with tenant scope and credit default', async () => {
    const prisma = createPrisma();
    prisma.customer.create.mockResolvedValue({ id: customerId, tenantId, name: 'Customer', creditLimit: 0 });
    prisma.customer.findMany.mockResolvedValue([]);
    const service = new SalesService(prisma as never);
    await expect(service.createCustomer({ tenantId, name: 'Customer' })).resolves.toEqual({ id: customerId, tenantId, name: 'Customer', creditLimit: 0 });
    await expect(service.findCustomers(tenantId)).resolves.toEqual([]);
    expect(prisma.customer.findMany).toHaveBeenCalledWith({ where: { tenantId } });
  });

  it('rejects sales with foreign warehouse, branch, user, customer, product or insufficient stock', async () => {
    const warehouseMissing = createPrisma();
    warehouseMissing.warehouse.findFirst.mockResolvedValue(null);
    await expect(new SalesService(warehouseMissing as never).createSale(saleDto())).rejects.toBeInstanceOf(NotFoundException);

    const branchMissing = createPrisma();
    branchMissing.warehouse.findFirst.mockResolvedValue({ id: warehouseId });
    branchMissing.branch.findFirst.mockResolvedValue(null);
    await expect(new SalesService(branchMissing as never).createSale(saleDto({ branchId: 'foreign-branch' }))).rejects.toBeInstanceOf(NotFoundException);

    const userMissing = createPrisma();
    userMissing.warehouse.findFirst.mockResolvedValue({ id: warehouseId });
    userMissing.branch.findFirst.mockResolvedValue({ id: 'branch-1' });
    userMissing.user.findFirst.mockResolvedValue(null);
    await expect(new SalesService(userMissing as never).createSale(saleDto())).rejects.toBeInstanceOf(NotFoundException);

    const customerMissing = createPrisma();
    customerMissing.warehouse.findFirst.mockResolvedValue({ id: warehouseId });
    customerMissing.user.findFirst.mockResolvedValue({ id: 'user-1' });
    customerMissing.customer.findFirst.mockResolvedValue(null);
    await expect(new SalesService(customerMissing as never).createSale(saleDto())).rejects.toBeInstanceOf(NotFoundException);

    const productMissing = createPrisma();
    productMissing.warehouse.findFirst.mockResolvedValue({ id: warehouseId });
    productMissing.user.findFirst.mockResolvedValue({ id: 'user-1' });
    productMissing.customer.findFirst.mockResolvedValue({ id: customerId });
    productMissing.product.findFirst.mockResolvedValue(null);
    await expect(new SalesService(productMissing as never).createSale(saleDto())).rejects.toBeInstanceOf(NotFoundException);

    const insufficient = createPrisma();
    insufficient.warehouse.findFirst.mockResolvedValue({ id: warehouseId });
    insufficient.user.findFirst.mockResolvedValue({ id: 'user-1' });
    insufficient.customer.findFirst.mockResolvedValue({ id: customerId });
    insufficient.product.findFirst.mockResolvedValue({ id: productId, arabicName: 'Product', taxRate: 0 });
    insufficient.stockBalance.findUnique.mockResolvedValue({ quantity: 1 });
    await expect(new SalesService(insufficient as never).createSale(saleDto())).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a paid sale, deducts existing stock, and records no customer debt', async () => {
    const prisma = createPrisma();
    prisma.warehouse.findFirst.mockResolvedValue({ id: warehouseId });
    prisma.user.findFirst.mockResolvedValue({ id: 'user-1' });
    prisma.customer.findFirst.mockResolvedValue({ id: customerId });
    prisma.product.findFirst.mockResolvedValue({ id: productId, arabicName: 'Product', taxRate: 15 });
    prisma.stockBalance.findUnique.mockResolvedValue({ id: 'balance-1', quantity: 10 });
    const tx = {
      sale: { create: jest.fn().mockResolvedValue({ id: 'sale-1', status: SaleStatus.PAID, grandTotal: 20, items: [], customer: null }) },
      stockBalance: { findUnique: jest.fn().mockResolvedValue({ id: 'balance-1', quantity: 10 }), update: jest.fn() },
      stockMovement: { create: jest.fn() },
      customer: { update: jest.fn() },
      customerTransaction: { create: jest.fn() },
    };
    prisma.$transaction.mockImplementation((callback: (transaction: typeof tx) => unknown) => callback(tx));
    const result = await new SalesService(prisma as never).createSale(saleDto({ paidAmount: 20 }));
    expect(result).toEqual(expect.objectContaining({ id: 'sale-1', status: SaleStatus.PAID }));
    expect(tx.sale.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ subTotal: 20, grandTotal: 20, paidAmount: 20, dueAmount: 0, status: SaleStatus.PAID }) }));
    expect(tx.stockBalance.update).toHaveBeenCalledWith({ where: { id: 'balance-1' }, data: { quantity: 8 } });
    expect(tx.stockMovement.create).toHaveBeenCalledWith({ data: expect.objectContaining({ type: StockMovementType.SALE_OUT, quantity: -2, balanceAfter: 8 }) });
    expect(tx.customer.update).not.toHaveBeenCalled();

    tx.sale.create.mockResolvedValue({ id: 'sale-partial', status: SaleStatus.PARTIALLY_PAID, grandTotal: 20, items: [], customer: null });
    await new SalesService(prisma as never).createSale(saleDto({ paidAmount: 15 }));
    expect(tx.sale.create).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: SaleStatus.PARTIALLY_PAID, dueAmount: 5 }) }));
  });

  it('creates a credit sale, creates missing stock balance, and records customer debt', async () => {
    const prisma = createPrisma();
    prisma.warehouse.findFirst.mockResolvedValue({ id: warehouseId });
    prisma.user.findFirst.mockResolvedValue({ id: 'user-1' });
    prisma.customer.findFirst.mockResolvedValue({ id: customerId });
    prisma.product.findFirst.mockResolvedValue({ id: productId, arabicName: 'Product', taxRate: 0 });
    prisma.stockBalance.findUnique.mockResolvedValueOnce({ quantity: 5 });
    const tx = {
      sale: { create: jest.fn().mockResolvedValue({ id: 'sale-2', status: SaleStatus.CREDIT, grandTotal: 18, items: [], customer: null }) },
      stockBalance: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn(), update: jest.fn() },
      stockMovement: { create: jest.fn() },
      customer: { update: jest.fn() },
      customerTransaction: { create: jest.fn() },
    };
    prisma.$transaction.mockImplementation((callback: (transaction: typeof tx) => unknown) => callback(tx));
    await expect(new SalesService(prisma as never).createSale(saleDto({ paidAmount: 0, discount: 2 }))).resolves.toEqual(expect.objectContaining({ id: 'sale-2', status: SaleStatus.CREDIT }));
    expect(tx.stockBalance.create).toHaveBeenCalledWith({ data: expect.objectContaining({ tenantId, warehouseId, productId, quantity: -2 }) });
    expect(tx.customer.update).toHaveBeenCalledWith({ where: { id: customerId }, data: { balance: { increment: 18 } } });
    expect(tx.customerTransaction.create).toHaveBeenCalledWith({ data: expect.objectContaining({ tenantId, customerId, amount: 18, type: 'SALE' }) });
  });

  it('lists tenant sales with related items and customer', async () => {
    const prisma = createPrisma();
    prisma.sale.findMany.mockResolvedValue([]);
    await expect(new SalesService(prisma as never).findSales(tenantId)).resolves.toEqual([]);
    expect(prisma.sale.findMany).toHaveBeenCalledWith({ where: { tenantId }, include: { items: { include: { product: true } }, customer: true }, orderBy: { createdAt: 'desc' } });
  });
});
