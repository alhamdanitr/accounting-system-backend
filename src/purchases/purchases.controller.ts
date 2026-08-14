import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto, CreateSupplierDto } from './dto/purchases.dto';
import { Purchase, Supplier } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
    tenantId: string;
  };
};

@Controller('purchases')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post('suppliers')
  @Permissions('purchases.create')
  async createSupplier(
    @Body() dto: CreateSupplierDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<Supplier> {
    this.assertTenant(request, dto.tenantId);
    return this.purchasesService.createSupplier(dto);
  }

  @Get('suppliers/:tenantId')
  @Permissions('purchases.view')
  async findSuppliers(
    @Param('tenantId') tenantId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<Supplier[]> {
    this.assertTenant(request, tenantId);
    return this.purchasesService.findSuppliers(tenantId);
  }

  @Post()
  @Permissions('purchases.create')
  async createPurchase(
    @Body() dto: CreatePurchaseDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<Purchase> {
    this.assertTenant(request, dto.tenantId);
    return this.purchasesService.createPurchase({
      ...dto,
      userId: request.user.userId,
    });
  }

  @Get(':tenantId')
  @Permissions('purchases.view')
  async findPurchases(
    @Param('tenantId') tenantId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<Purchase[]> {
    this.assertTenant(request, tenantId);
    return this.purchasesService.findPurchases(tenantId);
  }

  private assertTenant(request: AuthenticatedRequest, tenantId: string) {
    if (!request.user || request.user.tenantId !== tenantId) {
      throw new ForbiddenException('الشركة المطلوبة غير متطابقة مع جلسة المستخدم');
    }
  }
}
