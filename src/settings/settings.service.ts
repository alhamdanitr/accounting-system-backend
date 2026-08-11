import { Injectable } from '@nestjs/common';
import { Setting } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface UpsertSettingDto {
  tenantId: string;
  key: string;
  value: string;
}

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertSetting(dto: UpsertSettingDto): Promise<Setting> {
    return this.prisma.setting.upsert({
      where: {
        tenantId_key: {
          tenantId: dto.tenantId,
          key: dto.key,
        },
      },
      update: { value: dto.value },
      create: {
        tenantId: dto.tenantId,
        key: dto.key,
        value: dto.value,
      },
    });
  }

  async getSettings(tenantId: string): Promise<Setting[]> {
    return this.prisma.setting.findMany({
      where: { tenantId },
    });
  }
}
