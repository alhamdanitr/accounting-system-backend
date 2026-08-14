import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ProductsService } from './products.service';
import {
  CreateBrandDto,
  CreateCategoryDto,
  CreateProductDto,
  CreateUnitDto,
} from './dto/product.dto';
import { Brand, Category, Product, Unit } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

type AuthenticatedRequest = Request & { user: { tenantId: string } };

@ApiTags('products')
@Controller('products')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Permissions('products.manage')
  async createProduct(
    @Body() dto: CreateProductDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<Product> {
    this.assertTenant(request, dto.tenantId);
    return this.productsService.createProduct(dto);
  }

  @Get()
  @Permissions('products.view')
  async findProducts(
    @Query('tenantId') tenantId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<Product[]> {
    this.assertTenant(request, tenantId);
    return this.productsService.findProducts(tenantId);
  }

  @Get(':id')
  @Permissions('products.view')
  async findProductById(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<Product> {
    this.assertTenant(request, tenantId);
    return this.productsService.findProductById(id, tenantId);
  }

  @Post('categories')
  @Permissions('products.manage')
  async createCategory(
    @Body() dto: CreateCategoryDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<Category> {
    this.assertTenant(request, dto.tenantId);
    return this.productsService.createCategory(dto);
  }

  @Get('categories/:tenantId')
  @Permissions('products.view')
  async findCategories(
    @Param('tenantId') tenantId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<Category[]> {
    this.assertTenant(request, tenantId);
    return this.productsService.findCategories(tenantId);
  }

  @Post('brands')
  @Permissions('products.manage')
  async createBrand(
    @Body() dto: CreateBrandDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<Brand> {
    this.assertTenant(request, dto.tenantId);
    return this.productsService.createBrand(dto);
  }

  @Get('brands/:tenantId')
  @Permissions('products.view')
  async findBrands(
    @Param('tenantId') tenantId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<Brand[]> {
    this.assertTenant(request, tenantId);
    return this.productsService.findBrands(tenantId);
  }

  @Post('units')
  @Permissions('products.manage')
  async createUnit(
    @Body() dto: CreateUnitDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<Unit> {
    this.assertTenant(request, dto.tenantId);
    return this.productsService.createUnit(dto);
  }

  @Get('units/:tenantId')
  @Permissions('products.view')
  async findUnits(
    @Param('tenantId') tenantId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<Unit[]> {
    this.assertTenant(request, tenantId);
    return this.productsService.findUnits(tenantId);
  }

  private assertTenant(request: AuthenticatedRequest, tenantId: string) {
    if (!request.user || request.user.tenantId !== tenantId) {
      throw new ForbiddenException(
        'الشركة المطلوبة غير متطابقة مع جلسة المستخدم',
      );
    }
  }
}
