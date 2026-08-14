import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { StockMovementType } from '@prisma/client';

describe('Products & Inventory E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantId: string;
  let accessToken: string;
  let warehouseId: string;
  let productId: string;

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

    // إنشاء شركة جديدة للاختبار
    const companyRes = await request(app.getHttpServer())
      .post('/api/v1/companies')
      .send({
        name: 'محل الإلكترونيات الذكية',
        code: `ELEC-${Date.now()}`,
        currencyCode: 'YER',
      });
    tenantId = companyRes.body.id;

    const email = `inventory_${Date.now()}@example.com`;
    const userRes = await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({ tenantId, email, fullName: 'مستخدم المخزون', password: 'SecurePassword123' })
      .expect(201);
    const permissions = await Promise.all(
      ['inventory.view', 'inventory.manage'].map((code) =>
        prisma.permission.upsert({ where: { code }, update: {}, create: { code, name: code } }),
      ),
    );
    const role = await prisma.role.create({
      data: {
        tenantId,
        name: `Inventory Operator ${Date.now()}`,
        permissions: { create: permissions.map((permission) => ({ permissionId: permission.id })) },
      },
    });
    await prisma.userRole.create({ data: { userId: userRes.body.id, roleId: role.id } });
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ tenantId, identifier: email, password: 'SecurePassword123', deviceName: 'Inventory Test Device', devicePlatform: 'TEST', deviceKeyHash: `inventory-device-${Date.now()}` })
      .expect(200);
    accessToken = loginRes.body.accessToken;

    // جلب مستودع الشركة الافتراضي
    const whRes = await request(app.getHttpServer())
      .get(`/api/v1/inventory/warehouses/${tenantId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    warehouseId = whRes.body[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create a product successfully', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/products')
      .send({
        tenantId,
        sku: `RB-750-${Date.now()}`,
        barcode: `4750123${Date.now().toString().slice(-4)}`,
        arabicName: 'راوتر ميكروتيك RB750Gr3',
        purchasePrice: 35000,
        salePrice: 48000,
        serialTracking: true,
      })
      .expect(201);

    productId = res.body.id;
    expect(productId).toBeDefined();
    expect(res.body.arabicName).toEqual('راوتر ميكروتيك RB750Gr3');
  });

  it('should record stock movement (PURCHASE_IN) successfully', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/inventory/movements')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        tenantId,
        warehouseId,
        productId,
        type: StockMovementType.PURCHASE_IN,
        quantity: 10,
        notes: 'توريد دفعة جديدة من المورد',
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.balanceAfter).toEqual(10);
  });

  it('should check stock balance successfully', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/inventory/balance?warehouseId=${warehouseId}&productId=${productId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.quantity).toEqual(10);
  });
});
