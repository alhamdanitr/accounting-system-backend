import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateBrandDto, CreateCategoryDto, CreateProductDto, CreateUnitDto } from './dto/product.dto';
import { Brand, Category, Product, Unit } from '@prisma/client';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  async createProduct(@Body() dto: CreateProductDto): Promise<Product> {
    return this.productsService.createProduct(dto);
  }

  @Get()
  async findProducts(@Query('tenantId') tenantId: string): Promise<Product[]> {
    return this.productsService.findProducts(tenantId);
  }

  @Get(':id')
  async findProductById(@Param('id') id: string): Promise<Product> {
    return this.productsService.findProductById(id);
  }

  @Post('categories')
  async createCategory(@Body() dto: CreateCategoryDto): Promise<Category> {
    return this.productsService.createCategory(dto);
  }

  @Get('categories/:tenantId')
  async findCategories(@Param('tenantId') tenantId: string): Promise<Category[]> {
    return this.productsService.findCategories(tenantId);
  }

  @Post('brands')
  async createBrand(@Body() dto: CreateBrandDto): Promise<Brand> {
    return this.productsService.createBrand(dto);
  }

  @Get('brands/:tenantId')
  async findBrands(@Param('tenantId') tenantId: string): Promise<Brand[]> {
    return this.productsService.findBrands(tenantId);
  }

  @Post('units')
  async createUnit(@Body() dto: CreateUnitDto): Promise<Unit> {
    return this.productsService.createUnit(dto);
  }

  @Get('units/:tenantId')
  async findUnits(@Param('tenantId') tenantId: string): Promise<Unit[]> {
    return this.productsService.findUnits(tenantId);
  }
}
