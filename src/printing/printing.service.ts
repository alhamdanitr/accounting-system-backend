import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import PDFDocument from 'pdfkit';

@Injectable()
export class PrintingService {
  constructor(private readonly prisma: PrismaService) {}

  async generateSalesInvoicePdf(saleId: string, tenantId: string): Promise<Buffer> {
    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId, tenantId },
      include: {
        items: { include: { product: true } },
        customer: true,
        warehouse: true,
      },
    });

    if (!sale) {
      throw new NotFoundException('فاتورة المبيعات غير موجودة');
    }

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // رأس الفاتورة
      doc.fontSize(20).text('فاتورة مبيعات', { align: 'center' });
      doc.fontSize(10).text(`رقم الفاتورة: ${sale.invoiceNumber}`, { align: 'right' });
      doc.text(`التاريخ: ${sale.createdAt.toISOString().slice(0, 10)}`, { align: 'right' });
      doc.text(`حالة الفاتورة: ${sale.status}`, { align: 'right' });
      
      if (sale.customer) {
        doc.text(`العميل: ${sale.customer.name}`, { align: 'right' });
      }

      doc.moveDown();
      doc.fontSize(12).text('تفاصيل الأصناف:', { align: 'right' });
      doc.moveDown(0.5);

      // جدول الأصناف
      sale.items.forEach((item, index) => {
        doc.fontSize(10).text(
          `${index + 1}. ${item.product.arabicName} | الكمية: ${item.quantity} | السعر: ${item.unitPrice} | الإجمالي: ${item.total}`,
          { align: 'right' }
        );
      });

      doc.moveDown();
      doc.fontSize(12).text(`المجموع الفرعي: ${sale.subTotal}`, { align: 'right' });
      if (sale.discount > 0) {
        doc.text(`الخصم: ${sale.discount}`, { align: 'right' });
      }
      doc.fontSize(14).text(`الإجمالي النهائي: ${sale.grandTotal}`, { align: 'right' });
      doc.text(`المدفوع: ${sale.paidAmount} | المتبقي: ${sale.dueAmount}`, { align: 'right' });

      doc.end();
    });
  }
}
