import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PaymentType, StockMovementType } from '@prisma/client';

describe('WhatsApp Integration E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantId: string;
  let accessToken: string;
  let warehouseId: string;
  let productId: string;
  let saleId: string;

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
        name: 'مؤسسة الاتصالات والواتساب',
        code: `WAPP-${Date.now()}`,
        currencyCode: 'YER',
      });
    tenantId = companyRes.body.id;

    const email = `whatsapp_${Date.now()}@example.com`;
    const userRes = await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({
        tenantId,
        email,
        fullName: 'مستخدم WhatsApp للاختبار',
        password: 'SecurePassword123',
      })
      .expect(201);
    const permissions = await Promise.all(
      ['inventory.view', 'inventory.manage', 'products.view', 'products.manage', 'sales.create', 'whatsapp.send'].map((code) =>
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
        name: `WhatsApp E2E Operator ${Date.now()}`,
        permissions: { create: permissions.map((permission) => ({ permissionId: permission.id })) },
      },
    });
    await prisma.userRole.create({ data: { userId: userRes.body.id, roleId: role.id } });
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        tenantId,
        identifier: email,
        password: 'SecurePassword123',
        deviceName: 'WhatsApp E2E Device',
        devicePlatform: 'TEST',
        deviceKeyHash: `whatsapp-device-${Date.now()}`,
      })
      .expect(200);
    accessToken = loginRes.body.accessToken;

    // جلب المستودع
    const whRes = await request(app.getHttpServer())
      .get(`/api/v1/inventory/warehouses/${tenantId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    warehouseId = whRes.body[0].id;

    // إنشاء منتج وتوريد مخزون
    const prodRes = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        tenantId,
        sku: `ROUTER-AP-${Date.now()}`,
        barcode: `6670123${Date.now().toString().slice(-4)}`,
        arabicName: 'راوتر وايفاي لاسلكي',
        purchasePrice: 10000,
        salePrice: 15000,
      });
    productId = prodRes.body.id;

    await request(app.getHttpServer())
      .post('/api/v1/inventory/movements')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        tenantId,
        warehouseId,
        productId,
        type: StockMovementType.PURCHASE_IN,
        quantity: 5,
        notes: 'توريد للاختبار',
      });

    // إنشاء فاتورة مبيعات
    const saleRes = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        tenantId,
        warehouseId,
        paymentType: PaymentType.CASH,
        paidAmount: 15000,
        items: [{ productId, quantity: 1, unitPrice: 15000 }],
      });
    saleId = saleRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should send invoice via WhatsApp successfully', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/whatsapp/invoice')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        tenantId,
        saleId,
        phone: '967770000000',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.recipient).toEqual('967770000000');
    expect(res.body.message).toBeDefined();
  });
});
