import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Sync Engine E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantId: string;
  let deviceId: string;

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

    // إنشاء شركة وجهاز عبر Prisma للاختبار
    const company = await prisma.company.create({
      data: {
        name: 'مؤسسة المزامنة السحابية',
        code: `SYNC-${Date.now()}`,
      },
    });
    tenantId = company.id;

    const device = await prisma.device.create({
      data: {
        tenantId,
        name: 'Windows POS Terminal 1',
        platform: 'WINDOWS',
        deviceKeyHash: `hash-${Date.now()}`,
      },
    });
    deviceId = device.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should push local operations successfully (Idempotency)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/sync/push')
      .send({
        tenantId,
        deviceId,
        operations: [
          {
            idempotencyKey: `op-${Date.now()}-1`,
            entityType: 'CUSTOMER',
            entityId: 'cust-uuid-123',
            operationType: 'CREATE',
            payload: JSON.stringify({ name: 'عميل مزامنة' }),
          },
        ],
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.processedCount).toEqual(1);
  });

  it('should pull remote operations successfully', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/sync/pull?tenantId=${tenantId}&deviceId=${deviceId}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.operations)).toBe(true);
  });
});
