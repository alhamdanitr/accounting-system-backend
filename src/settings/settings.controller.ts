import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SettingsService } from './settings.service';
import type { UpsertSettingDto } from './settings.service';
import { Setting } from '@prisma/client';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Post()
  async upsertSetting(@Body() dto: UpsertSettingDto): Promise<Setting> {
    return this.settingsService.upsertSetting(dto);
  }

  @Get(':tenantId')
  async getSettings(@Param('tenantId') tenantId: string): Promise<Setting[]> {
    return this.settingsService.getSettings(tenantId);
  }
}
