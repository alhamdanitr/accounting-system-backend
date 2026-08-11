import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SendInvoiceWhatsAppDto, SendStatementWhatsAppDto } from './dto/whatsapp.dto';

@Injectable()
export class WhatsAppService {
  constructor(private readonly prisma: PrismaService) {}

  async sendInvoiceMessage(dto: SendInvoiceWhatsAppDto) {
    const sale = await this.prisma.sale.findUnique({
      where: { id: dto.saleId },
      include: { customer: true, company: true, items: { include: { product: true } } },
    });

    if (!sale) {
      throw new NotFoundException('فاتورة المبيعات غير موجودة');
    }

    const message = `
مرحباً ${sale.customer ? sale.customer.name : 'عميلنا العزيز'},
شكراً لتسوقكم لدى ${sale.company.name}.
تفاصيل فاتورة المبيعات رقم: ${sale.invoiceNumber}
- الإجمالي: ${sale.grandTotal}
- المدفوع: ${sale.paidAmount}
- المتبقي: ${sale.dueAmount}
التاريخ: ${sale.createdAt.toISOString().slice(0, 10)}
    `.trim();

    // محاكاة إرسال الرسالة عبر WhatsApp Provider API المعزول
    // في الإنتاج يتم ربطه بـ Meta Cloud API أو Twilio
    return {
      success: true,
      provider: 'MockWhatsAppProvider',
      recipient: dto.phone,
      message,
      sentAt: new Date(),
    };
  }

  async sendStatementMessage(dto: SendStatementWhatsAppDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
      include: { company: true, transactions: true },
    });

    if (!customer) {
      throw new NotFoundException('العميل غير موجود');
    }

    const message = `
كشف حساب العميل: ${customer.name}
الشركة: ${customer.company.name}
الرصيد الحالي (المتبقي): ${customer.balance}
    `.trim();

    return {
      success: true,
      provider: 'MockWhatsAppProvider',
      recipient: dto.phone,
      message,
      sentAt: new Date(),
    };
  }
}
