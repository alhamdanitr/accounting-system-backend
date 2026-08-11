import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Reports & Dashboard E2E', () => {
  let app: INestApplication;
  let tenantId: string;

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

    // إنشاء شركة جديدة للاختبار
    const companyRes = await request(app.getHttpServer())
      .post('/api/v1/companies')
      .send({
        name: 'مؤسسة التقارير والتحليلات',
        code: `REP-${Date.now()}`,
        currencyCode: 'YER',
      });
    tenantId = companyRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should fetch dashboard summary successfully', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/reports/dashboard/${tenantId}`)
      .expect(200);

    expect(res.body.sales).toBeDefined();
    expect(res.body.purchases).toBeDefined();
    expect(res.body.expenses).toBeDefined();
  });

  it('should fetch financial summary successfully', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/reports/financial/${tenantId}`)
      .expect(200);

    expect(res.body.netProfit).toBeDefined();
  });
});
