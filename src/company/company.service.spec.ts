import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CompanyService } from './company.service';

const tenantId = '11111111-1111-4111-8111-111111111111';

function createPrisma() {
  return {
    company: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn() },
    branch: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn() },
    warehouse: { create: jest.fn() },
  };
}

describe('CompanyService', () => {
  it('creates a company with default branch and warehouse', async () => {
    const prisma = createPrisma();
    prisma.company.findUnique.mockResolvedValue(null);
    prisma.company.create.mockResolvedValue({ id: tenantId, code: 'TEN-1', currencyCode: 'YER' });
    prisma.branch.create.mockResolvedValue({ id: 'branch-1' });
    prisma.warehouse.create.mockResolvedValue({ id: 'warehouse-1' });
    const service = new CompanyService(prisma as never);

    await expect(service.createCompany({ name: 'Tenant', code: 'TEN-1' })).resolves.toEqual({ id: tenantId, code: 'TEN-1', currencyCode: 'YER' });
    expect(prisma.branch.create).toHaveBeenCalledWith({ data: { tenantId, name: 'الفرع الرئيسي', code: 'MAIN' } });
    expect(prisma.warehouse.create).toHaveBeenCalledWith({ data: { tenantId, branchId: 'branch-1', name: 'المستودع الرئيسي', code: 'WH-MAIN' } });
  });

  it('rejects duplicate companies and lists companies with branches', async () => {
    const duplicatePrisma = createPrisma();
    duplicatePrisma.company.findUnique.mockResolvedValue({ id: tenantId });
    const duplicateService = new CompanyService(duplicatePrisma as never);
    await expect(duplicateService.createCompany({ name: 'Tenant', code: 'TEN-1' })).rejects.toBeInstanceOf(BadRequestException);

    const prisma = createPrisma();
    prisma.company.findMany.mockResolvedValue([]);
    const service = new CompanyService(prisma as never);
    await expect(service.findAllCompanies()).resolves.toEqual([]);
    expect(prisma.company.findMany).toHaveBeenCalledWith({ include: { branches: true } });
  });

  it('finds a company or rejects when absent', async () => {
    const prisma = createPrisma();
    prisma.company.findUnique.mockResolvedValueOnce({ id: tenantId, branches: [], warehouses: [] }).mockResolvedValueOnce(null);
    const service = new CompanyService(prisma as never);
    await expect(service.findCompanyById(tenantId)).resolves.toEqual({ id: tenantId, branches: [], warehouses: [] });
    await expect(service.findCompanyById(tenantId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a branch with a default warehouse and rejects invalid company or duplicate code', async () => {
    const prisma = createPrisma();
    prisma.company.findUnique.mockResolvedValue({ id: tenantId });
    prisma.branch.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'branch-existing' });
    prisma.branch.create.mockResolvedValue({ id: 'branch-1', name: 'North' });
    const service = new CompanyService(prisma as never);
    await expect(service.createBranch(tenantId, { name: 'North', code: 'NORTH' })).resolves.toEqual({ id: 'branch-1', name: 'North' });
    expect(prisma.warehouse.create).toHaveBeenCalledWith({ data: { tenantId, branchId: 'branch-1', name: 'مستودع North', code: 'WH-NORTH' } });
    await expect(service.createBranch(tenantId, { name: 'North', code: 'NORTH' })).rejects.toBeInstanceOf(BadRequestException);

    prisma.company.findUnique.mockResolvedValue(null);
    await expect(service.createBranch(tenantId, { name: 'South', code: 'SOUTH' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists branches by tenant', async () => {
    const prisma = createPrisma();
    prisma.branch.findMany.mockResolvedValue([]);
    const service = new CompanyService(prisma as never);
    await expect(service.findBranchesByTenant(tenantId)).resolves.toEqual([]);
    expect(prisma.branch.findMany).toHaveBeenCalledWith({ where: { tenantId } });
  });
});
