import { ReportsService } from './reports.service';

describe('ReportsService daily sales', () => {
  it('returns a warehouse-scoped daily summary and invoices', async () => {
    const prisma = {
      warehouse: { findFirst: jest.fn().mockResolvedValue({ id: 'warehouse-1', name: 'الرئيسي', code: 'MAIN' }) },
      sale: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'sale-1',
            invoiceNumber: 'INV-1',
            createdAt: new Date('2026-08-14T10:00:00.000Z'),
            grandTotal: 150,
            paidAmount: 100,
            dueAmount: 50,
            paymentType: 'CASH',
            customer: { name: 'عميل اختباري' },
          },
          {
            id: 'sale-2',
            invoiceNumber: 'INV-2',
            createdAt: new Date('2026-08-14T09:00:00.000Z'),
            grandTotal: 50,
            paidAmount: 50,
            dueAmount: 0,
            paymentType: 'CARD',
            customer: null,
          },
        ]),
      },
    } as any;
    const service = new ReportsService(prisma);

    const result = await service.getDailySalesReport('tenant-1', 'warehouse-1', '2026-08-14');

    expect(result.summary).toEqual({ count: 2, totalRevenue: 200, totalPaid: 150, totalDue: 50 });
    expect(result.warehouse.id).toBe('warehouse-1');
    expect(result.sales).toHaveLength(2);
    expect(prisma.sale.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        tenantId: 'tenant-1',
        warehouseId: 'warehouse-1',
        createdAt: {
          gte: new Date('2026-08-14T00:00:00.000Z'),
          lt: new Date('2026-08-15T00:00:00.000Z'),
        },
      }),
    }));
  });

  it('rejects an invalid date before querying sales', async () => {
    const prisma = { warehouse: { findFirst: jest.fn() }, sale: { findMany: jest.fn() } } as any;
    const service = new ReportsService(prisma);

    await expect(service.getDailySalesReport('tenant-1', 'warehouse-1', '14-08-2026')).rejects.toThrow('YYYY-MM-DD');
    expect(prisma.warehouse.findFirst).not.toHaveBeenCalled();
  });
});
