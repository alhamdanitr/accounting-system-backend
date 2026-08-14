import { ArrayMaxSize, IsArray, IsJSON, IsString, IsUUID, Length, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SyncOperationItemDto {
  @IsString()
  @Length(8, 200)
  idempotencyKey!: string;

  @IsString()
  @Length(2, 80)
  entityType!: string;

  @IsString()
  entityId!: string;

  @IsString()
  @Length(2, 40)
  operationType!: string; // CREATE, UPDATE, DELETE

  @IsJSON()
  payload!: string; // JSON string
}

export class SyncPushDto {
  @IsUUID()
  tenantId!: string;

  @IsUUID()
  deviceId!: string;

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SyncOperationItemDto)
  operations!: SyncOperationItemDto[];
}
