import { IsArray, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SyncOperationItemDto {
  @IsString()
  idempotencyKey!: string;

  @IsString()
  entityType!: string;

  @IsString()
  entityId!: string;

  @IsString()
  operationType!: string; // CREATE, UPDATE, DELETE

  @IsString()
  payload!: string; // JSON string
}

export class SyncPushDto {
  @IsUUID()
  tenantId!: string;

  @IsUUID()
  deviceId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncOperationItemDto)
  operations!: SyncOperationItemDto[];
}
