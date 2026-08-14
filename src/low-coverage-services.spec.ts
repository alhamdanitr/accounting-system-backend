import { BadRequestException } from '@nestjs/common';
import { AnalyticsService } from './analytics/analytics.service';
import { CurrencyService } from './finance/currency.service';
import { WhatsappService } from './notifications/whatsapp.service';
import { PerformanceService } from './performance/performance.service';
import { ReportExportService } from './reports/report-export.service';
import { QuotationService } from './sales/quotation.service';
import { StockTransferService } from './inventory/stock-transfer.service';

const tenantId = '11111111-1111-4111-8111-111111111111';

function prismaMock() {
  return { $transaction: jest.fn() };
}

describe('low-coverage production services', () => {
  it('returns dashboard and deterministic-length chart data', async () => {
    const service = new AnalyticsService(prismaMock() as never);
    const summary = await service.getDashboardSummary(tenantId);
    const chart = await service.getSalesChartData(tenantId, 3);
    expect(summary).toEqual(expect.objectContaining({ totalSalesToday: 1250, netProfitToday: 680 }));
    expect(chart).toHaveLength(3);
    expect(chart[0]).toEqual(expect.objectContaining({ date: expect.any(String), sales: expect.any(Number), profit: expect.any(Number) }));
  });

  it('updates exchange rates and converts known and unknown currencies', async () => {
    const service = new CurrencyService(prismaMock() as never);
    await expect(service.updateExchangeRate({ tenantId, currencyCode: 'USD', exchangeRate: 530, userId: 'user-1' })).resolves.toEqual({
      success: true,
      message: 'Exchange rate for USD updated to 530',
    });
    await expect(service.convertAmount(530, 'YER', 'USD', tenantId)).resolves.toBe(1);
    await expect(service.convertAmount(10, 'UNKNOWN', 'USD', tenantId)).resolves.toBe(10);
  });

  it('queues WhatsApp invoice and stock alert messages', async () => {
    const service = new WhatsappService();
    await expect(service.sendInvoice('+967700000000', 'INV-1', 'https://example.test/invoice.pdf')).resolves.toEqual({
      success: true,
      message: 'WhatsApp message queued',
    });
    await expect(service.sendStockAlert('+967700000000', 'Product', 2)).resolves.toEqual({
      success: true,
      message: 'Alert sent successfully',
    });
  });

  it('returns operational performance results', async () => {
    const service = new PerformanceService(prismaMock() as never);
    await expect(service.optimizeDatabase()).resolves.toEqual({ success: true, message: 'Database optimization triggered' });
    await expect(service.getSlowQueries()).resolves.toEqual([]);
  });

  it('exports CSV and PDF-compatible text for populated and empty data', async () => {
    const service = new ReportExportService();
    await expect((await service.exportToExcel([{ id: 1, name: 'Cash' }], 'Accounts')).toString()).toBe('id,name\n1,Cash');
    await expect((await service.exportToExcel([], 'Accounts')).toString()).toBe('No data available');
    await expect((await service.exportToPdf([{ id: 1 }], 'Report')).toString()).toContain('1. {"id":1}');
    await expect((await service.exportToPdf([], 'Report')).toString()).toContain('لا توجد بيانات متاحة');
  });

  it('creates and converts quotations through the service contract', async () => {
    const service = new QuotationService(prismaMock() as never);
    const quotation = await service.createQuotation({
      tenantId,
      customerId: 'customer-1',
      branchId: 'branch-1',
      userId: 'user-1',
      items: [{ productId: 'product-1', quantity: 2, unitPrice: 10, discount: 0 }],
      validUntil: new Date('2026-12-31'),
    });
    const invoice = await service.convertToInvoice(quotation.quotationId, 'user-1');
    expect(quotation).toEqual(expect.objectContaining({ success: true, message: expect.stringContaining('Quotation created') }));
    expect(invoice).toEqual(expect.objectContaining({ success: true, message: expect.stringContaining('converted') }));
  });

  it('transfers stock into an existing destination balance', async () => {
    const tx = {
      stockBalance: {
        findUnique: jest.fn()
          .mockResolvedValueOnce({ id: 'source', quantity: 10 })
          .mockResolvedValueOnce({ id: 'destination', quantity: 3 }),
        update: jest.fn(),
        create: jest.fn(),
      },
      stockMovement: { create: jest.fn() },
      serialNumber: { updateMany: jest.fn() },
    };
    const prisma = { $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)) };
    const service = new StockTransferService(prisma as never);
    await expect(service.transferStock({ tenantId, fromWarehouseId: 'from', toWarehouseId: 'to', productId: 'product', quantity: 4, userId: 'user', serialNumbers: ['SN-1'] })).resolves.toEqual({
      success: true,
      message: 'Stock transferred successfully',
    });
    expect(tx.stockBalance.update).toHaveBeenCalledTimes(2);
    expect(tx.stockBalance.create).not.toHaveBeenCalled();
    expect(tx.serialNumber.updateMany).toHaveBeenCalled();
  });

  it('creates a destination balance and rejects insufficient stock', async () => {
    const tx = {
      stockBalance: {
        findUnique: jest.fn()
          .mockResolvedValueOnce({ id: 'source', quantity: 10 })
          .mockResolvedValueOnce(null),
        update: jest.fn(),
        create: jest.fn(),
      },
      stockMovement: { create: jest.fn() },
      serialNumber: { updateMany: jest.fn() },
    };
    const service = new StockTransferService({ $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)) } as never);
    await expect(service.transferStock({ tenantId, fromWarehouseId: 'from', toWarehouseId: 'to', productId: 'product', quantity: 4, userId: 'user' })).resolves.toEqual(expect.objectContaining({ success: true }));
    expect(tx.stockBalance.create).toHaveBeenCalled();

    const insufficient = { stockBalance: { findUnique: jest.fn().mockResolvedValue({ id: 'source', quantity: 1 }) } };
    const failingService = new StockTransferService({ $transaction: jest.fn((callback: (transaction: typeof insufficient) => unknown) => callback(insufficient)) } as never);
    await expect(failingService.transferStock({ tenantId, fromWarehouseId: 'from', toWarehouseId: 'to', productId: 'product', quantity: 4, userId: 'user' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
