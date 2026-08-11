import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Brand, Category, Product, Unit } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrandDto, CreateCategoryDto, CreateProductDto, CreateUnitDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async createCategory(dto: CreateCategoryDto): Promise<Category> {
    const existing = await this.prisma.category.findUnique({
      where: {
        tenantId_name: {
          tenantId: dto.tenantId,
          name: dto.name,
        },
      },
    });
    if (existing) {
      throw new BadRequestException('التصنيف موجود مسبقاً في هذه الشركة');
    }

    return this.prisma.category.create({
      data: {
        tenantId: dto.tenantId,
        name: dto.name,
        description: dto.description,
      },
    });
  }

  async findCategories(tenantId: string): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: { tenantId },
    });
  }

  async createBrand(dto: CreateBrandDto): Promise<Brand> {
    const existing = await this.prisma.brand.findUnique({
      where: {
        tenantId_name: {
          tenantId: dto.tenantId,
          name: dto.name,
        },
      },
    });
    if (existing) {
      throw new BadRequestException('العلامة التجارية موجودة مسبقاً');
    }

    return this.prisma.brand.create({
      data: {
        tenantId: dto.tenantId,
        name: dto.name,
      },
    });
  }

  async findBrands(tenantId: string): Promise<Brand[]> {
    return this.prisma.brand.findMany({
      where: { tenantId },
    });
  }

  async createUnit(dto: CreateUnitDto): Promise<Unit> {
    const existing = await this.prisma.unit.findUnique({
      where: {
        tenantId_code: {
          tenantId: dto.tenantId,
          code: dto.code,
        },
      },
    });
    if (existing) {
      throw new BadRequestException('وحدة القياس مسجلة مسبقاً');
    }

    return this.prisma.unit.create({
      data: {
        tenantId: dto.tenantId,
        name: dto.name,
        code: dto.code,
      },
    });
  }

  async findUnits(tenantId: string): Promise<Unit[]> {
    return this.prisma.unit.findMany({
      where: { tenantId },
    });
  }

  async createProduct(dto: CreateProductDto): Promise<Product> {
    const existingSku = await this.prisma.product.findUnique({
      where: {
        tenantId_sku: {
          tenantId: dto.tenantId,
          sku: dto.sku,
        },
      },
    });
    if (existingSku) {
      throw new BadRequestException('رمز المنتج (SKU) مستخدم مسبقاً');
    }

    const product = await this.prisma.product.create({
      data: {
        tenantId: dto.tenantId,
        sku: dto.sku,
        barcode: dto.barcode,
        arabicName: dto.arabicName,
        englishName: dto.englishName,
        categoryId: dto.categoryId,
        brandId: dto.brandId,
        unitId: dto.unitId,
        purchasePrice: dto.purchasePrice,
        salePrice: dto.salePrice,
        wholesalePrice: dto.wholesalePrice || dto.salePrice,
        minimumPrice: dto.minimumPrice || dto.purchasePrice,
        taxRate: dto.taxRate || 0,
        minimumStock: dto.minimumStock || 0,
        serialTracking: dto.serialTracking || false,
        expiryTracking: dto.expiryTracking || false,
        description: dto.description,
      },
      include: {
        category: true,
        brand: true,
        unit: true,
      },
    });

    // إذا وُجد باركود أساسي، نسجله في جدول الباركودات المرتبطة
    if (dto.barcode) {
      await this.prisma.productBarcode.create({
        data: {
          productId: product.id,
          barcode: dto.barcode,
        },
      }).catch(() => {});
    }

    return product;
  }

  async findProducts(tenantId: string): Promise<Product[]> {
    return this.prisma.product.findMany({
      where: { tenantId, active: true },
      include: {
        category: true,
        brand: true,
        unit: true,
        barcodes: true,
      },
    });
  }

  async findProductById(id: string): Promise<Product> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        brand: true,
        unit: true,
        barcodes: true,
        stockBalances: {
          include: { warehouse: true },
        },
      },
    });
    if (!product) {
      throw new NotFoundException('المنتج غير موجود');
    }
    return product;
  }
}
