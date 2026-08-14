import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { SyncService } from './sync.service';
import { SyncPushDto } from './dto/sync.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

type AuthenticatedRequest = Request & {
  user: {
    tenantId: string;
    deviceId?: string;
  };
};

@Controller('sync')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('push')
  @Permissions('sync.push')
  async pushOperations(
    @Body() dto: SyncPushDto,
    @Req() request: AuthenticatedRequest,
  ) {
    this.assertDeviceIdentity(request, dto.tenantId, dto.deviceId);
    return this.syncService.pushOperations(dto);
  }

  @Get('pull')
  @Permissions('sync.pull')
  async pullOperations(
    @Query('tenantId') tenantId: string,
    @Query('deviceId') deviceId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    this.assertDeviceIdentity(request, tenantId, deviceId);
    return this.syncService.pullOperations(tenantId, deviceId);
  }

  private assertDeviceIdentity(
    request: AuthenticatedRequest,
    tenantId: string,
    deviceId: string,
  ) {
    if (
      request.user.tenantId !== tenantId ||
      request.user.deviceId !== deviceId
    ) {
      throw new ForbiddenException('هوية الجهاز أو الشركة غير متطابقة مع الجلسة');
    }
  }
}
