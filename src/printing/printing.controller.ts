import { Controller, Get, Param, Res } from '@nestjs/common';
import { PrintingService } from './printing.service';
import type { Response } from 'express';

@Controller('printing')
export class PrintingController {
  constructor(private readonly printingService: PrintingService) {}

  @Get('sales/:saleId/pdf')
  async downloadSalePdf(@Param('saleId') saleId: string, @Res() res: Response) {
    const pdfBuffer = await this.printingService.generateSalesInvoicePdf(saleId);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=invoice-${saleId}.pdf`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }
}
