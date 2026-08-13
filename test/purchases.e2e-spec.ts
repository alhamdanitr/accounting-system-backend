import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PaymentType } from '@prisma/client';

describe('Purchases & Suppliers E2E', () => {
  let app: INestApplication;
  let tenantId: string;
  let warehouseId: string;
  let productId: string;
  let supplierId: string;

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
        name: 'مؤسسة التوريدات الرقمية',
        code: `DIG-${Date.now()}`,
        currencyCode: 'YER',
      });
    tenantId = companyRes.body.id;

    // جلب المستودع
    const whRes = await request(app.getHttpServer())
      .get(`/api/v1/inventory/warehouses/${tenantId}`);
    warehouseId = whRes.body[0].id;

    // إنشاء منتج
    const prodRes = await request(app.getHttpServer())
      .post('/api/v1/products')
      .send({
        tenantId,
        sku: `CABLE-UTP-${Date.now()}`,
        barcode: `7780123${Date.now().toString().slice(-4)}`,
        arabicName: 'كيبل شبكة UTP كات 6',
        purchasePrice: 15000,
        salePrice: 22000,
      });
    productId = prodRes.body.id;

    // إنشاء مورد
    const suppRes = await request(app.getHttpServer())
      .post('/api/v1/purchases/suppliers')
      .send({
        tenantId,
        name: 'شركة الاستيراد والتصدير الحديثة',
        phone: '711234567',
      });
    supplierId = suppRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create a purchase invoice and increase inventory successfully', async () => {
    const purchaseRes = await request(app.getHttpServer())
      .post('/api/v1/purchases')
      .send({
        tenantId,
        warehouseId,
        supplierId,
        paymentType: PaymentType.CASH,
        paidAmount: 150000,
        items: [
          {
            productId,
            quantity: 10,
            unitPrice: 15000,
          },
        ],
      })
      .expect(201);

    expect(purchaseRes.body.id).toBeDefined();
    expect(purchaseRes.body.grandTotal).toEqual(150000);
    expect(purchaseRes.body.status).toEqual('PAID');

    // التحقق من تحديث رصيد المخزون ليصبح 10
    const stockRes = await request(app.getHttpServer())
      .get(`/api/v1/inventory/balance?warehouseId=${warehouseId}&productId=${productId}`)
      .expect(200);

    expect(stockRes.body.quantity).toEqual(10);
  });

  it('should reject a purchase that uses another tenant warehouse', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/purchases')
      .send({
        tenantId: '33333333-3333-4333-8333-333333333333',
        warehouseId,
        supplierId,
        paymentType: PaymentType.CASH,
        paidAmount: 150000,
        items: [
          {
            productId,
            quantity: 1,
            unitPrice: 15000,
          },
        ],
      })
      .expect(404);
  });
});
