import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { StockMovementType } from '@prisma/client';

export class CreateWarehouseDto {
  @IsUUID()
  tenantId!: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsString()
  name!: string;

  @IsString()
  code!: string;
}

export class StockMovementDto {
  @IsUUID()
  tenantId!: string;

  @IsUUID()
  warehouseId!: string;

  @IsUUID()
  productId!: string;

  @IsEnum(StockMovementType)
  type!: StockMovementType;

  @IsNumber()
  quantity!: number; // موجب أو سالب حسب نوع الحركة

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;
}

export class StockAdjustmentDto {
  @IsUUID()
  tenantId!: string;

  @IsUUID()
  warehouseId!: string;

  @IsUUID()
  productId!: string;

  @IsNumber()
  @Min(0)
  actualQuantity!: quantity_alias; // الكمية الفعلية المقاسة في الجرد

  @IsString()
  reason!: string;

  @IsOptional()
  @IsUUID()
  userId?: string;
}

type quantity_alias = number;
