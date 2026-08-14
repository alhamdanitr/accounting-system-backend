import { UsersController } from './users.controller';

describe('UsersController', () => {
  it('delegates user and role creation to UsersService', async () => {
    const service = { createUser: jest.fn().mockResolvedValue({ id: 'user-1' }), createRole: jest.fn().mockResolvedValue({ id: 'role-1' }) };
    const controller = new UsersController(service as never);
    const userDto = { tenantId: 'tenant-1', email: 'user@example.com' } as any;
    const roleDto = { tenantId: 'tenant-1', name: 'cashier' } as any;
    await expect(controller.createUser(userDto)).resolves.toEqual({ id: 'user-1' });
    await expect(controller.createRole(roleDto)).resolves.toEqual({ id: 'role-1' });
    expect(service.createUser).toHaveBeenCalledWith(userDto);
    expect(service.createRole).toHaveBeenCalledWith(roleDto);
  });
});
