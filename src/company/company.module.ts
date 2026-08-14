import { Module } from '@nestjs/common';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyController],
  providers: [CompanyService, PermissionsGuard],
  exports: [CompanyService],
})
export class CompanyModule {}
