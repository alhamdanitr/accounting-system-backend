import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { ReturnAdjustmentService } from './return-adjustment.service';

@Module({
  imports: [PrismaModule],
  controllers: [InventoryController],
  providers: [InventoryService, ReturnAdjustmentService, PermissionsGuard],
  exports: [InventoryService, ReturnAdjustmentService],
})
export class InventoryModule {}
