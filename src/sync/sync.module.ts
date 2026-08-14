import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductsModule } from '../products/products.module';
import { SalesModule } from '../sales/sales.module';
import { PurchasesModule } from '../purchases/purchases.module';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@Module({
  imports: [PrismaModule, ProductsModule, SalesModule, PurchasesModule],
  controllers: [SyncController],
  providers: [SyncService, PermissionsGuard],
  exports: [SyncService],
})
export class SyncModule {}
