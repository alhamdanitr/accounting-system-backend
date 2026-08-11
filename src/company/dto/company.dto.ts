import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @Length(2, 150)
  name!: string;

  @IsOptional()
  @IsString()
  legalName?: string;

  @IsString()
  @Length(2, 50)
  code!: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currencyCode?: string;
}

export class CreateBranchDto {
  @IsString()
  @Length(2, 100)
  name!: string;

  @IsString()
  @Length(2, 50)
  code!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
