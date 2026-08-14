import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeviceStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

jest.mock('bcryptjs', () => ({ compare: jest.fn() }));

const tenantId = '11111111-1111-4111-8111-111111111111';
const user = {
  id: '22222222-2222-4222-8222-222222222222',
  tenantId,
  email: 'user@example.com',
  fullName: 'Test User',
  branchId: null,
  passwordHash: 'hash',
  status: 'ACTIVE' as const,
};
const device = { id: '33333333-3333-4333-8333-333333333333', name: 'POS', platform: 'WINDOWS', status: DeviceStatus.ACTIVE };

function createService() {
  const usersService = { findByEmailOrPhone: jest.fn() };
  const jwtService = { sign: jest.fn().mockReturnValue('access-token') };
  const prisma = {
    device: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    user: { update: jest.fn() },
    refreshToken: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  };
  const service = new AuthService(usersService as never, jwtService as never, prisma as never, new ConfigService());
  return { service, usersService, jwtService, prisma };
}

describe('AuthService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('rejects unknown, invalid, and inactive users', async () => {
    const unknown = createService();
    unknown.usersService.findByEmailOrPhone.mockResolvedValue(null);
    await expect(unknown.service.login({ tenantId, identifier: user.email, password: 'bad', deviceName: 'POS', devicePlatform: 'WINDOWS', deviceKeyHash: 'key' })).rejects.toBeInstanceOf(UnauthorizedException);

    const invalid = createService();
    invalid.usersService.findByEmailOrPhone.mockResolvedValue(user);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false as never);
    await expect(invalid.service.login({ tenantId, identifier: user.email, password: 'bad', deviceName: 'POS', devicePlatform: 'WINDOWS', deviceKeyHash: 'key' })).rejects.toBeInstanceOf(UnauthorizedException);

    const inactive = createService();
    inactive.usersService.findByEmailOrPhone.mockResolvedValue({ ...user, status: 'INACTIVE' });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true as never);
    await expect(inactive.service.login({ tenantId, identifier: user.email, password: 'good', deviceName: 'POS', devicePlatform: 'WINDOWS', deviceKeyHash: 'key' })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('creates a device and issues access and refresh tokens on login', async () => {
    const { service, usersService, prisma, jwtService } = createService();
    usersService.findByEmailOrPhone.mockResolvedValue(user);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true as never);
    prisma.device.findFirst.mockResolvedValue(null);
    prisma.device.create.mockResolvedValue(device);
    prisma.refreshToken.create.mockResolvedValue({ id: 'refresh-1' });

    const result = await service.login({ tenantId, identifier: user.email, password: 'good', deviceName: 'POS', devicePlatform: 'WINDOWS', deviceKeyHash: 'key' });

    expect(prisma.device.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ tenantId, userId: user.id, status: DeviceStatus.ACTIVE }) }));
    expect(prisma.user.update).toHaveBeenCalled();
    expect(jwtService.sign).toHaveBeenCalledWith(expect.objectContaining({ sub: user.id, tenantId, deviceId: device.id }));
    expect(result).toEqual(expect.objectContaining({
      accessToken: 'access-token',
      tokenType: 'Bearer',
      device: { id: device.id, name: device.name, platform: device.platform },
    }));
  });

  it('updates an existing device on login', async () => {
    const { service, usersService, prisma } = createService();
    usersService.findByEmailOrPhone.mockResolvedValue(user);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true as never);
    prisma.device.findFirst.mockResolvedValue({ ...device, status: DeviceStatus.INACTIVE });
    prisma.device.update.mockResolvedValue(device);
    prisma.refreshToken.create.mockResolvedValue({ id: 'refresh-1' });

    await service.login({ tenantId, identifier: user.email, password: 'good', deviceName: 'POS', devicePlatform: 'WINDOWS', deviceKeyHash: 'key' });
    expect(prisma.device.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: device.id }, data: expect.objectContaining({ status: DeviceStatus.ACTIVE, userId: user.id }) }));
  });

  it('rejects invalid refresh sessions and accepts a valid session', async () => {
    const invalid = createService();
    invalid.prisma.refreshToken.findUnique.mockResolvedValue(null);
    await expect(invalid.service.refresh({ tenantId, refreshToken: 'bad' })).rejects.toBeInstanceOf(UnauthorizedException);

    const valid = createService();
    valid.prisma.refreshToken.findUnique.mockResolvedValue({ id: 'refresh-1', revokedAt: null, expiresAt: new Date(Date.now() + 60_000), user, deviceId: device.id, device });
    valid.prisma.refreshToken.create.mockResolvedValue({ id: 'refresh-2' });
    const result = await valid.service.refresh({ tenantId, refreshToken: 'refresh', deviceId: device.id });
    expect(valid.prisma.refreshToken.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'refresh-1' } }));
    expect(result).toEqual(expect.objectContaining({
      accessToken: 'access-token',
      device: { id: device.id, name: device.name, platform: device.platform },
    }));
  });

  it('resolves a refresh session through an active fallback device', async () => {
    const { service, prisma } = createService();
    prisma.refreshToken.findUnique.mockResolvedValue({ id: 'refresh-1', revokedAt: null, expiresAt: new Date(Date.now() + 60_000), user, deviceId: null, device: null });
    prisma.device.findFirst.mockResolvedValue(device);
    prisma.refreshToken.create.mockResolvedValue({ id: 'refresh-2' });
    await expect(service.refresh({ tenantId, refreshToken: 'refresh' })).resolves.toEqual(expect.objectContaining({ accessToken: 'access-token' }));
    expect(prisma.device.findFirst).toHaveBeenCalledWith({ where: { tenantId, userId: user.id, status: DeviceStatus.ACTIVE } });
  });

  it('rejects refresh tenant, device and inactive-device mismatches', async () => {
    const cases = [
      { stored: { id: 'r', revokedAt: null, expiresAt: new Date(Date.now() + 60_000), user: { ...user, tenantId: 'foreign' }, device }, dto: { tenantId, refreshToken: 'r' } },
      { stored: { id: 'r', revokedAt: null, expiresAt: new Date(Date.now() + 60_000), user, deviceId: device.id, device }, dto: { tenantId, refreshToken: 'r', deviceId: 'foreign-device' } },
      { stored: { id: 'r', revokedAt: null, expiresAt: new Date(Date.now() + 60_000), user, deviceId: device.id, device: { ...device, status: DeviceStatus.INACTIVE } }, dto: { tenantId, refreshToken: 'r' } },
    ];
    for (const testCase of cases) {
      const { service, prisma } = createService();
      prisma.refreshToken.findUnique.mockResolvedValue(testCase.stored);
      await expect(service.refresh(testCase.dto)).rejects.toBeInstanceOf(UnauthorizedException);
    }
  });

  it('revokes a matching logout token and ignores foreign or already revoked tokens', async () => {
    const { service, prisma } = createService();
    prisma.refreshToken.findUnique.mockResolvedValue({ id: 'refresh-1', revokedAt: null, user });
    await expect(service.logout({ tenantId, refreshToken: 'refresh' })).resolves.toEqual({ success: true });
    expect(prisma.refreshToken.update).toHaveBeenCalled();

    prisma.refreshToken.findUnique.mockResolvedValue({ id: 'refresh-2', revokedAt: null, user: { ...user, tenantId: 'foreign' } });
    await service.logout({ tenantId, refreshToken: 'refresh' });
    expect(prisma.refreshToken.update).toHaveBeenCalledTimes(1);
  });
});
