import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PaymentType, StockMovementType } from '@prisma/client';

describe('WhatsApp Integration E2E', () => {
  let app: INestApplication;
  let tenantId: string;
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

    // إنشاء شركة جديدة
    const companyRes = await request(app.getHttpServer())
      .post('/api/v1/companies')
      .send({
        name: 'مؤسسة الاتصالات والواتساب',
        code: `WAPP-${Date.now()}`,
        currencyCode: 'YER',
      });
    tenantId = companyRes.body.id;

    // جلب المستودع
    const whRes = await request(app.getHttpServer())
      .get(`/api/v1/inventory/warehouses/${tenantId}`);
    warehouseId = whRes.body[0].id;

    // إنشاء منتج وتوريد مخزون
    const prodRes = await request(app.getHttpServer())
      .post('/api/v1/products')
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
