import { IsString, IsUUID } from 'class-validator';

export class SendInvoiceWhatsAppDto {
  @IsUUID()
  tenantId!: string;

  @IsUUID()
  saleId!: string;

  @IsString()
  phone!: string;
}

export class SendStatementWhatsAppDto {
  @IsUUID()
  tenantId!: string;

  @IsUUID()
  customerId!: string;

  @IsString()
  phone!: string;
}
