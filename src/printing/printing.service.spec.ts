import { NotFoundException } from '@nestjs/common';
import { PrintingService } from './printing.service';

describe('PrintingService', () => {
  it('rejects invoices outside the tenant or not found', async () => {
    const prisma = { sale: { findFirst: jest.fn().mockResolvedValue(null) } };
    const service = new PrintingService(prisma as never);
    await expect(service.generateSalesInvoicePdf('sale-1', 'tenant-1')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.sale.findFirst).toHaveBeenCalledWith({
      where: { id: 'sale-1', tenantId: 'tenant-1' },
      include: { items: { include: { product: true } }, customer: true, warehouse: true },
    });
  });

  it('generates a PDF with customer, items, discount and totals', async () => {
    const prisma = {
      sale: {
        findFirst: jest.fn().mockResolvedValue({
          invoiceNumber: 'INV-1',
          createdAt: new Date('2026-08-14T00:00:00.000Z'),
          status: 'PAID',
          customer: { name: 'Customer' },
          items: [{ product: { arabicName: 'منتج' }, quantity: 2, unitPrice: 10, total: 20 }],
          subTotal: 20,
          discount: 2,
          grandTotal: 18,
          paidAmount: 18,
          dueAmount: 0,
        }),
      },
    };
    const service = new PrintingService(prisma as never);
    const pdf = await service.generateSalesInvoicePdf('sale-1', 'tenant-1');
    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(100);
  });

  it('generates a PDF when customer is absent and discount is zero', async () => {
    const prisma = { sale: { findFirst: jest.fn().mockResolvedValue({ invoiceNumber: 'INV-2', createdAt: new Date(), status: 'OPEN', customer: null, items: [], subTotal: 0, discount: 0, grandTotal: 0, paidAmount: 0, dueAmount: 0 }) } };
    const service = new PrintingService(prisma as never);
    const pdf = await service.generateSalesInvoicePdf('sale-2', 'tenant-1');
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  });
});
