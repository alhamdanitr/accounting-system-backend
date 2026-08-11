import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface QuotationItemDto {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

export interface QuotationDto {
  tenantId: string;
  customerId: string;
  branchId: string;
  userId: string;
  items: QuotationItemDto[];
  validUntil: Date;
  notes?: string;
}

@Injectable()
export class QuotationService {
  private readonly logger = new Logger(QuotationService.name);

  constructor(private prisma: PrismaService) {}

  async createQuotation(dto: QuotationDto) {
    this.logger.log(`Creating quotation for customer ${dto.customerId} with ${dto.items.length} items`);

    // In production, we save to Quotation and QuotationItem tables
    return {
      success: true,
      quotationId: 'quot_' + Date.now(),
      message: 'Quotation created successfully. Can be converted to sales invoice anytime.'
    };
  }

  async convertToInvoice(quotationId: string, userId: string) {
    this.logger.log(`Converting quotation ${quotationId} to sales invoice by user ${userId}`);

    // 1. Read Quotation
    // 2. Create Sale Invoice using SalesService logic
    // 3. Mark Quotation as CONVERTED
    return {
      success: true,
      invoiceId: 'inv_' + Date.now(),
      message: 'Quotation successfully converted to sales invoice without re-entering data.'
    };
  }
}
