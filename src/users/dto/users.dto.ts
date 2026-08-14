import { IsArray, IsEmail, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateUserDto {
  @IsUUID()
  tenantId!: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @Length(2, 150)
  fullName!: string;

  @IsString()
  @Length(6, 100)
  password!: string;
}

export class CreateRoleDto {
  @IsUUID()
  tenantId!: string;

  @IsString()
  @Length(2, 50)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionCodes?: string[];
}
