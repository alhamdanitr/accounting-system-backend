import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateCategoryDto {
  @IsUUID()
  tenantId!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateBrandDto {
  @IsUUID()
  tenantId!: string;

  @IsString()
  name!: string;
}

export class CreateUnitDto {
  @IsUUID()
  tenantId!: string;

  @IsString()
  name!: string; // قطعة، صندوق

  @IsString()
  code!: string; // PCS, BOX
}

export class CreateProductDto {
  @IsUUID()
  tenantId!: string;

  @IsString()
  sku!: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsString()
  arabicName!: string;

  @IsOptional()
  @IsString()
  englishName?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  brandId?: string;

  @IsOptional()
  @IsUUID()
  unitId?: string;

  @IsNumber()
  @Min(0)
  purchasePrice!: number;

  @IsNumber()
  @Min(0)
  salePrice!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  wholesalePrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumStock?: number;

  @IsOptional()
  @IsBoolean()
  serialTracking?: boolean;

  @IsOptional()
  @IsBoolean()
  expiryTracking?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}
