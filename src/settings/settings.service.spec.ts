import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  it('upserts a tenant setting using the composite key', async () => {
    const prisma = { setting: { upsert: jest.fn().mockResolvedValue({ id: 'setting-1', tenantId: 'tenant-1', key: 'tax', value: '15' }) } };
    const service = new SettingsService(prisma as never);
    await expect(service.upsertSetting({ tenantId: 'tenant-1', key: 'tax', value: '15' })).resolves.toEqual({ id: 'setting-1', tenantId: 'tenant-1', key: 'tax', value: '15' });
    expect(prisma.setting.upsert).toHaveBeenCalledWith({
      where: { tenantId_key: { tenantId: 'tenant-1', key: 'tax' } },
      update: { value: '15' },
      create: { tenantId: 'tenant-1', key: 'tax', value: '15' },
    });
  });

  it('lists settings only for the requested tenant', async () => {
    const prisma = { setting: { findMany: jest.fn().mockResolvedValue([]) } };
    const service = new SettingsService(prisma as never);
    await expect(service.getSettings('tenant-1')).resolves.toEqual([]);
    expect(prisma.setting.findMany).toHaveBeenCalledWith({ where: { tenantId: 'tenant-1' } });
  });
});
