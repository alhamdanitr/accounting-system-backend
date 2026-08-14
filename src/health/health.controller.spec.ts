import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns the operational health contract', () => {
    const result = new HealthController().getHealth();
    expect(result.status).toBe('ok');
    expect(result.service).toBe('accounting-system-backend');
    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
  });
});
