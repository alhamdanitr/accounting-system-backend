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
import { InventoryService } from './inventory.service';
import { CreateWarehouseDto, StockAdjustmentDto, StockMovementDto } from './dto/inventory.dto';
import { StockMovement, Warehouse } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
    tenantId: string;
  };
};

@Controller('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('warehouses')
  @Permissions('inventory.manage')
  async createWarehouse(
    @Body() dto: CreateWarehouseDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<Warehouse> {
    this.assertTenant(request, dto.tenantId);
    return this.inventoryService.createWarehouse(dto);
  }

  @Get('warehouses/:tenantId')
  @Permissions('inventory.view')
  async findWarehouses(
    @Param('tenantId') tenantId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<Warehouse[]> {
    this.assertTenant(request, tenantId);
    return this.inventoryService.findWarehouses(tenantId);
  }

  @Post('movements')
  @Permissions('inventory.manage')
  async recordMovement(
    @Body() dto: StockMovementDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<StockMovement> {
    this.assertTenant(request, dto.tenantId);
    return this.inventoryService.recordStockMovement({
      ...dto,
      userId: request.user.userId,
    });
  }

  @Post('adjustments')
  @Permissions('inventory.manage')
  async adjustStock(
    @Body() dto: StockAdjustmentDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<StockMovement> {
    this.assertTenant(request, dto.tenantId);
    return this.inventoryService.adjustStock({
      ...dto,
      userId: request.user.userId,
    });
  }

  @Get('balance')
  @Permissions('inventory.view')
  async getStockBalance(
    @Query('warehouseId') warehouseId: string,
    @Query('productId') productId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.inventoryService.getStockBalance(warehouseId, productId, request.user.tenantId);
  }

  private assertTenant(request: AuthenticatedRequest, tenantId: string) {
    if (!request.user || request.user.tenantId !== tenantId) {
      throw new ForbiddenException('الشركة المطلوبة غير متطابقة مع جلسة المستخدم');
    }
  }
}
