import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { PaymentType } from '@prisma/client';

export class CreateSupplierDto {
  @IsUUID()
  tenantId!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

export class PurchaseItemDto {
  @IsUUID()
  productId!: string;

  @IsNumber()
  @Min(0.001)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;
}

export class CreatePurchaseDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsUUID()
  tenantId!: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsUUID()
  warehouseId!: string;

  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsEnum(PaymentType)
  paymentType!: PaymentType;

  @IsNumber()
  @Min(0)
  paidAmount!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items!: PurchaseItemDto[];
}
