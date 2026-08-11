import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncPushDto } from './dto/sync.dto';

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('push')
  async pushOperations(@Body() dto: SyncPushDto) {
    return this.syncService.pushOperations(dto);
  }

  @Get('pull')
  async pullOperations(
    @Query('tenantId') tenantId: string,
    @Query('deviceId') deviceId: string,
  ) {
    return this.syncService.pullOperations(tenantId, deviceId);
  }
}
