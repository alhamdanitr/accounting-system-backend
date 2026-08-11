import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PaymentType, StockMovementType } from '@prisma/client';

describe('Printing & PDF E2E', () => {
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
        name: 'مؤسسة الطباعة الذكية',
        code: `PRT-${Date.now()}`,
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
        sku: `PRINTER-POS-${Date.now()}`,
        barcode: `9980123${Date.now().toString().slice(-4)}`,
        arabicName: 'طابعة حرارية POS 80mm',
        purchasePrice: 40000,
        salePrice: 60000,
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
        notes: 'توريد للطباعة',
      });

    // إنشاء فاتورة مبيعات
    const saleRes = await request(app.getHttpServer())
      .post('/api/v1/sales')
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
      .expect(200);

    expect(res.header['content-type']).toEqual('application/pdf');
    expect(res.body).toBeDefined();
  });
});
