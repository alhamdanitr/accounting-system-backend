import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Audit & Settings E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantId: string;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    const companyRes = await request(app.getHttpServer())
      .post('/api/v1/companies')
      .send({
        name: 'مؤسسة التدقيق والإعدادات',
        code: `SET-${Date.now()}`,
        currencyCode: 'YER',
      })
      .expect(201);
    tenantId = companyRes.body.id;

    const email = `settings_${Date.now()}@example.com`;
    const userRes = await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({ tenantId, email, fullName: 'مسؤول الإعدادات', password: 'SecurePassword123' })
      .expect(201);

    const permissions = await Promise.all(
      ['settings.view', 'settings.manage', 'audit.view'].map((code) =>
        prisma.permission.upsert({ where: { code }, update: {}, create: { code, name: code } }),
      ),
    );
    const role = await prisma.role.create({
      data: {
        tenantId,
        name: `Settings Auditor ${Date.now()}`,
        permissions: { create: permissions.map((permission) => ({ permissionId: permission.id })) },
      },
    });
    await prisma.userRole.create({ data: { userId: userRes.body.id, roleId: role.id } });

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ tenantId, identifier: email, password: 'SecurePassword123', deviceName: 'Settings Test Device', devicePlatform: 'TEST', deviceKeyHash: `settings-device-${Date.now()}` })
      .expect(200);
    accessToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should upsert and get settings successfully', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/settings')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ tenantId, key: 'tax_rate_default', value: '5.0' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get(`/api/v1/settings/${tenantId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.find((s: any) => s.key === 'tax_rate_default').value).toEqual('5.0');
  });

  it('should fetch audit logs successfully', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/audit/${tenantId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should reject settings access for another tenant', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/settings/22222222-2222-4222-8222-222222222222')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
  });
});
