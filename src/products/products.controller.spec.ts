import { ForbiddenException } from '@nestjs/common';
import { ProductsController } from './products.controller';

describe('ProductsController', () => {
  const tenantId = 'tenant-1';
  const request = { user: { tenantId } } as any;
  const service = {
    createProduct: jest.fn().mockResolvedValue({ id: 'product-1' }),
    findProducts: jest.fn().mockResolvedValue([]),
    findProductById: jest.fn().mockResolvedValue({ id: 'product-1' }),
    createCategory: jest.fn().mockResolvedValue({ id: 'category-1' }),
    findCategories: jest.fn().mockResolvedValue([]),
    createBrand: jest.fn().mockResolvedValue({ id: 'brand-1' }),
    findBrands: jest.fn().mockResolvedValue([]),
    createUnit: jest.fn().mockResolvedValue({ id: 'unit-1' }),
    findUnits: jest.fn().mockResolvedValue([]),
  };

  beforeEach(() => jest.clearAllMocks());

  it('delegates all catalog endpoints with tenant context', async () => {
    const controller = new ProductsController(service as never);
    const dto = { tenantId, name: 'test' } as any;
    await expect(controller.createProduct(dto, request)).resolves.toEqual({ id: 'product-1' });
    await expect(controller.findProducts(tenantId, request)).resolves.toEqual([]);
    await expect(controller.findProductById('product-1', tenantId, request)).resolves.toEqual({ id: 'product-1' });
    await expect(controller.createCategory(dto, request)).resolves.toEqual({ id: 'category-1' });
    await expect(controller.findCategories(tenantId, request)).resolves.toEqual([]);
    await expect(controller.createBrand(dto, request)).resolves.toEqual({ id: 'brand-1' });
    await expect(controller.findBrands(tenantId, request)).resolves.toEqual([]);
    await expect(controller.createUnit(dto, request)).resolves.toEqual({ id: 'unit-1' });
    await expect(controller.findUnits(tenantId, request)).resolves.toEqual([]);
    expect(service.findProductById).toHaveBeenCalledWith('product-1', tenantId);
    expect(service.createUnit).toHaveBeenCalledWith(dto);
  });

  it('rejects cross-tenant catalog access before service calls', async () => {
    const controller = new ProductsController(service as never);
    const foreign = { user: { tenantId: 'tenant-2' } } as any;
    await expect(controller.findProducts(tenantId, foreign)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.findProductById('product-1', tenantId, foreign)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.createProduct({ tenantId } as any, foreign)).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.findProducts).not.toHaveBeenCalled();
  });
});
