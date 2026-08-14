import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ReportsController } from './reports.controller';

describe('ReportsController', () => {
  const tenantId = 'tenant-1';
  const request = { user: { tenantId } } as any;
  const service = {
    getDashboardSummary: jest.fn().mockResolvedValue({}),
    getDailySalesReport: jest.fn().mockResolvedValue({}),
    getSalesReport: jest.fn().mockResolvedValue({}),
    getInventoryReport: jest.fn().mockResolvedValue({}),
    getFinancialSummary: jest.fn().mockResolvedValue({}),
  };

  beforeEach(() => jest.clearAllMocks());

  it('delegates all report endpoints with tenant and query arguments', async () => {
    const controller = new ReportsController(service as never);
    await expect(controller.getDashboardSummary(tenantId, request)).resolves.toEqual({});
    await expect(controller.getDailySalesReport(tenantId, 'warehouse-1', '2026-08-14', request)).resolves.toEqual({});
    await expect(controller.getSalesReport(tenantId, '2026-08-01', '2026-08-14', request)).resolves.toEqual({});
    await expect(controller.getInventoryReport(tenantId, 'warehouse-1', request)).resolves.toEqual({});
    await expect(controller.getFinancialSummary(tenantId, request)).resolves.toEqual({});
    expect(service.getDailySalesReport).toHaveBeenCalledWith(tenantId, 'warehouse-1', '2026-08-14');
    expect(service.getSalesReport).toHaveBeenCalledWith(tenantId, '2026-08-01', '2026-08-14');
    expect(service.getInventoryReport).toHaveBeenCalledWith(tenantId, 'warehouse-1');
  });

  it('rejects missing warehouse and cross-tenant report requests', async () => {
    const controller = new ReportsController(service as never);
    await expect(controller.getDailySalesReport(tenantId, '', undefined, request)).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.getDashboardSummary(tenantId, { user: { tenantId: 'tenant-2' } } as any)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.getSalesReport(tenantId, undefined, undefined, undefined)).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.getDashboardSummary).not.toHaveBeenCalled();
  });
});
