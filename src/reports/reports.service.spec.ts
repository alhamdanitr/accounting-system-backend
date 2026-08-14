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

  it('rejects an unknown warehouse and invalid calendar date', async () => {
    const prisma = { warehouse: { findFirst: jest.fn().mockResolvedValue(null) }, sale: { findMany: jest.fn() } } as any;
    const service = new ReportsService(prisma);
    await expect(service.getDailySalesReport('tenant-1', 'warehouse-1', '2026-99-99')).rejects.toThrow('التاريخ المحدد غير صالح');

    const validDatePrisma = { warehouse: { findFirst: jest.fn().mockResolvedValue(null) }, sale: { findMany: jest.fn() } } as any;
    await expect(new ReportsService(validDatePrisma).getDailySalesReport('tenant-1', 'warehouse-1', '2026-08-14')).rejects.toThrow('المستودع غير موجود');
  });

  it('returns dashboard totals and financial summary with tenant filters', async () => {
    const prisma = {
      sale: { aggregate: jest.fn().mockResolvedValueOnce({ _count: 2, _sum: { grandTotal: 500, paidAmount: 400, dueAmount: 100 } }).mockResolvedValueOnce({ _sum: { grandTotal: 300 } }) },
      purchase: { aggregate: jest.fn().mockResolvedValueOnce({ _count: 1, _sum: { grandTotal: 300, paidAmount: 250, dueAmount: 50 } }).mockResolvedValueOnce({ _sum: { grandTotal: 300 } }) },
      customer: { count: jest.fn().mockResolvedValue(4) },
      supplier: { count: jest.fn().mockResolvedValue(2) },
      product: { count: jest.fn().mockResolvedValue(10) },
      expense: { aggregate: jest.fn().mockResolvedValueOnce({ _sum: { amount: 40 } }).mockResolvedValueOnce({ _sum: { amount: 40 } }) },
    } as any;
    const service = new ReportsService(prisma);
    await expect(service.getDashboardSummary('tenant-1')).resolves.toEqual({
      sales: { count: 2, totalRevenue: 500, totalPaid: 400, totalDue: 100 },
      purchases: { count: 1, totalCost: 300, totalPaid: 250, totalDue: 50 },
      expenses: { total: 40 },
      entities: { customers: 4, suppliers: 2, products: 10 },
    });
    await expect(service.getFinancialSummary('tenant-1')).resolves.toEqual({ revenue: 300, costOfGoods: 300, grossProfit: 0, totalExpenses: 40, netProfit: -40 });
  });

  it('builds a sales report with and without date filters', async () => {
    const prisma = { sale: { findMany: jest.fn().mockResolvedValue([{ grandTotal: 100, paidAmount: 80, dueAmount: 20, discount: 5 }]) } } as any;
    const service = new ReportsService(prisma);
    await expect(service.getSalesReport('tenant-1', '2026-08-01', '2026-08-14')).resolves.toEqual({ summary: { totalRevenue: 100, totalPaid: 80, totalDue: 20, totalDiscount: 5, count: 1 }, sales: expect.any(Array) });
    await service.getSalesReport('tenant-1');
    expect(prisma.sale.findMany).toHaveBeenCalledTimes(2);
  });

  it('returns inventory totals and low-stock balances', async () => {
    const balances = [
      { quantity: 2, product: { minimumStock: 3 }, warehouse: { id: 'w1' } },
      { quantity: 10, product: { minimumStock: 3 }, warehouse: { id: 'w1' } },
    ];
    const prisma = { stockBalance: { findMany: jest.fn().mockResolvedValue(balances) } } as any;
    const service = new ReportsService(prisma);
    await expect(service.getInventoryReport('tenant-1', 'warehouse-1')).resolves.toEqual({ totalItems: 2, lowStockCount: 1, balances, lowStockItems: [balances[0]] });
    expect(prisma.stockBalance.findMany).toHaveBeenCalledWith({ where: { tenantId: 'tenant-1', warehouseId: 'warehouse-1' }, include: { product: true, warehouse: true } });
  });
});
