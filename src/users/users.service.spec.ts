import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { UsersService } from './users.service';

jest.mock('bcryptjs', () => ({ hash: jest.fn() }));

const tenantId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';

function createPrisma() {
  return {
    company: { findUnique: jest.fn() },
    user: { count: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
    branch: { findFirst: jest.fn() },
    role: { findFirst: jest.fn(), create: jest.fn() },
    permission: { findMany: jest.fn() },
  };
}

describe('UsersService', () => {
  afterEach(() => jest.clearAllMocks());

  it('creates the initial tenant user without returning passwordHash', async () => {
    const prisma = createPrisma();
    prisma.company.findUnique.mockResolvedValue({ id: tenantId });
    prisma.user.count.mockResolvedValue(0);
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: userId, tenantId, fullName: 'Owner', passwordHash: 'hashed', status: UserStatus.ACTIVE });
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
    const service = new UsersService(prisma as never);

    await expect(service.createUser({ tenantId, fullName: 'Owner', email: 'owner@example.com', password: 'secret' })).resolves.toEqual({
      id: userId,
      tenantId,
      fullName: 'Owner',
      status: UserStatus.ACTIVE,
    });
    expect(bcrypt.hash).toHaveBeenCalledWith('secret', 10);
    expect(prisma.user.create).toHaveBeenCalledWith({ data: expect.objectContaining({ tenantId, passwordHash: 'hashed', status: UserStatus.ACTIVE }) });
  });

  it('rejects invalid company, non-initial user, branch mismatch and duplicate email', async () => {
    const missingCompany = createPrisma();
    missingCompany.company.findUnique.mockResolvedValue(null);
    const service = new UsersService(missingCompany as never);
    await expect(service.createUser({ tenantId, fullName: 'User', password: 'secret' })).rejects.toBeInstanceOf(NotFoundException);

    const existingUsers = createPrisma();
    existingUsers.company.findUnique.mockResolvedValue({ id: tenantId });
    existingUsers.user.count.mockResolvedValue(1);
    await expect(new UsersService(existingUsers as never).createUser({ tenantId, fullName: 'User', password: 'secret' })).rejects.toBeInstanceOf(ForbiddenException);

    const invalidBranch = createPrisma();
    invalidBranch.company.findUnique.mockResolvedValue({ id: tenantId });
    invalidBranch.user.count.mockResolvedValue(0);
    invalidBranch.branch.findFirst.mockResolvedValue(null);
    await expect(new UsersService(invalidBranch as never).createUser({ tenantId, branchId: 'branch', fullName: 'User', password: 'secret' })).rejects.toBeInstanceOf(NotFoundException);

    const duplicateEmail = createPrisma();
    duplicateEmail.company.findUnique.mockResolvedValue({ id: tenantId });
    duplicateEmail.user.count.mockResolvedValue(0);
    duplicateEmail.user.findFirst.mockResolvedValue({ id: userId });
    await expect(new UsersService(duplicateEmail as never).createUser({ tenantId, email: 'user@example.com', fullName: 'User', password: 'secret' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('finds users by tenant-scoped identifier and by id with relations', async () => {
    const prisma = createPrisma();
    prisma.user.findFirst.mockResolvedValue({ id: userId });
    prisma.user.findUnique.mockResolvedValue({ id: userId, tenantId });
    const service = new UsersService(prisma as never);
    await expect(service.findByEmailOrPhone(tenantId, 'owner@example.com')).resolves.toEqual({ id: userId });
    expect(prisma.user.findFirst).toHaveBeenCalledWith({ where: { tenantId, OR: [{ email: 'owner@example.com' }, { phone: 'owner@example.com' }] } });
    await expect(service.findById(userId)).resolves.toEqual({ id: userId, tenantId });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: userId }, include: { company: true, branch: true, roles: { include: { role: true } } } });
  });

  it('creates roles with deduplicated permissions and rejects invalid role inputs', async () => {
    const prisma = createPrisma();
    prisma.company.findUnique.mockResolvedValue({ id: tenantId });
    prisma.role.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'role-existing' });
    prisma.permission.findMany.mockResolvedValue([{ id: 'perm-1', code: 'sales.read' }]);
    prisma.role.create.mockResolvedValue({ id: 'role-1', name: 'Sales' } as unknown as Role);
    const service = new UsersService(prisma as never);

    await expect(service.createRole({ tenantId, name: 'Sales', permissionCodes: ['sales.read', 'sales.read'] })).resolves.toEqual({ id: 'role-1', name: 'Sales' });
    expect(prisma.permission.findMany).toHaveBeenCalledWith({ where: { code: { in: ['sales.read'] } } });
    expect(prisma.role.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ tenantId, name: 'Sales', permissions: { create: [{ permissionId: 'perm-1' }] } }) }));

    await expect(service.createRole({ tenantId, name: 'Sales', permissionCodes: [] })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects missing company and unknown permissions when creating roles', async () => {
    const missingCompany = createPrisma();
    missingCompany.company.findUnique.mockResolvedValue(null);
    await expect(new UsersService(missingCompany as never).createRole({ tenantId, name: 'Role' })).rejects.toBeInstanceOf(NotFoundException);

    const unknownPermission = createPrisma();
    unknownPermission.company.findUnique.mockResolvedValue({ id: tenantId });
    unknownPermission.role.findFirst.mockResolvedValue(null);
    unknownPermission.permission.findMany.mockResolvedValue([{ id: 'perm-1', code: 'known' }]);
    await expect(new UsersService(unknownPermission as never).createRole({ tenantId, name: 'Role', permissionCodes: ['known', 'missing'] })).rejects.toBeInstanceOf(BadRequestException);
  });
});
