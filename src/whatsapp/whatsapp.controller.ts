import { Body, Controller, Post } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { SendInvoiceWhatsAppDto, SendStatementWhatsAppDto } from './dto/whatsapp.dto';

@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsAppService: WhatsAppService) {}

  @Post('invoice')
  async sendInvoice(@Body() dto: SendInvoiceWhatsAppDto) {
    return this.whatsAppService.sendInvoiceMessage(dto);
  }

  @Post('statement')
  async sendStatement(@Body() dto: SendStatementWhatsAppDto) {
    return this.whatsAppService.sendStatementMessage(dto);
  }
}
