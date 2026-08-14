import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class RefreshTokenDto {
  @IsUUID()
  tenantId!: string;

  @IsString()
  @Length(32, 500)
  refreshToken!: string;

  @IsOptional()
  @IsUUID()
  deviceId?: string;
}

export class LogoutDto extends RefreshTokenDto {}

export class LoginDto {
  @IsUUID()
  tenantId!: string;

  @IsString()
  identifier!: string; // بريد إلكتروني أو رقم هاتف

  @IsString()
  @Length(6, 100)
  password!: string;

  @IsString()
  deviceName!: string;

  @IsString()
  devicePlatform!: string; // Android / Windows / Web

  @IsString()
  deviceKeyHash!: string; // مفتاح فريد لبصمة الجهاز للمزامنة
}
