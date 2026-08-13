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
});
