import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Accounting System Auth & Tenant E2E', () => {
  let app: INestApplication;
  let tenantId: string;
  let userEmail: string;

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/v1/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toEqual('ok');
      });
  });

  it('should create a company and branch successfully', async () => {
    const uniqueCode = `NET-${Date.now()}`;
    const res = await request(app.getHttpServer())
      .post('/api/v1/companies')
      .send({
        name: 'محل شبكات الأحمدي',
        code: uniqueCode,
        currencyCode: 'YER',
      })
      .expect(201);

    tenantId = res.body.id;
    expect(tenantId).toBeDefined();
    expect(res.body.code).toEqual(uniqueCode);
  });

  it('should create a user and login successfully', async () => {
    userEmail = `cashier_${Date.now()}@netshop.com`;
    const userRes = await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({
        tenantId,
        email: userEmail,
        fullName: 'أحمد المحاسب',
        password: 'SecurePassword123',
      })
      .expect(201);

    expect(userRes.body.id).toBeDefined();

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        tenantId,
        identifier: userEmail,
        password: 'SecurePassword123',
        deviceName: 'Windows POS Terminal',
        devicePlatform: 'Windows',
        deviceKeyHash: `device_hash_${Date.now()}`,
      })
      .expect(200);

    expect(loginRes.body.accessToken).toBeDefined();
    expect(loginRes.body.device.id).toBeDefined();
    expect(loginRes.body.user.email).toEqual(userEmail);
  });
});
