import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@Module({
  imports: [PrismaModule],
  controllers: [SettingsController],
  providers: [SettingsService, PermissionsGuard],
  exports: [SettingsService],
})
export class SettingsModule {}
