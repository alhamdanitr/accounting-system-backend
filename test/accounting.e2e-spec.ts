import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AccountType } from '@prisma/client';

describe('Accounting & Financial Engine E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantId: string;
  let accessToken: string;
  let cashAccountId: string;
  let salesAccountId: string;

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
        name: 'مجموعة الأفق المحاسبية',
        code: `ACC-${Date.now()}`,
        currencyCode: 'YER',
      })
      .expect(201);
    tenantId = companyRes.body.id;

    const email = `accounting_${Date.now()}@example.com`;
    const userRes = await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({
        tenantId,
        email,
        fullName: 'مستخدم المحاسبة',
        password: 'SecurePassword123',
      })
      .expect(201);

    const permissions = await Promise.all(
      ['accounting.view', 'accounting.manage'].map((code) =>
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
        name: `Accounting Manager ${Date.now()}`,
        permissions: {
          create: permissions.map((permission) => ({ permissionId: permission.id })),
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
        deviceName: 'Accounting Test Device',
        devicePlatform: 'TEST',
        deviceKeyHash: `accounting-device-${Date.now()}`,
      })
      .expect(200);
    accessToken = loginRes.body.accessToken;

    const cashRes = await request(app.getHttpServer())
      .post('/api/v1/accounting/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        tenantId,
        code: '1010',
        name: 'الصندوق الرئيسي',
        type: AccountType.ASSET,
      })
      .expect(201);
    cashAccountId = cashRes.body.id;

    const salesRes = await request(app.getHttpServer())
      .post('/api/v1/accounting/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        tenantId,
        code: '4010',
        name: 'إيرادات المبيعات',
        type: AccountType.REVENUE,
      })
      .expect(201);
    salesAccountId = salesRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should reject unbalanced journal entry', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/accounting/journals')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        tenantId,
        description: 'قيد غير متوازن',
        lines: [
          { accountId: cashAccountId, debit: 50000, credit: 0 },
          { accountId: salesAccountId, debit: 0, credit: 40000 },
        ],
      })
      .expect(400);
  });

  it('should create a balanced journal entry successfully', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/accounting/journals')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        tenantId,
        description: 'قيد مبيعات نقدية افتتاحي',
        lines: [
          { accountId: cashAccountId, debit: 100000, credit: 0 },
          { accountId: salesAccountId, debit: 0, credit: 100000 },
        ],
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.lines.length).toEqual(2);
  });

  it('should reject accounting access for another tenant', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/accounting/accounts/22222222-2222-4222-8222-222222222222')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
  });
});
