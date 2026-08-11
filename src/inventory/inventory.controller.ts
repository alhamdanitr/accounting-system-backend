import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateWarehouseDto, StockAdjustmentDto, StockMovementDto } from './dto/inventory.dto';
import { StockMovement, Warehouse } from '@prisma/client';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('warehouses')
  async createWarehouse(@Body() dto: CreateWarehouseDto): Promise<Warehouse> {
    return this.inventoryService.createWarehouse(dto);
  }

  @Get('warehouses/:tenantId')
  async findWarehouses(@Param('tenantId') tenantId: string): Promise<Warehouse[]> {
    return this.inventoryService.findWarehouses(tenantId);
  }

  @Post('movements')
  async recordMovement(@Body() dto: StockMovementDto): Promise<StockMovement> {
    return this.inventoryService.recordStockMovement(dto);
  }

  @Post('adjustments')
  async adjustStock(@Body() dto: StockAdjustmentDto): Promise<StockMovement> {
    return this.inventoryService.adjustStock(dto);
  }

  @Get('balance')
  async getStockBalance(
    @Query('warehouseId') warehouseId: string,
    @Query('productId') productId: string,
  ) {
    return this.inventoryService.getStockBalance(warehouseId, productId);
  }
}
