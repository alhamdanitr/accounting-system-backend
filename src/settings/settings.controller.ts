import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { SettingsService } from './settings.service';
import type { UpsertSettingDto } from './settings.service';
import { Setting } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

type AuthenticatedRequest = Request & { user: { tenantId: string } };

@ApiTags('settings')
@Controller('settings')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Post()
  @Permissions('settings.manage')
  async upsertSetting(
    @Body() dto: UpsertSettingDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<Setting> {
    if (request.user.tenantId !== dto.tenantId) {
      throw new ForbiddenException('لا يمكن تعديل إعدادات شركة أخرى');
    }
    return this.settingsService.upsertSetting(dto);
  }

  @Get(':tenantId')
  @Permissions('settings.view')
  async getSettings(
    @Param('tenantId') tenantId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<Setting[]> {
    if (request.user.tenantId !== tenantId) {
      throw new ForbiddenException('لا يمكن قراءة إعدادات شركة أخرى');
    }
    return this.settingsService.getSettings(tenantId);
  }
}
