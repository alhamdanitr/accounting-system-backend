import { Controller, Get, Param, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard/:tenantId')
  async getDashboardSummary(@Param('tenantId') tenantId: string) {
    return this.reportsService.getDashboardSummary(tenantId);
  }

  @Get('sales/:tenantId')
  async getSalesReport(
    @Param('tenantId') tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getSalesReport(tenantId, startDate, endDate);
  }

  @Get('inventory/:tenantId')
  async getInventoryReport(
    @Param('tenantId') tenantId: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.reportsService.getInventoryReport(tenantId, warehouseId);
  }

  @Get('financial/:tenantId')
  async getFinancialSummary(@Param('tenantId') tenantId: string) {
    return this.reportsService.getFinancialSummary(tenantId);
  }
}
