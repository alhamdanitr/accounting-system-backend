import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';

const tenantId = '11111111-1111-4111-8111-111111111111';

function createPrisma() {
  return {
    category: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
    brand: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
    unit: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
    product: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
    productBarcode: { create: jest.fn() },
  };
}

describe('ProductsService', () => {
  it('creates and lists categories, brands and units tenant-scoped', async () => {
    const prisma = createPrisma();
    prisma.category.findUnique.mockResolvedValue(null);
    prisma.category.create.mockResolvedValue({ id: 'cat-1', tenantId, name: 'Food' });
    prisma.category.findMany.mockResolvedValue([]);
    prisma.brand.findUnique.mockResolvedValue(null);
    prisma.brand.create.mockResolvedValue({ id: 'brand-1', tenantId, name: 'Brand' });
    prisma.brand.findMany.mockResolvedValue([]);
    prisma.unit.findUnique.mockResolvedValue(null);
    prisma.unit.create.mockResolvedValue({ id: 'unit-1', tenantId, code: 'PCS' });
    prisma.unit.findMany.mockResolvedValue([]);
    const service = new ProductsService(prisma as never);

    await expect(service.createCategory({ tenantId, name: 'Food' })).resolves.toEqual({ id: 'cat-1', tenantId, name: 'Food' });
    await expect(service.createBrand({ tenantId, name: 'Brand' })).resolves.toEqual({ id: 'brand-1', tenantId, name: 'Brand' });
    await expect(service.createUnit({ tenantId, name: 'Pieces', code: 'PCS' })).resolves.toEqual({ id: 'unit-1', tenantId, code: 'PCS' });
    await expect(service.findCategories(tenantId)).resolves.toEqual([]);
    await expect(service.findBrands(tenantId)).resolves.toEqual([]);
    await expect(service.findUnits(tenantId)).resolves.toEqual([]);
    expect(prisma.category.findMany).toHaveBeenCalledWith({ where: { tenantId } });
    expect(prisma.brand.findMany).toHaveBeenCalledWith({ where: { tenantId } });
    expect(prisma.unit.findMany).toHaveBeenCalledWith({ where: { tenantId } });
  });

  it('rejects duplicate category, brand and unit identifiers', async () => {
    const prisma = createPrisma();
    prisma.category.findUnique.mockResolvedValue({ id: 'cat-1' });
    prisma.brand.findUnique.mockResolvedValue({ id: 'brand-1' });
    prisma.unit.findUnique.mockResolvedValue({ id: 'unit-1' });
    const service = new ProductsService(prisma as never);
    await expect(service.createCategory({ tenantId, name: 'Food' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.createBrand({ tenantId, name: 'Brand' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.createUnit({ tenantId, name: 'Pieces', code: 'PCS' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a product with defaults and records its primary barcode', async () => {
    const prisma = createPrisma();
    prisma.product.findUnique.mockResolvedValue(null);
    prisma.category.findFirst.mockResolvedValue({ id: 'cat-1', tenantId });
    prisma.brand.findFirst.mockResolvedValue({ id: 'brand-1', tenantId });
    prisma.unit.findFirst.mockResolvedValue({ id: 'unit-1', tenantId });
    prisma.product.create.mockResolvedValue({ id: 'product-1', tenantId, sku: 'SKU-1' });
    prisma.productBarcode.create.mockResolvedValue({ id: 'barcode-1' });
    const service = new ProductsService(prisma as never);

    await expect(service.createProduct({ tenantId, sku: 'SKU-1', barcode: '123', arabicName: 'منتج', purchasePrice: 10, salePrice: 15, categoryId: 'cat-1', brandId: 'brand-1', unitId: 'unit-1' })).resolves.toEqual({ id: 'product-1', tenantId, sku: 'SKU-1' });
    expect(prisma.product.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ tenantId, wholesalePrice: 15, minimumPrice: 10, taxRate: 0, serialTracking: false, expiryTracking: false }) }));
    expect(prisma.productBarcode.create).toHaveBeenCalledWith({ data: { productId: 'product-1', barcode: '123' } });
  });

  it('rejects duplicate SKU and cross-tenant category, brand or unit references', async () => {
    const duplicate = createPrisma();
    duplicate.product.findUnique.mockResolvedValue({ id: 'product-1' });
    await expect(new ProductsService(duplicate as never).createProduct({ tenantId, sku: 'SKU-1', arabicName: 'منتج', purchasePrice: 10, salePrice: 15 })).rejects.toBeInstanceOf(BadRequestException);

    for (const relation of ['category', 'brand', 'unit'] as const) {
      const prisma = createPrisma();
      prisma.product.findUnique.mockResolvedValue(null);
      prisma[relation].findFirst.mockResolvedValue(null);
      const dto = { tenantId, sku: 'SKU-1', arabicName: 'منتج', purchasePrice: 10, salePrice: 15, [`${relation}Id`]: `${relation}-other-tenant` };
      await expect(new ProductsService(prisma as never).createProduct(dto as never)).rejects.toBeInstanceOf(NotFoundException);
    }
  });

  it('lists active products and finds a product only inside its tenant', async () => {
    const prisma = createPrisma();
    prisma.product.findMany.mockResolvedValue([]);
    prisma.product.findFirst.mockResolvedValueOnce({ id: 'product-1', tenantId }).mockResolvedValueOnce(null);
    const service = new ProductsService(prisma as never);
    await expect(service.findProducts(tenantId)).resolves.toEqual([]);
    expect(prisma.product.findMany).toHaveBeenCalledWith({ where: { tenantId, active: true }, include: { category: true, brand: true, unit: true, barcodes: true } });
    await expect(service.findProductById('product-1', tenantId)).resolves.toEqual({ id: 'product-1', tenantId });
    await expect(service.findProductById('product-other', tenantId)).rejects.toBeInstanceOf(NotFoundException);
  });
});
