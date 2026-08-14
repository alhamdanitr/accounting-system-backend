import { Body, Controller, ForbiddenException, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { WhatsAppService } from './whatsapp.service';
import { SendInvoiceWhatsAppDto, SendStatementWhatsAppDto } from './dto/whatsapp.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

type AuthenticatedRequest = Request & { user: { tenantId: string } };

@Controller('whatsapp')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WhatsAppController {
  constructor(private readonly whatsAppService: WhatsAppService) {}

  @Post('invoice')
  @Permissions('whatsapp.send')
  async sendInvoice(
    @Body() dto: SendInvoiceWhatsAppDto,
    @Req() request: AuthenticatedRequest,
  ) {
    this.assertTenant(request, dto.tenantId);
    return this.whatsAppService.sendInvoiceMessage(dto);
  }

  @Post('statement')
  @Permissions('whatsapp.send')
  async sendStatement(
    @Body() dto: SendStatementWhatsAppDto,
    @Req() request: AuthenticatedRequest,
  ) {
    this.assertTenant(request, dto.tenantId);
    return this.whatsAppService.sendStatementMessage(dto);
  }

  private assertTenant(request: AuthenticatedRequest, tenantId: string) {
    if (request.user.tenantId !== tenantId) {
      throw new ForbiddenException('لا يمكن إرسال بيانات شركة أخرى');
    }
  }
}
