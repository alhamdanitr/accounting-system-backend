import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Reports & Dashboard E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantId: string;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);

    const companyRes = await request(app.getHttpServer())
      .post('/api/v1/companies')
      .send({
        name: 'مؤسسة التقارير والتحليلات',
        code: `REP-${Date.now()}`,
        currencyCode: 'YER',
      })
      .expect(201);
    tenantId = companyRes.body.id;

    const email = `reports_${Date.now()}@example.com`;
    const userRes = await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({
        tenantId,
        email,
        fullName: 'مستخدم التقارير',
        password: 'SecurePassword123',
      })
      .expect(201);

    const permission = await prisma.permission.upsert({
      where: { code: 'reports.view' },
      update: {},
      create: { code: 'reports.view', name: 'عرض التقارير' },
    });
    const role = await prisma.role.create({
      data: {
        tenantId,
        name: `Reports Viewer ${Date.now()}`,
        permissions: {
          create: { permissionId: permission.id },
        },
      },
    });
    await prisma.userRole.create({
      data: {
        userId: userRes.body.id,
        roleId: role.id,
      },
    });

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        tenantId,
        identifier: email,
        password: 'SecurePassword123',
        deviceName: 'Reports Test Device',
        devicePlatform: 'TEST',
        deviceKeyHash: `reports-device-${Date.now()}`,
      })
      .expect(200);
    accessToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should fetch dashboard summary successfully', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/reports/dashboard/${tenantId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.sales).toBeDefined();
    expect(res.body.purchases).toBeDefined();
    expect(res.body.expenses).toBeDefined();
  });

  it('should fetch financial summary successfully', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/reports/financial/${tenantId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.netProfit).toBeDefined();
  });

  it('should reject a report request for another tenant', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/reports/dashboard/22222222-2222-4222-8222-222222222222')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
  });
});
