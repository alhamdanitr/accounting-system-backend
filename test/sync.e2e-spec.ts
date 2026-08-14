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

    // إنشاء شركة وجهاز عبر Prisma للاختبار
    const company = await prisma.company.create({
      data: {
        name: 'مؤسسة المزامنة السحابية',
        code: `SYNC-${Date.now()}`,
      },
    });
    tenantId = company.id;

    const email = `sync_user_${Date.now()}@example.com`;
    const userRes = await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({
        tenantId,
        email,
        fullName: 'مستخدم المزامنة',
        password: 'SecurePassword123',
      })
      .expect(201);

    const syncPermissions = await Promise.all(
      ['sync.push', 'sync.pull'].map((code) =>
        prisma.permission.upsert({
          where: { code },
          update: {},
          create: { code, name: code },
        }),
      ),
    );
    const syncRole = await prisma.role.create({
      data: {
        tenantId,
        name: `Sync Operator ${Date.now()}`,
        permissions: {
          create: syncPermissions.map((permission) => ({ permissionId: permission.id })),
        },
      },
    });
    await prisma.userRole.create({ data: { userId: userRes.body.id, roleId: syncRole.id } });

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        tenantId,
        identifier: email,
        password: 'SecurePassword123',
        deviceName: 'Windows POS Terminal 1',
        devicePlatform: 'WINDOWS',
        deviceKeyHash: `hash-${Date.now()}`,
      })
      .expect(200);

    accessToken = loginRes.body.accessToken;
    deviceId = loginRes.body.device.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should push local operations successfully (Idempotency)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/sync/push')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        tenantId,
        deviceId,
        operations: [
          {
            idempotencyKey: `op-${Date.now()}-1`,
            entityType: 'CUSTOMER',
            entityId: '11111111-1111-4111-8111-111111111111',
            operationType: 'CREATE',
            payload: JSON.stringify({ name: 'عميل مزامنة' }),
          },
        ],
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.processedCount).toEqual(1);
    expect(res.body.results[0].status).toEqual('SYNCED');
  });

  it('should pull remote operations successfully', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/sync/pull?tenantId=${tenantId}&deviceId=${deviceId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.operations)).toBe(true);
  });

  it('should reject a device used by another tenant', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/sync/push')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        tenantId: '22222222-2222-4222-8222-222222222222',
        deviceId,
        operations: [],
      })
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/v1/sync/pull?tenantId=22222222-2222-4222-8222-222222222222&deviceId=' + deviceId)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
  });
});
