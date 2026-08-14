import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Controller, Get, Param, Req, Res, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { PrintingService } from './printing.service';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

type AuthenticatedRequest = Request & { user: { tenantId: string } };

@ApiTags('printing')
@Controller('printing')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PrintingController {
  constructor(private readonly printingService: PrintingService) {}

  @Get('sales/:saleId/pdf')
  @Permissions('printing.view')
  async downloadSalePdf(
    @Param('saleId') saleId: string,
    @Req() request: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.printingService.generateSalesInvoicePdf(
      saleId,
      request.user.tenantId,
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=invoice-${saleId}.pdf`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }
}
