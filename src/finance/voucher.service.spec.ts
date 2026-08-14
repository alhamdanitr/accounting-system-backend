import { BadRequestException } from '@nestjs/common';
import { VoucherService } from './voucher.service';

describe('VoucherService tenant isolation', () => {
  it('rejects a voucher when the cashbox belongs to another tenant', async () => {
    const tx = {
      cashbox: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = new VoucherService(prisma as never);

    await expect(
      service.processVoucher({
        tenantId: '11111111-1111-4111-8111-111111111111',
        type: 'RECEIPT',
        amount: 100,
        currencyCode: 'YER',
        notes: 'اختبار عزل الصندوق',
        userId: 'user-1',
        accountId: 'customer-1',
        cashboxId: 'cashbox-other-tenant',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(tx.cashbox.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'cashbox-other-tenant',
        tenantId: '11111111-1111-4111-8111-111111111111',
      },
    });
  });

  it('rejects a receipt when the customer is not in the tenant', async () => {
    const tx = {
      cashbox: {
        findFirst: jest.fn().mockResolvedValue({ balance: 1000 }),
        update: jest.fn(),
      },
      customer: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = new VoucherService(prisma as never);

    await expect(
      service.processVoucher({
        tenantId: '11111111-1111-4111-8111-111111111111',
        type: 'RECEIPT',
        amount: 100,
        currencyCode: 'YER',
        notes: 'اختبار عزل العميل',
        userId: 'user-1',
        accountId: 'customer-other-tenant',
        cashboxId: 'cashbox-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(tx.customer.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'customer-other-tenant',
        tenantId: '11111111-1111-4111-8111-111111111111',
      },
    });
  });

  it('processes a receipt and updates the customer balance and transaction', async () => {
    const tx = {
      cashbox: { findFirst: jest.fn().mockResolvedValue({ balance: 1000 }), update: jest.fn() },
      customer: { findFirst: jest.fn().mockResolvedValue({ balance: 500 }), update: jest.fn() },
      customerTransaction: { create: jest.fn() },
    };
    const prisma = { $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)) };
    await expect(new VoucherService(prisma as never).processVoucher({ tenantId: 'tenant-1', type: 'RECEIPT', amount: 100, currencyCode: 'YER', notes: 'test', userId: 'user-1', accountId: 'customer-1', cashboxId: 'cashbox-1' })).resolves.toEqual({ success: true, message: 'RECEIPT voucher processed successfully' });
    expect(tx.cashbox.update).toHaveBeenCalledWith({ where: { id: 'cashbox-1' }, data: { balance: 1100 } });
    expect(tx.customer.update).toHaveBeenCalledWith({ where: { id: 'customer-1' }, data: { balance: 400 } });
    expect(tx.customerTransaction.create).toHaveBeenCalledWith({ data: expect.objectContaining({ tenantId: 'tenant-1', amount: -100, type: 'RECEIPT_VOUCHER' }) });
  });

  it('processes payments, rejects insufficient funds, and validates suppliers', async () => {
    const tx = {
      cashbox: { findFirst: jest.fn().mockResolvedValue({ balance: 1000 }), update: jest.fn() },
      supplier: { findFirst: jest.fn().mockResolvedValue({ balance: 500 }), update: jest.fn() },
      supplierTransaction: { create: jest.fn() },
    };
    const prisma = { $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)) };
    await expect(new VoucherService(prisma as never).processVoucher({ tenantId: 'tenant-1', type: 'PAYMENT', amount: 100, currencyCode: 'YER', notes: 'test', userId: 'user-1', accountId: 'supplier-1', cashboxId: 'cashbox-1' })).resolves.toEqual({ success: true, message: 'PAYMENT voucher processed successfully' });
    expect(tx.supplier.update).toHaveBeenCalledWith({ where: { id: 'supplier-1' }, data: { balance: 400 } });

    const insufficient = { cashbox: { findFirst: jest.fn().mockResolvedValue({ balance: 50 }) } };
    await expect(new VoucherService({ $transaction: jest.fn((callback: (transaction: typeof insufficient) => unknown) => callback(insufficient)) } as never).processVoucher({ tenantId: 'tenant-1', type: 'PAYMENT', amount: 100, currencyCode: 'YER', notes: 'test', userId: 'user-1', accountId: 'supplier-1', cashboxId: 'cashbox-1' })).rejects.toBeInstanceOf(BadRequestException);

    const missingSupplier = { cashbox: { findFirst: jest.fn().mockResolvedValue({ balance: 1000 }), update: jest.fn() }, supplier: { findFirst: jest.fn().mockResolvedValue(null) } };
    await expect(new VoucherService({ $transaction: jest.fn((callback: (transaction: typeof missingSupplier) => unknown) => callback(missingSupplier)) } as never).processVoucher({ tenantId: 'tenant-1', type: 'PAYMENT', amount: 100, currencyCode: 'YER', notes: 'test', userId: 'user-1', accountId: 'supplier-1', cashboxId: 'cashbox-1' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('records expenses and rejects expenses above the cashbox balance', async () => {
    const tx = {
      cashbox: { findFirst: jest.fn().mockResolvedValue({ balance: 1000 }), update: jest.fn() },
      expense: { create: jest.fn().mockResolvedValue({ id: 'expense-1' }) },
    };
    const prisma = { $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)) };
    await expect(new VoucherService(prisma as never).processExpense({ tenantId: 'tenant-1', amount: 100, currencyCode: 'YER', expenseCategoryId: 'rent', cashboxId: 'cashbox-1', notes: 'rent', userId: 'user-1' })).resolves.toEqual({ success: true, expenseId: 'expense-1', message: 'Expense recorded successfully' });
    expect(tx.expense.create).toHaveBeenCalledWith({ data: expect.objectContaining({ tenantId: 'tenant-1', category: 'rent', amount: 100 }) });

    const insufficient = { cashbox: { findFirst: jest.fn().mockResolvedValue({ balance: 50 }) } };
    await expect(new VoucherService({ $transaction: jest.fn((callback: (transaction: typeof insufficient) => unknown) => callback(insufficient)) } as never).processExpense({ tenantId: 'tenant-1', amount: 100, currencyCode: 'YER', expenseCategoryId: 'rent', cashboxId: 'cashbox-1', notes: 'rent', userId: 'user-1' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
