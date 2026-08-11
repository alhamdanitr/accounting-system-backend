import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Audit & Settings E2E', () => {
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

    // إنشاء شركة جديدة
    const companyRes = await request(app.getHttpServer())
      .post('/api/v1/companies')
      .send({
        name: 'مؤسسة التدقيق والإعدادات',
        code: `SET-${Date.now()}`,
        currencyCode: 'YER',
      });
    tenantId = companyRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should upsert and get settings successfully', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/settings')
      .send({
        tenantId,
        key: 'tax_rate_default',
        value: '5.0',
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get(`/api/v1/settings/${tenantId}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.find((s: any) => s.key === 'tax_rate_default').value).toEqual('5.0');
  });

  it('should fetch audit logs successfully', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/audit/${tenantId}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });
});
