import { Module } from '@nestjs/common';
import { AccountingController } from './accounting.controller';
import { AccountingService } from './accounting.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@Module({
  imports: [PrismaModule],
  controllers: [AccountingController],
  providers: [AccountingService, PermissionsGuard],
  exports: [AccountingService],
})
export class AccountingModule {}
