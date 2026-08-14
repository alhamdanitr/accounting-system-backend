import { ForbiddenException } from '@nestjs/common';
import { CompanyController } from './company.controller';

describe('CompanyController', () => {
  const tenantId = 'tenant-1';
  const request = { user: { tenantId } } as any;
  const service = {
    createCompany: jest.fn().mockResolvedValue({ id: tenantId }),
    findAllCompanies: jest.fn().mockResolvedValue([]),
    findCompanyById: jest.fn().mockResolvedValue({ id: tenantId }),
    createBranch: jest.fn().mockResolvedValue({ id: 'branch-1' }),
    findBranchesByTenant: jest.fn().mockResolvedValue([]),
  };

  beforeEach(() => jest.clearAllMocks());

  it('delegates company and branch endpoints', async () => {
    const controller = new CompanyController(service as never);
    const dto = { tenantId, name: 'Company' } as any;
    await expect(controller.createCompany(dto)).resolves.toEqual({ id: tenantId });
    await expect(controller.findAllCompanies()).resolves.toEqual([]);
    await expect(controller.findCompanyById(tenantId, request)).resolves.toEqual({ id: tenantId });
    await expect(controller.createBranch(tenantId, dto, request)).resolves.toEqual({ id: 'branch-1' });
    await expect(controller.findBranchesByTenant(tenantId, request)).resolves.toEqual([]);
    expect(service.createBranch).toHaveBeenCalledWith(tenantId, dto);
  });

  it('rejects cross-tenant company and branch access', async () => {
    const controller = new CompanyController(service as never);
    const foreign = { user: { tenantId: 'tenant-2' } } as any;
    await expect(controller.findCompanyById(tenantId, foreign)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.createBranch(tenantId, {}, foreign)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.findBranchesByTenant(tenantId, foreign)).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.findCompanyById).not.toHaveBeenCalled();
  });
});
