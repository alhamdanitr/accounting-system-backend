import {
  Controller,
  BadRequestException,
  ForbiddenException,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

type AuthenticatedRequest = Request & {
  user: {
    tenantId: string;
  };
};

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('reports.view')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard/:tenantId')
  async getDashboardSummary(
    @Param('tenantId') tenantId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    this.assertTenant(request, tenantId);
    return this.reportsService.getDashboardSummary(tenantId);
  }

  @Get('sales/daily/:tenantId')
  async getDailySalesReport(
    @Param('tenantId') tenantId: string,
    @Query('warehouseId') warehouseId: string,
    @Query('date') date: string | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    this.assertTenant(request, tenantId);
    if (!warehouseId) {
      throw new BadRequestException('يجب تحديد المستودع لتقرير المبيعات اليومية');
    }
    return this.reportsService.getDailySalesReport(tenantId, warehouseId, date);
  }

  @Get('sales/:tenantId')
  async getSalesReport(
    @Param('tenantId') tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Req() request?: AuthenticatedRequest,
  ) {
    this.assertTenant(request, tenantId);
    return this.reportsService.getSalesReport(tenantId, startDate, endDate);
  }

  @Get('inventory/:tenantId')
  async getInventoryReport(
    @Param('tenantId') tenantId: string,
    @Query('warehouseId') warehouseId?: string,
    @Req() request?: AuthenticatedRequest,
  ) {
    this.assertTenant(request, tenantId);
    return this.reportsService.getInventoryReport(tenantId, warehouseId);
  }

  @Get('financial/:tenantId')
  async getFinancialSummary(
    @Param('tenantId') tenantId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    this.assertTenant(request, tenantId);
    return this.reportsService.getFinancialSummary(tenantId);
  }

  private assertTenant(request: AuthenticatedRequest | undefined, tenantId: string) {
    if (!request?.user || request.user.tenantId !== tenantId) {
      throw new ForbiddenException('الشركة المطلوبة غير متطابقة مع جلسة المستخدم');
    }
  }
}
