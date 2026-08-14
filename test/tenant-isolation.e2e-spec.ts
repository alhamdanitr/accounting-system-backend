import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

interface TenantContext {
  id: string;
  token: string;
  deviceId: string;
}

const READ_PERMISSIONS = [
  'accounting.view',
  'audit.view',
  'branches.view',
  'companies.view',
  'customers.view',
  'inventory.view',
  'products.view',
  'purchases.view',
  'reports.view',
  'sales.view',
  'settings.view',
  'sync.pull',
];

describe('Tenant isolation matrix E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantA: TenantContext;
  let tenantB: TenantContext;

  async function provisionTenant(label: string): Promise<TenantContext> {
    const suffix = `${label}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const companyResponse = await request(app.getHttpServer())
      .post('/api/v1/companies')
      .send({ name: `Tenant ${label}`, code: `TEN-${suffix}`, currencyCode: 'YER' })
      .expect(201);
    const tenantId = companyResponse.body.id as string;
    const email = `${suffix}@example.com`;
    const userResponse = await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({ tenantId, email, fullName: `Tenant ${label} User`, password: 'SecurePassword123' })
      .expect(201);

    const permissions = await Promise.all(
      READ_PERMISSIONS.map((code) =>
        prisma.permission.upsert({
          where: { code },
          update: {},
          create: { code, name: code },
        }),
      ),
    );
    const role = await prisma.role.create({
      data: {
        tenantId,
        name: `Read-only ${suffix}`,
        permissions: { create: permissions.map((permission) => ({ permissionId: permission.id })) },
      },
    });
    await prisma.userRole.create({ data: { userId: userResponse.body.id, roleId: role.id } });

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        tenantId,
        identifier: email,
        password: 'SecurePassword123',
        deviceName: `Isolation ${label}`,
        devicePlatform: 'TEST',
        deviceKeyHash: `isolation-${suffix}`,
      })
      .expect(200);

    return {
      id: tenantId,
      token: loginResponse.body.accessToken,
      deviceId: loginResponse.body.device.id,
    };
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    tenantA = await provisionTenant('A');
    tenantB = await provisionTenant('B');
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    ['products', (tenantId: string) => `/api/v1/products/${tenantId}`],
    ['warehouses', (tenantId: string) => `/api/v1/inventory/warehouses/${tenantId}`],
    ['accounts', (tenantId: string) => `/api/v1/accounting/accounts/${tenantId}`],
    ['dashboard report', (tenantId: string) => `/api/v1/reports/dashboard/${tenantId}`],
    ['customers', (tenantId: string) => `/api/v1/sales/customers/${tenantId}`],
    ['suppliers', (tenantId: string) => `/api/v1/purchases/suppliers/${tenantId}`],
    ['settings', (tenantId: string) => `/api/v1/settings/${tenantId}`],
    ['audit log', (tenantId: string) => `/api/v1/audit/${tenantId}`],
  ])('rejects tenant B from %s belonging to tenant A', async (_name, pathForTenant) => {
    await request(app.getHttpServer())
      .get(pathForTenant(tenantA.id))
      .set('Authorization', `Bearer ${tenantB.token}`)
      .expect(403);
  });

  it('rejects tenant B sync pull using tenant A and device A context', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/sync/pull?tenantId=${tenantA.id}&deviceId=${tenantA.deviceId}&cursor=0&limit=1`)
      .set('Authorization', `Bearer ${tenantB.token}`)
      .expect(403);
  });
});
