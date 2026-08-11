import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AccountType } from '@prisma/client';

describe('Accounting & Financial Engine E2E', () => {
  let app: INestApplication;
  let tenantId: string;
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

    // إنشاء شركة جديدة
    const companyRes = await request(app.getHttpServer())
      .post('/api/v1/companies')
      .send({
        name: 'مجموعة الأفق المحاسبية',
        code: `ACC-${Date.now()}`,
        currencyCode: 'YER',
      });
    tenantId = companyRes.body.id;

    // إنشاء حساب الصندوق (Asset)
    const cashRes = await request(app.getHttpServer())
      .post('/api/v1/accounting/accounts')
      .send({
        tenantId,
        code: '1010',
        name: 'الصندوق الرئيسي',
        type: AccountType.ASSET,
      });
    cashAccountId = cashRes.body.id;

    // إنشاء حساب المبيعات (Revenue)
    const salesRes = await request(app.getHttpServer())
      .post('/api/v1/accounting/accounts')
      .send({
        tenantId,
        code: '4010',
        name: 'إيرادات المبيعات',
        type: AccountType.REVENUE,
      });
    salesAccountId = salesRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should reject unbalanced journal entry', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/accounting/journals')
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
});
