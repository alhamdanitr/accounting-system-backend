import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PaymentType, StockMovementType } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Printing & PDF E2E', () => {
  let app: INestApplication;
  let tenantId: string;
  let warehouseId: string;
  let productId: string;
  let saleId: string;
  let accessToken: string;
  let prisma: PrismaService;

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

    // إنشاء شركة جديدة
    const companyRes = await request(app.getHttpServer())
      .post('/api/v1/companies')
      .send({
        name: 'مؤسسة الطباعة الذكية',
        code: `PRT-${Date.now()}`,
        currencyCode: 'YER',
      });
    tenantId = companyRes.body.id;

    const email = `printing_${Date.now()}@example.com`;
    const userRes = await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({ tenantId, email, fullName: 'مستخدم الطباعة', password: 'SecurePassword123' })
      .expect(201);
    const permissions = await Promise.all(
      ['inventory.view', 'inventory.manage', 'products.manage', 'sales.create', 'printing.view'].map((code) =>
        prisma.permission.upsert({ where: { code }, update: {}, create: { code, name: code } }),
      ),
    );
    const role = await prisma.role.create({
      data: { tenantId, name: `Printing Operator ${Date.now()}`, permissions: { create: permissions.map((permission) => ({ permissionId: permission.id })) } },
    });
    await prisma.userRole.create({ data: { userId: userRes.body.id, roleId: role.id } });
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ tenantId, identifier: email, password: 'SecurePassword123', deviceName: 'Printing Test Device', devicePlatform: 'TEST', deviceKeyHash: `printing-device-${Date.now()}` })
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
        sku: `PRINTER-POS-${Date.now()}`,
        barcode: `9980123${Date.now().toString().slice(-4)}`,
        arabicName: 'طابعة حرارية POS 80mm',
        purchasePrice: 40000,
        salePrice: 60000,
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
        notes: 'توريد للطباعة',
      });

    // إنشاء فاتورة مبيعات
    const saleRes = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        tenantId,
        warehouseId,
        paymentType: PaymentType.CASH,
        paidAmount: 60000,
        items: [{ productId, quantity: 1, unitPrice: 60000 }],
      });
    saleId = saleRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should download sales invoice PDF successfully', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/printing/sales/${saleId}/pdf`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.header['content-type']).toEqual('application/pdf');
    expect(res.body).toBeDefined();
  });
});
