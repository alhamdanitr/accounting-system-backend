import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { StockMovementType } from '@prisma/client';

describe('Products & Inventory E2E', () => {
  let app: INestApplication;
  let tenantId: string;
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

    // إنشاء شركة جديدة للاختبار
    const companyRes = await request(app.getHttpServer())
      .post('/api/v1/companies')
      .send({
        name: 'محل الإلكترونيات الذكية',
        code: `ELEC-${Date.now()}`,
        currencyCode: 'YER',
      });
    tenantId = companyRes.body.id;

    // جلب مستودع الشركة الافتراضي
    const whRes = await request(app.getHttpServer())
      .get(`/api/v1/inventory/warehouses/${tenantId}`);
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
      .expect(200);

    expect(res.body.quantity).toEqual(10);
  });
});
