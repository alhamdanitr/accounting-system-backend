import { AuthController } from './auth.controller';

describe('AuthController', () => {
  it('delegates login, refresh and logout DTOs to AuthService', async () => {
    const service = {
      login: jest.fn().mockResolvedValue({ accessToken: 'access' }),
      refresh: jest.fn().mockResolvedValue({ accessToken: 'new-access' }),
      logout: jest.fn().mockResolvedValue({ success: true }),
    };
    const controller = new AuthController(service as never);
    const loginDto = { email: 'user@example.com', password: 'secret' } as any;
    const refreshDto = { refreshToken: 'refresh' } as any;
    const logoutDto = { refreshToken: 'refresh' } as any;
    await expect(controller.login(loginDto)).resolves.toEqual({ accessToken: 'access' });
    await expect(controller.refresh(refreshDto)).resolves.toEqual({ accessToken: 'new-access' });
    await expect(controller.logout(logoutDto)).resolves.toEqual({ success: true });
    expect(service.login).toHaveBeenCalledWith(loginDto);
    expect(service.refresh).toHaveBeenCalledWith(refreshDto);
    expect(service.logout).toHaveBeenCalledWith(logoutDto);
  });
});
