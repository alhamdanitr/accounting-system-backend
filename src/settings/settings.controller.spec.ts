import { ForbiddenException } from '@nestjs/common';
import { SettingsController } from './settings.controller';

describe('SettingsController', () => {
  const request = { user: { tenantId: 'tenant-1' } } as any;
  it('delegates setting upsert and read for the current tenant', async () => {
    const service = { upsertSetting: jest.fn().mockResolvedValue({ key: 'tax' }), getSettings: jest.fn().mockResolvedValue([]) };
    const controller = new SettingsController(service as never);
    const dto = { tenantId: 'tenant-1', key: 'tax', value: '15' };
    await expect(controller.upsertSetting(dto, request)).resolves.toEqual({ key: 'tax' });
    await expect(controller.getSettings('tenant-1', request)).resolves.toEqual([]);
    expect(service.upsertSetting).toHaveBeenCalledWith(dto);
    expect(service.getSettings).toHaveBeenCalledWith('tenant-1');
  });

  it('rejects cross-tenant setting access before service calls', async () => {
    const service = { upsertSetting: jest.fn(), getSettings: jest.fn() };
    const controller = new SettingsController(service as never);
    await expect(controller.upsertSetting({ tenantId: 'tenant-2', key: 'tax', value: '15' }, request)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.getSettings('tenant-2', request)).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.upsertSetting).not.toHaveBeenCalled();
  });
});
