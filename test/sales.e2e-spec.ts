import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PaymentType, StockMovementType } from '@prisma/client';

describe('Sales & POS E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantId: string;
  let accessToken: string;
  let warehouseId: string;
  let productId: string;
  let customerId: string;

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

    // إنشاء شركة جديدة
    const companyRes = await request(app.getHttpServer())
      .post('/api/v1/companies')
      .send({
        name: 'محل شبكات المستقبل',
        code: `FUT-${Date.now()}`,
        currencyCode: 'YER',
      });
    tenantId = companyRes.body.id;

    const email = `sales_${Date.now()}@example.com`;
    const userRes = await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({
        tenantId,
        email,
        fullName: 'مستخدم المبيعات',
        password: 'SecurePassword123',
      })
      .expect(201);

    const permissions = await Promise.all(
      ['sales.view', 'sales.create', 'inventory.view', 'inventory.manage'].map((code) =>
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
        name: `Sales Operator ${Date.now()}`,
        permissions: {
          create: permissions.map((permission) => ({ permissionId: permission.id })),
        },
      },
    });
    await prisma.userRole.create({
      data: { userId: userRes.body.id, roleId: role.id },
    });

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        tenantId,
        identifier: email,
        password: 'SecurePassword123',
        deviceName: 'Sales Test Device',
        devicePlatform: 'TEST',
        deviceKeyHash: `sales-device-${Date.now()}`,
      })
      .expect(200);
    accessToken = loginRes.body.accessToken;

    // جلب المستودع
    const whRes = await request(app.getHttpServer())
      .get(`/api/v1/inventory/warehouses/${tenantId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    warehouseId = whRes.body[0].id;

    // إنشاء منتج
    const prodRes = await request(app.getHttpServer())
      .post('/api/v1/products')
      .send({
        tenantId,
        sku: `SWITCH-24-${Date.now()}`,
        barcode: `8840123${Date.now().toString().slice(-4)}`,
        arabicName: 'سويتش شبكة 24 منفذ',
        purchasePrice: 20000,
        salePrice: 30000,
      });
    productId = prodRes.body.id;

    // توريد مخزون أولد للمنتج لضمان نجاح البيع
    await request(app.getHttpServer())
      .post('/api/v1/inventory/movements')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        tenantId,
        warehouseId,
        productId,
        type: StockMovementType.PURCHASE_IN,
        quantity: 15,
        notes: 'توريد افتتاحي للمبيعات',
      });

    // إنشاء عميل
    const custRes = await request(app.getHttpServer())
      .post('/api/v1/sales/customers')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        tenantId,
        name: 'شركة الاتصالات المتقدمة',
        phone: '777123456',
        creditLimit: 500000,
      });
    customerId = custRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create a cash sale invoice and deduct inventory successfully', async () => {
    const saleRes = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        tenantId,
        warehouseId,
        customerId,
        paymentType: PaymentType.CASH,
        paidAmount: 30000,
        items: [
          {
            productId,
            quantity: 1,
            unitPrice: 30000,
          },
        ],
      })
      .expect(201);

    expect(saleRes.body.id).toBeDefined();
    expect(saleRes.body.grandTotal).toEqual(30000);
    expect(saleRes.body.status).toEqual('PAID');

    // التحقق من تحديث رصيد المخزون ليصبح 14
    const stockRes = await request(app.getHttpServer())
      .get(`/api/v1/inventory/balance?warehouseId=${warehouseId}&productId=${productId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(stockRes.body.quantity).toEqual(14);
  });

  it('should reject unauthenticated sales requests', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/sales/${tenantId}`)
      .expect(401);
  });

  it('should reject a sale that uses another tenant warehouse', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        tenantId: '11111111-1111-4111-8111-111111111111',
        warehouseId,
        customerId,
        paymentType: PaymentType.CASH,
        paidAmount: 30000,
        items: [
          {
            productId,
            quantity: 1,
            unitPrice: 30000,
          },
        ],
      })
      .expect(403);
  });
});
